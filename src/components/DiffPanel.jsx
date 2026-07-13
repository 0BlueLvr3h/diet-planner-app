import { MACRO_KEYS, MACRO_LABELS, MACRO_UNITS } from '../constants';
import { formatSigned, getMacroStatus, isDiffInsideTolerance, roundMacro } from '../utils/macros';

const statusClasses = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800'
};

export default function DiffPanel({ target, totals, diff, tolerance }) {
  const balanced = isDiffInsideTolerance(diff, tolerance);

  return (
    <section className="sticky top-3 z-30 rounded-3xl border border-slate-700 bg-slate-900/95 p-4 text-white shadow-soft backdrop-blur lg:p-5">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold">Bilancio variante attiva</h2>
          <p className="text-sm text-slate-300">
            {balanced
              ? 'Dentro la tolleranza: gli avvisi contestuali vengono spenti automaticamente.'
              : 'Fuori tolleranza: gli alimenti modificati evidenziano cosa sta causando lo sbilanciamento.'}
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-sm font-bold ${
            balanced ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-300 text-amber-950'
          }`}
        >
          {balanced ? 'Bilanciata' : 'Da compensare'}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {MACRO_KEYS.map((key) => {
          const status = getMacroStatus(diff[key], tolerance[key]);
          return (
            <div key={key} className={`rounded-2xl border p-3 ${statusClasses[status]}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wide opacity-70">
                  {MACRO_LABELS[key]}
                </span>
                <span className="text-xs font-semibold opacity-70">±{tolerance[key]} {MACRO_UNITS[key]}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-[11px] opacity-70">Target</div>
                  <div className="font-bold">{roundMacro(target[key])}</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-70">Totale</div>
                  <div className="font-bold">{roundMacro(totals[key])}</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-70">Diff</div>
                  <div className="font-black">{formatSigned(diff[key])}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
