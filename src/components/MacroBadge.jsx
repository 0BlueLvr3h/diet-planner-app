import { MACRO_LABELS, MACRO_UNITS } from '../constants';
import { roundMacro } from '../utils/macros';

const toneClasses = {
  neutral: 'border-slate-200 bg-white text-slate-700',
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  dark: 'border-slate-700 bg-slate-900 text-slate-100'
};

// Etichette brevi ma ancora parole, non sigle: "CARBOIDRATI" per intero non entra
// in un quarto di schermo del telefono e sfondava la card.
export const MACRO_LABELS_SHORT = {
  kcal: 'Kcal',
  protein: 'Prot',
  carbs: 'Carb',
  fat: 'Gras'
};

export default function MacroBadge({ macroKey, value, tone = 'neutral', compact = false }) {
  const unit = MACRO_UNITS[macroKey];
  const label = compact ? MACRO_LABELS_SHORT[macroKey] : MACRO_LABELS[macroKey];

  return (
    <div
      className={`min-w-0 rounded-2xl border px-3 py-2 text-sm shadow-sm ${toneClasses[tone] ?? toneClasses.neutral} ${
        compact ? '' : 'min-w-24'
      }`}
    >
      <div className="truncate text-[11px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="truncate font-bold">
        {roundMacro(value)} {unit}
      </div>
    </div>
  );
}