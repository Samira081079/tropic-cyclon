import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Anchor, Award, RotateCcw, ShieldAlert } from 'lucide-react';
import { BridgeHUD } from './components/BridgeHUD';
import { MissionSelectModal } from './components/MissionSelectModal';
import { OceanScene3D, SceneLiveBridge } from './components/OceanScene3D';
import { QuizModal } from './components/QuizModal';
import { TacticalRadar } from './components/TacticalRadar';
import { MISSIONS } from './data/missions';
import { MaritimeAudioEngine } from './engine/audio';
import {
  bearingDegBetween,
  computeWeatherTelemetry,
  normalizeDeg,
  shortestAngleDiffDeg,
} from './engine/simulation';
import {
  CameraPreset,
  CycloneState,
  GamePhase,
  MissionConfig,
  MissionRecord,
  QuizQuestion,
  ShipState,
  SpeedTelegraph,
  WeatherTelemetry,
} from './types/game';

const STORAGE_KEY = 'okean-naviqatoru-progress-v1';

const TELEGRAPH_SPEEDS: Record<SpeedTelegraph, number> = {
  0: 0,
  1: 9,
  2: 15,
  3: 21,
};

function loadProgress(): Record<number, MissionRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<number, MissionRecord>;
  } catch {
    return {};
  }
}

function saveProgress(records: Record<number, MissionRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage errors in restricted environments
  }
}

function createInitialShip(mission: MissionConfig): ShipState {
  return {
    x: mission.shipStart.x,
    z: mission.shipStart.z,
    headingDeg: mission.shipStart.headingDeg,
    targetHeadingDeg: mission.shipStart.headingDeg,
    telegraph: 2,
    speedKnots: TELEGRAPH_SPEEDS[2],
    hullIntegrity: 100,
    sinkingProgress: 0,
    pitchRad: 0,
    rollRad: 0,
    heaveY: 0,
  };
}

function createInitialCyclone(mission: MissionConfig): CycloneState {
  return {
    x: mission.cycloneStart.x,
    z: mission.cycloneStart.z,
    trackDeg: mission.cycloneTrackDeg,
    speedKnots: mission.cycloneSpeedKnots,
    radiusNM: mission.cycloneRadiusNM,
    maxWindKnots: mission.maxWindKnots,
    minPressureHpa: mission.minPressureHpa,
  };
}

export default function App() {
  const [mission, setMission] = useState<MissionConfig>(MISSIONS[0]);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [showMissionsModal, setShowMissionsModal] = useState<boolean>(true);
  const [modalTab, setModalTab] = useState<'missions' | 'guide'>('missions');
  const [records, setRecords] = useState<Record<number, MissionRecord>>(() =>
    loadProgress(),
  );

  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('chase');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [radarExpanded, setRadarExpanded] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);

  const [activeQuestion, setActiveQuestion] = useState<QuizQuestion | null>(
    null,
  );
  const [score, setScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [noticeText, setNoticeText] = useState<string>('');

  // HUD snapshot state (updated at ~10Hz from live simulation ref)
  const initialShip = createInitialShip(MISSIONS[0]);
  const initialCyclone = createInitialCyclone(MISSIONS[0]);
  const initialTelemetry = computeWeatherTelemetry(
    initialShip,
    initialCyclone,
    MISSIONS[0],
  );

  const [hudShip, setHudShip] = useState<ShipState>(initialShip);
  const [hudTelemetry, setHudTelemetry] =
    useState<WeatherTelemetry>(initialTelemetry);

  // Mutable 60fps bridge shared with Three.js and Canvas Radar
  const liveBridgeRef = useRef<SceneLiveBridge>({
    ship: initialShip,
    cyclone: initialCyclone,
    telemetry: initialTelemetry,
    portPos: { x: MISSIONS[0].portPosition.x, z: MISSIONS[0].portPosition.z },
    hemisphere: MISSIONS[0].hemisphere,
    cameraPreset: 'chase',
    phase: 'menu',
    elapsedSec: 0,
  });

  const missionRef = useRef<MissionConfig>(MISSIONS[0]);
  const phaseRef = useRef<GamePhase>('menu');
  const askedIdsRef = useRef<Set<string>>(new Set());
  const keysHeldRef = useRef<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });
  const scoreRef = useRef<number>(0);
  const correctCountRef = useRef<number>(0);
  const audioRef = useRef<MaritimeAudioEngine | null>(null);
  const noticeTimerRef = useRef<number>(0);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new MaritimeAudioEngine();
    }
    audioRef.current.init();
  }, []);

  const showNotice = useCallback((msg: string) => {
    setNoticeText(msg);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      setNoticeText('');
    }, 4500);
  }, []);

  const startMission = useCallback(
    (selected: MissionConfig) => {
      ensureAudio();
      const freshShip = createInitialShip(selected);
      const freshCyclone = createInitialCyclone(selected);
      const freshTelemetry = computeWeatherTelemetry(
        freshShip,
        freshCyclone,
        selected,
      );

      missionRef.current = selected;
      phaseRef.current = 'playing';
      askedIdsRef.current = new Set();
      scoreRef.current = 0;
      correctCountRef.current = 0;

      liveBridgeRef.current.ship = freshShip;
      liveBridgeRef.current.cyclone = freshCyclone;
      liveBridgeRef.current.telemetry = freshTelemetry;
      liveBridgeRef.current.portPos = {
        x: selected.portPosition.x,
        z: selected.portPosition.z,
      };
      liveBridgeRef.current.hemisphere = selected.hemisphere;
      liveBridgeRef.current.phase = 'playing';

      setMission(selected);
      setPhase('playing');
      setShowMissionsModal(false);
      setActiveQuestion(null);
      setScore(0);
      setCorrectCount(0);
      setHudShip({ ...freshShip });
      setHudTelemetry(freshTelemetry);
      showNotice(
        `Missiya başladı: ${selected.cycloneName} siklonunu müşahidə edib ${selected.portPosition.name} istiqamətində irəliləyin.`,
      );
    },
    [ensureAudio, showNotice],
  );

  // Sync camera preset into live ref
  useEffect(() => {
    liveBridgeRef.current.cameraPreset = cameraPreset;
  }, [cameraPreset]);

  // Sync phase into live ref
  useEffect(() => {
    phaseRef.current = phase;
    liveBridgeRef.current.phase = phase;
  }, [phase]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        if (phaseRef.current === 'playing') {
          setDockCollapsed((prev) => !prev);
        }
        return;
      }

      if (phaseRef.current !== 'playing') return;

      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        keysHeldRef.current.left = true;
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        keysHeldRef.current.right = true;
      } else if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        const s = liveBridgeRef.current.ship;
        const next = Math.min(3, s.telegraph + 1) as SpeedTelegraph;
        s.telegraph = next;
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        const s = liveBridgeRef.current.ship;
        const next = Math.max(0, s.telegraph - 1) as SpeedTelegraph;
        s.telegraph = next;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        keysHeldRef.current.left = false;
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        keysHeldRef.current.right = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Main Simulation Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudAccumulator = 0;

    const step = () => {
      const now = performance.now();
      const dt = Math.min(0.06, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const bridge = liveBridgeRef.current;
      const currentMission = missionRef.current;
      const currentPhase = phaseRef.current;

      // Always advance ocean wave time smoothly
      bridge.elapsedSec += dt;

      if (currentPhase === 'playing') {
        const { ship, cyclone } = bridge;

        // Manual held steering
        if (keysHeldRef.current.left) {
          ship.targetHeadingDeg = normalizeDeg(ship.targetHeadingDeg - 52 * dt);
        }
        if (keysHeldRef.current.right) {
          ship.targetHeadingDeg = normalizeDeg(ship.targetHeadingDeg + 52 * dt);
        }

        // Smooth rudder turning toward targetHeadingDeg
        const angleDiff = shortestAngleDiffDeg(
          ship.headingDeg,
          ship.targetHeadingDeg,
        );
        const turnRate = 38; // deg/sec
        if (Math.abs(angleDiff) > 0.2) {
          const stepDeg =
            Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate * dt);
          ship.headingDeg = normalizeDeg(ship.headingDeg + stepDeg);
        }

        // Smooth engine speed acceleration (reduced slightly in heavy waves)
        const desiredSpeed = TELEGRAPH_SPEEDS[ship.telegraph];
        ship.speedKnots += (desiredSpeed - ship.speedKnots) * Math.min(1, dt * 2.5);

        const weatherCheck = computeWeatherTelemetry(
          ship,
          cyclone,
          currentMission,
        );
        const waveDrag = Math.max(0.55, 1 - weatherCheck.waveHeightM * 0.028);
        const effectiveSpeed = ship.speedKnots * waveDrag;

        // Advance ship position (15kt ~= 0.25 NM/sec)
        const headRad = (ship.headingDeg * Math.PI) / 180;
        const shipDist = effectiveSpeed * 0.017 * dt;
        ship.x += Math.sin(headRad) * shipDist;
        ship.z -= Math.cos(headRad) * shipDist;

        // Advance tropical cyclone along its track
        const trackRad = (cyclone.trackDeg * Math.PI) / 180;
        const cycDist = cyclone.speedKnots * 0.011 * dt;
        cyclone.x += Math.sin(trackRad) * cycDist;
        cyclone.z -= Math.cos(trackRad) * cycDist;

        // Recompute telemetry
        const telemetry = computeWeatherTelemetry(ship, cyclone, currentMission);
        bridge.telemetry = telemetry;

        // Audio modulation
        audioRef.current?.updateTelemetry(telemetry);

        // Hull damage in dangerous sector / eyewall
        if (telemetry.sector === 'eyewall') {
          ship.hullIntegrity = Math.max(0, ship.hullIntegrity - 7.8 * dt);
        } else if (telemetry.sector === 'dangerous') {
          ship.hullIntegrity = Math.max(0, ship.hullIntegrity - 3.6 * dt);
        } else if (telemetry.sector === 'navigable') {
          ship.hullIntegrity = Math.max(0, ship.hullIntegrity - 0.55 * dt);
        }

        // Sinking check
        if (ship.hullIntegrity <= 0) {
          ship.hullIntegrity = 0;
          ship.sinkingProgress = Math.min(1, ship.sinkingProgress + dt * 0.55);
          if (ship.sinkingProgress >= 0.98) {
            phaseRef.current = 'sunk';
            setPhase('sunk');
          }
        } else if (telemetry.distanceToPortNM <= 7.5) {
          // Victory! Reached safe harbour
          const finalScore =
            scoreRef.current + Math.round(ship.hullIntegrity * 5);
          scoreRef.current = finalScore;
          setScore(finalScore);

          setRecords((prev) => {
            const prevRec = prev[currentMission.id];
            const updated: Record<number, MissionRecord> = {
              ...prev,
              [currentMission.id]: {
                completed: true,
                bestScore: Math.max(prevRec?.bestScore ?? 0, finalScore),
                correctAnswers: Math.max(
                  prevRec?.correctAnswers ?? 0,
                  correctCountRef.current,
                ),
                totalQuestions: currentMission.questions.length,
              },
            };
            saveProgress(updated);
            return updated;
          });

          phaseRef.current = 'victory';
          setPhase('victory');
        } else {
          // Check Oceanology Quiz checkpoints
          for (const q of currentMission.questions) {
            if (askedIdsRef.current.has(q.id)) continue;

            const shouldTrigger =
              q.triggerKind === 'emergency'
                ? telemetry.distanceToEyeNM <= q.triggerDistanceNM ||
                  telemetry.sector === 'dangerous' ||
                  telemetry.sector === 'eyewall'
                : telemetry.distanceToEyeNM <= q.triggerDistanceNM;

            if (shouldTrigger) {
              askedIdsRef.current.add(q.id);
              phaseRef.current = 'quiz';
              setPhase('quiz');
              setActiveQuestion(q);
              audioRef.current?.playRadarPing();
              break;
            }
          }
        }
      } else if (currentPhase === 'sunk') {
        bridge.ship.sinkingProgress = Math.min(
          1,
          bridge.ship.sinkingProgress + dt * 0.4,
        );
      }

      hudAccumulator += dt;
      if (hudAccumulator >= 0.1) {
        hudAccumulator = 0;
        setHudShip({ ...bridge.ship });
        setHudTelemetry({ ...bridge.telemetry });
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleQuizComplete = useCallback(
    (isCorrect: boolean) => {
      if (!activeQuestion) return;

      audioRef.current?.playAnswerFeedback(isCorrect);

      const bridge = liveBridgeRef.current;
      const { ship, cyclone } = bridge;
      const currentMission = missionRef.current;

      if (isCorrect) {
        scoreRef.current += 250;
        correctCountRef.current += 1;
        setScore(scoreRef.current);
        setCorrectCount(correctCountRef.current);

        // Smart safe evasion course: aim toward port while biasing away from dangerous semicircle
        const bearingToPort = bearingDegBetween(
          ship.x,
          ship.z,
          currentMission.portPosition.x,
          currentMission.portPosition.z,
        );
        const bearingFromEye = bearingDegBetween(
          cyclone.x,
          cyclone.z,
          ship.x,
          ship.z,
        );

        // Navigable side offset from cyclone track:
        // North hemisphere: Left side of track (-90°), South hemisphere: Right side (+90°)
        const navigableTrackOffset =
          currentMission.hemisphere === 'north' ? -95 : 95;
        const safeFlankBearing = normalizeDeg(
          cyclone.trackDeg + navigableTrackOffset,
        );
        const safeEscapeTargetX =
          cyclone.x +
          Math.sin((safeFlankBearing * Math.PI) / 180) *
            (cyclone.radiusNM * 1.25);
        const safeEscapeTargetZ =
          cyclone.z -
          Math.cos((safeFlankBearing * Math.PI) / 180) *
            (cyclone.radiusNM * 1.25);
        const bearingToSafeFlank = bearingDegBetween(
          ship.x,
          ship.z,
          safeEscapeTargetX,
          safeEscapeTargetZ,
        );

        // If already far outside cyclone radius, blend toward port; otherwise steer decisively toward navigable flank
        const distEye = Math.hypot(ship.x - cyclone.x, ship.z - cyclone.z);
        if (distEye > cyclone.radiusNM * 1.15) {
          const diffPortVsEye = shortestAngleDiffDeg(
            bearingFromEye,
            bearingToPort,
          );
          if (Math.abs(diffPortVsEye) < 60) {
            ship.targetHeadingDeg = bearingToPort;
          } else {
            ship.targetHeadingDeg = bearingToSafeFlank;
          }
        } else {
          ship.targetHeadingDeg = bearingToSafeFlank;
        }

        if (ship.telegraph === 0) ship.telegraph = 2;
        showNotice(
          'Düzgün cavab! Avtomatik yayınma kursu keçilə bilən sektora yönəldildi.',
        );
      } else {
        // Incorrect answer: misroutes toward the dangerous semicircle so player experiences storm escalation!
        const dangerOffset = currentMission.hemisphere === 'north' ? 55 : -55;
        const dangerPointBearing = normalizeDeg(cyclone.trackDeg + dangerOffset);
        const dangerTargetX =
          cyclone.x +
          Math.sin((dangerPointBearing * Math.PI) / 180) *
            (cyclone.radiusNM * 0.45);
        const dangerTargetZ =
          cyclone.z -
          Math.cos((dangerPointBearing * Math.PI) / 180) *
            (cyclone.radiusNM * 0.45);

        ship.targetHeadingDeg = bearingDegBetween(
          ship.x,
          ship.z,
          dangerTargetX,
          dangerTargetZ,
        );
        if (ship.telegraph === 0) ship.telegraph = 2;
        showNotice(
          'Səhv qərar! Gəmi təhlükəli sektora yönəlir — sükanı əl ilə çevirib kursu düzəldin!',
        );
      }

      setActiveQuestion(null);
      phaseRef.current = 'playing';
      setPhase('playing');
    },
    [activeQuestion, showNotice],
  );

  const handleSteerDelta = useCallback(
    (deltaDeg: number) => {
      ensureAudio();
      const s = liveBridgeRef.current.ship;
      s.targetHeadingDeg = normalizeDeg(s.targetHeadingDeg + deltaDeg);
    },
    [ensureAudio],
  );

  const handleAlignToPort = useCallback(() => {
    ensureAudio();
    const s = liveBridgeRef.current.ship;
    const p = missionRef.current.portPosition;
    s.targetHeadingDeg = bearingDegBetween(s.x, s.z, p.x, p.z);
    showNotice(`Kurs ${p.name} istiqamətinə yönəldildi.`);
  }, [ensureAudio, showNotice]);

  const handleSetTelegraph = useCallback(
    (t: SpeedTelegraph) => {
      ensureAudio();
      liveBridgeRef.current.ship.telegraph = t;
    },
    [ensureAudio],
  );

  const handleToggleMute = useCallback(() => {
    ensureAudio();
    setMuted((prev) => {
      const next = !prev;
      audioRef.current?.setMuted(next);
      return next;
    });
  }, [ensureAudio]);

  const handleThunderFlash = useCallback(() => {
    audioRef.current?.playThunder();
  }, []);

  const nextMission =
    MISSIONS.find((m) => m.id === mission.id + 1) ?? null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07111E] select-none">
      {/* 100% Full-Viewport 3D Ocean & Vessel Simulation */}
      <OceanScene3D
        liveBridgeRef={liveBridgeRef}
        onThunderFlash={handleThunderFlash}
      />

      {/* Bridge Top Bar + Collapsible Bottom Controls */}
      <BridgeHUD
        mission={mission}
        ship={hudShip}
        telemetry={hudTelemetry}
        score={score}
        cameraPreset={cameraPreset}
        dockCollapsed={dockCollapsed}
        muted={muted}
        onToggleDock={() => setDockCollapsed((p) => !p)}
        onSteerDelta={handleSteerDelta}
        onAlignToPort={handleAlignToPort}
        onSetTelegraph={handleSetTelegraph}
        onSetCamera={setCameraPreset}
        onToggleMute={handleToggleMute}
        onOpenMissions={() => {
          setModalTab('missions');
          setShowMissionsModal(true);
        }}
        onOpenGuide={() => {
          setModalTab('guide');
          setShowMissionsModal(true);
        }}
      />

      {/* Tactical PPI Weather Radar (Top-Right below header, non-occluding center) */}
      <div className="fixed top-20 right-3 z-20 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setRadarExpanded((p) => !p)}
          className="sm:hidden px-3 py-1.5 rounded-lg bg-[#0B1626]/90 border border-slate-700/70 text-xs font-medium text-cyan-300 shadow-lg cursor-pointer"
        >
          {radarExpanded ? 'Radarı Gizlət' : 'Taktiki Radar'}
        </button>
        <div className={radarExpanded ? 'block' : 'hidden sm:block'}>
          <TacticalRadar
            liveBridgeRef={liveBridgeRef}
            portName={mission.portPosition.name}
            expanded={radarExpanded}
            onToggleExpand={() => setRadarExpanded((p) => !p)}
          />
        </div>
      </div>

      {/* Subtle Contextual Bridge Toast */}
      {noticeText && phase === 'playing' && !showMissionsModal && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-[#0B1626]/95 border border-cyan-500/40 text-xs md:text-sm text-cyan-100 shadow-lg max-w-[90vw] text-center">
          {noticeText}
        </div>
      )}

      {/* Oceanology Quiz Checkpoint Overlay */}
      {phase === 'quiz' && activeQuestion && !showMissionsModal && (
        <QuizModal
          question={activeQuestion}
          telemetry={hudTelemetry}
          hemisphere={mission.hemisphere}
          cycloneName={mission.cycloneName}
          onComplete={handleQuizComplete}
        />
      )}

      {/* Victory Overlay */}
      {phase === 'victory' && !showMissionsModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040B14]/80 p-4">
          <div className="w-full max-w-lg bg-[#0B1626] border border-emerald-500/50 rounded-2xl p-6 md:p-7 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-emerald-400">
              <Award className="w-7 h-7 shrink-0" />
              <h2 className="font-display text-2xl font-bold text-white">
                Limana Sağ-Salamat Çatdınız!
              </h2>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Kapitan, Kat. {mission.category} "{mission.cycloneName}" tropik
              siklonundan okeanologiya biliklərinizlə uğurla yayındınız və{' '}
              <strong>{mission.portPosition.name}</strong> limanına daxil
              oldunuz.
            </p>

            <div className="grid grid-cols-3 gap-3 text-center bg-slate-900/70 border border-slate-800 rounded-xl p-4 font-mono-tabular">
              <div>
                <div className="text-[11px] text-slate-400">Yekun Xal</div>
                <div className="text-lg font-bold text-cyan-300 mt-0.5">
                  {score}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Gövdə Qalığı</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  {Math.round(hudShip.hullIntegrity)}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Düzgün Test</div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {correctCount}/{mission.questions.length}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => startMission(mission)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Təkrar Oyna
              </button>
              {nextMission ? (
                <button
                  type="button"
                  onClick={() => startMission(nextMission)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Anchor className="w-4 h-4" />
                  Növbəti Mərhələ (Kat. {nextMission.category})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('missions');
                    setShowMissionsModal(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Bütün Mərhələlər
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sunk / Defeat Overlay */}
      {phase === 'sunk' && !showMissionsModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040B14]/82 p-4">
          <div className="w-full max-w-lg bg-[#0B1626] border border-red-500/60 rounded-2xl p-6 md:p-7 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-red-400">
              <ShieldAlert className="w-7 h-7 shrink-0" />
              <h2 className="font-display text-2xl font-bold text-white">
                Gəmi Fırtınada Zədələndi və Batdı
              </h2>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Gəmi tropik siklon "{mission.cycloneName}"-in təhlükəli
              sektorundakı hündür dalğalara və şiddətli küləyə dözə bilmədi.{' '}
              {mission.scientificTip}
            </p>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setModalTab('guide');
                  setShowMissionsModal(true);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
              >
                Okeanologiya Bələdçisi
              </button>
              <button
                type="button"
                onClick={() => startMission(mission)}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Missiyanı Yenidən Başlat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mission Selection & Scientific Field Guide Modal */}
      {showMissionsModal && (
        <MissionSelectModal
          records={records}
          currentMissionId={mission.id}
          initialTab={modalTab}
          canResume={phase === 'playing' || phase === 'quiz'}
          onSelectMission={startMission}
          onResume={() => setShowMissionsModal(false)}
        />
      )}
    </div>
  );
}
