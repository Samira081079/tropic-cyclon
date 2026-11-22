import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Hemisphere, QuizQuestion, WeatherTelemetry } from '../types/game';

interface QuizModalProps {
  question: QuizQuestion;
  telemetry: WeatherTelemetry;
  hemisphere: Hemisphere;
  cycloneName: string;
  onComplete: (isCorrect: boolean) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
const QUESTION_TIME_SEC = 40;

export const QuizModal: React.FC<QuizModalProps> = ({
  question,
  telemetry,
  hemisphere,
  cycloneName,
  onComplete,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(QUESTION_TIME_SEC);
  const [timedOut, setTimedOut] = useState(false);

  const submitted = selectedIndex !== null || timedOut;
  const isCorrect =
    selectedIndex !== null && selectedIndex === question.correctIndex;

  useEffect(() => {
    if (submitted) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [submitted]);

  // Keyboard shortcuts 1-4 and Enter to continue
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!submitted) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          setSelectedIndex(Number(e.key) - 1);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onComplete(isCorrect);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [submitted, isCorrect, onComplete]);

  const urgencyLabel =
    question.triggerKind === 'emergency'
      ? 'KRİTİK YAYINMA QƏRARI'
      : question.triggerKind === 'evasion'
        ? 'NAVİQASİYA KURSU TESTİ'
        : 'UZAQDAN MÜŞAHİDƏ ANALİZİ';

  const urgencyColor =
    question.triggerKind === 'emergency'
      ? 'text-red-400'
      : question.triggerKind === 'evasion'
        ? 'text-amber-400'
        : 'text-cyan-400';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040B14]/75 p-4 md:p-6">
      <div className="w-full max-w-2xl bg-[#0B1626] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Timer Bar */}
        <div className="h-1.5 w-full bg-slate-800">
          <div
            className={`h-full transition-all duration-500 ${
              timeLeft <= 10 ? 'bg-red-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${(timeLeft / QUESTION_TIME_SEC) * 100}%` }}
          />
        </div>

        <div className="p-6 md:p-7 overflow-y-auto bridge-scroll space-y-5">
          {/* Header & Live Telemetry Line */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span
                className={`text-xs font-semibold tracking-wider flex items-center gap-1.5 ${urgencyColor}`}
              >
                <Compass className="w-4 h-4 shrink-0" />
                {urgencyLabel}
              </span>
              <span className="font-mono-tabular text-xs text-slate-300">
                Vaxt: {timeLeft} san
              </span>
            </div>

            <h2 className="font-display text-xl md:text-2xl font-semibold text-white text-balance">
              {question.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono-tabular pt-0.5">
              <span>Siklon: {cycloneName}</span>
              <span aria-hidden="true">·</span>
              <span>
                {hemisphere === 'north'
                  ? 'Şimal yarımkürəsi'
                  : 'Cənub yarımkürəsi'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Təzyiq: {telemetry.pressureHpa.toFixed(0)} hPa</span>
              <span aria-hidden="true">·</span>
              <span>Külək: {Math.round(telemetry.windKnots)} kt</span>
              <span aria-hidden="true">·</span>
              <span>Dalğa: {telemetry.waveHeightM.toFixed(1)} m</span>
            </div>
          </div>

          {/* Question Body */}
          <p className="text-[15px] md:text-base leading-relaxed text-slate-100">
            {question.question}
          </p>

          {/* Options */}
          <div className="space-y-2.5">
            {question.options.map((opt, idx) => {
              const isSelected = selectedIndex === idx;
              const isOptionCorrect = idx === question.correctIndex;

              let btnStyle =
                'bg-slate-900/70 border-slate-700/70 hover:border-cyan-500/70 hover:bg-slate-800/80 text-slate-200';
              if (submitted) {
                if (isOptionCorrect) {
                  btnStyle =
                    'bg-emerald-950/60 border-emerald-500 text-emerald-100';
                } else if (isSelected && !isOptionCorrect) {
                  btnStyle = 'bg-red-950/60 border-red-500 text-red-100';
                } else {
                  btnStyle =
                    'bg-slate-900/40 border-slate-800 text-slate-500 opacity-75';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={submitted}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors flex items-start gap-3.5 cursor-pointer disabled:cursor-default ${btnStyle}`}
                >
                  <span className="font-mono-tabular text-xs font-semibold w-6 h-6 rounded-md bg-slate-800/90 border border-slate-600/50 flex items-center justify-center shrink-0 mt-0.5">
                    {OPTION_LETTERS[idx]}
                  </span>
                  <span className="text-sm md:text-[15px] leading-snug flex-1">
                    {opt}
                  </span>
                  {submitted && isOptionCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  {submitted && isSelected && !isOptionCorrect && (
                    <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Result & Scientific Explanation */}
          {submitted && (
            <div
              className={`rounded-xl p-4 border space-y-2 ${
                isCorrect
                  ? 'bg-emerald-950/40 border-emerald-700/60'
                  : 'bg-red-950/40 border-red-700/60'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                {isCorrect ? (
                  <>
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">
                      Düzgün qərar! Gəmi təhlükəsiz yayınma kursuna yönəldildi.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <span className="text-red-300">
                      {timedOut
                        ? 'Vaxt bitdi! Gəmi fırtınanın təhlükəli sektoruna sürüklənir.'
                        : 'Yanlış naviqasiya seçimi! Gəmi siklonun təhlükəli sektoruna yönəlir.'}
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {question.explanation}
              </p>
            </div>
          )}

          {/* Footer Action */}
          {submitted && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => onComplete(isCorrect)}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Səyahətə Davam Et
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
