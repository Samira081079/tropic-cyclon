import React from 'react';
import {
  Anchor,
  BookOpen,
  Camera,
  ChevronDown,
  ChevronUp,
  Compass,
  Map,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CameraPreset,
  MissionConfig,
  ShipState,
  SpeedTelegraph,
  WeatherTelemetry,
} from '../types/game';

interface BridgeHUDProps {
  mission: MissionConfig;
  ship: ShipState;
  telemetry: WeatherTelemetry;
  score: number;
  cameraPreset: CameraPreset;
  dockCollapsed: boolean;
  muted: boolean;
  onToggleDock: () => void;
  onSteerDelta: (deltaDeg: number) => void;
  onAlignToPort: () => void;
  onSetTelegraph: (t: SpeedTelegraph) => void;
  onSetCamera: (c: CameraPreset) => void;
  onToggleMute: () => void;
  onOpenMissions: () => void;
  onOpenGuide: () => void;
}

const TELEGRAPH_LABELS: { value: SpeedTelegraph; label: string }[] = [
  { value: 0, label: 'Stop' },
  { value: 1, label: 'Yavaş' },
  { value: 2, label: 'Orta' },
  { value: 3, label: 'Tam' },
];

const CAMERA_LABELS: { value: CameraPreset; label: string }[] = [
  { value: 'chase', label: 'Gəmi' },
  { value: 'bridge', label: 'Körpü' },
  { value: 'aerial', label: 'Səma' },
];

export const BridgeHUD: React.FC<BridgeHUDProps> = ({
  mission,
  ship,
  telemetry,
  score,
  cameraPreset,
  dockCollapsed,
  muted,
  onToggleDock,
  onSteerDelta,
  onAlignToPort,
  onSetTelegraph,
  onSetCamera,
  onToggleMute,
  onOpenMissions,
  onOpenGuide,
}) => {
  const sectorTone =
    telemetry.sector === 'eyewall' || telemetry.sector === 'dangerous'
      ? 'text-red-400'
      : telemetry.sector === 'outer' || telemetry.sector === 'navigable'
        ? 'text-amber-300'
        : 'text-emerald-400';

  const sectorPrefix =
    telemetry.sector === 'eyewall' || telemetry.sector === 'dangerous'
      ? '■'
      : telemetry.sector === 'outer' || telemetry.sector === 'navigable'
        ? '▲'
        : '●';

  return (
    <>
      {/* Top Minimal Bridge Bar (Three-zone discipline, unboxed metadata) */}
      <header className="fixed top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 rounded-xl bg-[#0B1626]/90 border border-slate-700/60 shadow-lg pointer-events-auto">
        {/* Zone 1: Brand + Mission */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-base font-bold text-white whitespace-nowrap shrink-0">
            Okean Naviqatoru
          </span>
          <span className="hidden sm:inline text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="hidden sm:inline text-xs text-slate-300 truncate">
            {mission.oceanName} · Kat. {mission.category} "{mission.cycloneName}"
          </span>
        </div>

        {/* Zone 2: Live Tabular Telemetry */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono-tabular">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-400">Gövdə:</span>
            <span
              className={
                ship.hullIntegrity > 65
                  ? 'text-emerald-400 font-semibold'
                  : ship.hullIntegrity > 35
                    ? 'text-amber-400 font-semibold'
                    : 'text-red-400 font-semibold'
              }
            >
              {Math.round(ship.hullIntegrity)}%
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-400">Təzyiq:</span>
            <span className="text-slate-100">
              {telemetry.pressureHpa.toFixed(0)} hPa
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-400">Külək:</span>
            <span className="text-cyan-300">
              {Math.round(telemetry.windKnots)} kt
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-400">Dalğa:</span>
            <span className="text-slate-100">
              {telemetry.waveHeightM.toFixed(1)} m (B{telemetry.beaufortScale})
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-400">Liman:</span>
            <span className="text-emerald-300">
              {telemetry.distanceToPortNM.toFixed(0)} mil
            </span>
          </div>

          <div className={`font-sans font-medium whitespace-nowrap ${sectorTone}`}>
            {sectorPrefix} {telemetry.sectorLabel}
          </div>
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden lg:inline font-mono-tabular text-xs text-slate-300 mr-2">
            Xal: {score}
          </span>
          <button
            type="button"
            onClick={onOpenGuide}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Bələdçi</span>
          </button>
          <button
            type="button"
            onClick={onOpenMissions}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Map className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mərhələlər</span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Səsi aç' : 'Səsi bağla'}
            className="p-1.5 rounded-lg text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            )}
          </button>
        </div>
      </header>

      {/* Danger / Sinking Risk Banner (only shown when actually in danger or taking damage) */}
      {(telemetry.sector === 'dangerous' || telemetry.sector === 'eyewall') && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-red-950/90 border border-red-500/80 text-red-100 text-xs md:text-sm font-medium shadow-xl flex items-center gap-3 whitespace-nowrap">
          <span>
            ■ TƏHLÜKƏLİ SEKTOR — Gövdə zədələnir! Batma riski:{' '}
            <strong className="font-mono-tabular">
              {telemetry.sinkingRiskPercent}%
            </strong>
          </span>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (Zero viewport occlusion) */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center transition-transform duration-200 ${
          dockCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
        }`}
      >
        <button
          type="button"
          onClick={onToggleDock}
          className="px-3.5 py-1 rounded-t-lg bg-[#0B1626]/95 border border-b-0 border-slate-700/70 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              İdarəetməni Göstər
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              İdarəetməni Gizlət
            </>
          )}
        </button>

        <div className="bg-[#0B1626]/92 border border-slate-700/75 rounded-2xl px-4 py-3 shadow-2xl flex flex-wrap items-center justify-center gap-4 md:gap-6 max-w-[95vw]">
          {/* Helm / Steering */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1 whitespace-nowrap">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono-tabular text-slate-100 font-semibold">
                {Math.round(ship.headingDeg).toString().padStart(3, '0')}°
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSteerDelta(-15)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 border border-slate-600/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              ← 15°
            </button>
            <button
              type="button"
              onClick={() => onSteerDelta(-5)}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-600/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              ← 5°
            </button>
            <button
              type="button"
              onClick={() => onSteerDelta(5)}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-600/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              5° →
            </button>
            <button
              type="button"
              onClick={() => onSteerDelta(15)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 border border-slate-600/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              15° →
            </button>
            <button
              type="button"
              onClick={onAlignToPort}
              title="Limana istiqamətlən"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-xs font-medium text-emerald-300 border border-emerald-700/60 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <Anchor className="w-3.5 h-3.5" />
              Limana
            </button>
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-700/70" />

          {/* Speed Telegraph */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-700/50">
            {TELEGRAPH_LABELS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onSetTelegraph(item.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  ship.telegraph === item.value
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-700/70" />

          {/* Camera Views */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-700/50">
            <Camera className="w-3.5 h-3.5 text-slate-400 mx-1.5 shrink-0" />
            {CAMERA_LABELS.map((cam) => (
              <button
                key={cam.value}
                type="button"
                onClick={() => onSetCamera(cam.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  cameraPreset === cam.value
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
