import { MACRO_LABELS, MACRO_UNITS } from '../constants';
import { roundMacro } from '../utils/macros';

const toneClasses = {
  neutral: 'border-slate-200 bg-white text-slate-700',
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  dark: 'border-slate-700 bg-slate-900 text-slate-100'
};

export default function MacroBadge({ macroKey, value, tone = 'neutral', compact = false }) {
  const unit = MACRO_UNITS[macroKey];

  return (
    <div
      className={`rounded-2xl border px-3 py-2 text-sm shadow-sm ${toneClasses[tone] ?? toneClasses.neutral} ${
        compact ? 'min-w-20' : 'min-w-24'
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
        {MACRO_LABELS[macroKey]}
      </div>
      <div className="font-bold">
        {roundMacro(value)} {unit}
      </div>
    </div>
  );
}

const SHORT = { protein: 'P', carbs: 'C', fat: 'G' };

// Riga compatta dei macro: sostituisce i quattro riquadri dove lo spazio verticale
// conta (telefono). Stessa convenzione della vista Settimana.
export function MacroLine({ macros, className = '' }) {
  return (
    <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm ${className}`}>
      <span className="whitespace-nowrap">
        <span className="font-black text-slate-900">{roundMacro(macros?.kcal)}</span>
        <span className="text-slate-400"> kcal</span>
      </span>
      {['protein', 'carbs', 'fat'].map((key) => (
        <span key={key} className="whitespace-nowrap text-slate-400">
          {SHORT[key]} <span className="font-bold text-slate-700">{roundMacro(macros?.[key])}</span>g
        </span>
      ))}
    </div>
  );
}