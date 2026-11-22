import React, { useState } from 'react';
import {
  Anchor,
  BookOpen,
  CheckCircle2,
  Compass,
  Navigation,
  Waves,
  Wind,
} from 'lucide-react';
import { MISSIONS } from '../data/missions';
import { MissionConfig, MissionRecord } from '../types/game';

interface MissionSelectModalProps {
  records: Record<number, MissionRecord>;
  currentMissionId: number;
  initialTab?: 'missions' | 'guide';
  canResume: boolean;
  onSelectMission: (mission: MissionConfig) => void;
  onResume?: () => void;
}

export const MissionSelectModal: React.FC<MissionSelectModalProps> = ({
  records,
  currentMissionId,
  initialTab = 'missions',
  canResume,
  onSelectMission,
  onResume,
}) => {
  const [tab, setTab] = useState<'missions' | 'guide'>(initialTab);

  const completedCount = MISSIONS.filter((m) => records[m.id]?.completed).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#040B14]/88 p-4 md:p-8">
      <div className="w-full max-w-5xl bg-[#0B1626] border border-slate-700/75 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Okean Naviqatoru
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Tropik siklonlardan yayınma və okeanologiya simulyasiyası ·{' '}
              <span className="font-mono-tabular text-slate-300">
                {completedCount}/{MISSIONS.length} mərhələ tamamlanıb
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setTab('missions')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  tab === 'missions'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Səyahət Mərhələləri
              </button>
              <button
                type="button"
                onClick={() => setTab('guide')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  tab === 'guide'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Okeanologiya Bələdçisi
              </button>
            </div>

            {canResume && onResume && (
              <button
                type="button"
                onClick={onResume}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                Körpüyə Qayıt
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto bridge-scroll flex-1">
          {tab === 'missions' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MISSIONS.map((mission) => {
                const rec = records[mission.id];
                const isActive = mission.id === currentMissionId;

                return (
                  <div
                    key={mission.id}
                    className={`rounded-xl p-5 border flex flex-col justify-between gap-4 transition-colors ${
                      isActive
                        ? 'bg-slate-900/90 border-cyan-500/60'
                        : 'bg-slate-900/55 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-lg font-semibold text-white">
                          {mission.title}
                        </h3>
                        {rec?.completed && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 shrink-0 whitespace-nowrap">
                            <CheckCircle2 className="w-4 h-4" />
                            Tamamlanıb
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 font-mono-tabular">
                        <span className="text-cyan-300 font-medium">
                          Kat. {mission.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{mission.oceanName}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {mission.hemisphere === 'north'
                            ? 'Şimal yarımkürəsi'
                            : 'Cənub yarımkürəsi'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{mission.maxWindKnots} kt</span>
                        <span aria-hidden="true">·</span>
                        <span>{mission.minPressureHpa} hPa</span>
                      </div>

                      <p className="text-sm text-slate-300 leading-relaxed">
                        {mission.briefing}
                      </p>

                      <p className="text-xs text-slate-400 leading-relaxed pt-1">
                        Elmi qeyd: {mission.scientificTip}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
                      <div className="text-xs text-slate-400 font-mono-tabular">
                        {rec ? (
                          <span>
                            Ən yaxşı xal: {rec.bestScore} · Düzgün:{' '}
                            {rec.correctAnswers}/{rec.totalQuestions}
                          </span>
                        ) : (
                          <span>Hədəf: {mission.portPosition.name}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectMission(mission)}
                        className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Səyahətə Başla
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <Compass className="w-4 h-4" />
                  <h3>1. Koriolis Qüvvəsi və Fırlanma</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Yerin öz oxu ətrafında fırlanması hava axınlarını meyilləndirir.
                  <strong> Şimal yarımkürəsində</strong> tropik siklonlar saat
                  əqrəbinin əksinə (CCW), <strong>Cənub yarımkürəsində</strong>{' '}
                  isə saat əqrəbi istiqamətində (CW) fırlanır. Ekvatorun 5°
                  yaxınlığında Koriolis qüvvəsi zəif olduğundan siklon yaranmır.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-red-400 font-semibold">
                  <Wind className="w-4 h-4" />
                  <h3>2. Təhlükəli vs Keçilə Bilən Yarımkürə</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Siklonun irəliləmə sürəti ilə fırlanma küləyinin toplandığı
                  tərəf <strong>Təhlükəli Yarımkürədir</strong>: Şimal
                  yarımkürəsində yolun <strong>SAĞ</strong> tərəfi, Cənub
                  yarımkürəsində isə <strong>SOL</strong> tərəfi təhlükəlidir.
                  Bu zonada külək gəmini siklonun yolunun önünə itələyir.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <Waves className="w-4 h-4" />
                  <h3>3. Barometrik Təzyiq və Ölü Dalğalar</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Normal dəniz səviyyəsi təzyiqi ~1013 hPa-dır. Təzyiqin sürətlə
                  1000 hPa-dan aşağı düşməsi və uzaqdan uzun periodlu ölü
                  dalğaların (swell) gəlməsi siklonun yaxınlaşmasını xəbər
                  verir. Küləyin istiqamət dəyişməsi (veering / backing) hansı
                  sektorda olduğunuzu göstərir.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <Anchor className="w-4 h-4" />
                  <h3>4. Yayınma Manevri və 1-2-3 Qaydası</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Şimal yarımkürəsində təhlükəli sektordan qaçmaq üçün küləyi{' '}
                  <strong>sağ burun (45°)</strong> tərəfdən, Cənub
                  yarımkürəsində isə <strong>sol burun (45°)</strong> tərəfdən
                  alaraq uzaqlaşmaq lazımdır. 1-2-3 Qaydasına əsasən 34 kt külək
                  dairəsinə 24/48/72 saat üçün 100/200/300 mil bufer əlavə
                  edilir.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
