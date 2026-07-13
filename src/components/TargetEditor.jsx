import { MACRO_KEYS, MACRO_LABELS, MACRO_UNITS } from '../constants';

export default function TargetEditor({ target, tolerance, dispatch }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Target globale giornaliero</h2>
          <p className="text-sm text-slate-500">
            Modifica obiettivi e tolleranze. Tutto viene salvato automaticamente in localStorage.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {MACRO_KEYS.map((key) => (
          <label key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {MACRO_LABELS[key]}
            </span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={target[key]}
                onChange={(event) =>
                  dispatch({ type: 'SET_TARGET', payload: { key, value: event.target.value } })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-900 outline-none ring-indigo-200 transition focus:ring-4"
              />
              <span className="text-sm text-slate-500">{MACRO_UNITS[key]}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span>Tolleranza ±</span>
              <input
                type="number"
                min="0"
                value={tolerance[key]}
                onChange={(event) =>
                  dispatch({ type: 'SET_TOLERANCE', payload: { key, value: event.target.value } })
                }
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-900 outline-none ring-indigo-200 transition focus:ring-4"
              />
              <span>{MACRO_UNITS[key]}</span>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
