import { MACRO_KEYS } from '../constants';
import { calculateVariantTotals, roundMacro } from '../utils/macros';

const DAYS = [
  { id: 'mon', label: 'Lunedì' },
  { id: 'tue', label: 'Martedì' },
  { id: 'wed', label: 'Mercoledì' },
  { id: 'thu', label: 'Giovedì' },
  { id: 'fri', label: 'Venerdì' },
  { id: 'sat', label: 'Sabato' },
  { id: 'sun', label: 'Domenica' },
];

// getDay(): 0=Domenica ... 6=Sabato  ->  id nostro
const TODAY_ID = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

const MACRO_SHORT = { kcal: 'Kcal', protein: 'P', carbs: 'C', fat: 'G' };

function MacroStrip({ totals, dark }) {
  const num = dark ? 'text-white' : 'text-slate-900';
  const lbl = dark ? 'text-indigo-200' : 'text-slate-400';
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {MACRO_KEYS.map((key) => {
        const value = roundMacro(totals[key]);
        if (key === 'kcal') {
          return (
            <span key={key} className="whitespace-nowrap">
              <span className={`font-bold ${num}`}>{value}</span>
              <span className={lbl}> kcal</span>
            </span>
          );
        }
        return (
          <span key={key} className="whitespace-nowrap">
            <span className={lbl}>{MACRO_SHORT[key]} </span>
            <span className={`font-bold ${num}`}>{value}</span>
            <span className={lbl}>g</span>
          </span>
        );
      })}
    </div>
  );
}

export default function WeekPlanner({ weekAssignments, variants, dispatch, onOpenVariant }) {
  const assignments = weekAssignments || {};
  const variantById = new Map(variants.map((v) => [v.id, v]));
  const totalsById = new Map(variants.map((v) => [v.id, calculateVariantTotals(v)]));

  function assignedVariant(dayId) {
    const id = assignments[dayId];
    return id && variantById.has(id) ? variantById.get(id) : null;
  }

  const assignedDays = DAYS.map((d) => assignedVariant(d.id)).filter(Boolean);
  const average = MACRO_KEYS.reduce((acc, key) => {
    if (assignedDays.length === 0) {
      acc[key] = 0;
    } else {
      const sum = assignedDays.reduce((s, v) => s + (totalsById.get(v.id)[key] || 0), 0);
      acc[key] = sum / assignedDays.length;
    }
    return acc;
  }, {});

  const todayVariant = assignedVariant(TODAY_ID);
  const todayLabel = DAYS.find((d) => d.id === TODAY_ID)?.label ?? '';

  return (
    <div className="space-y-5">
      {/* Riquadro OGGI */}
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white shadow-soft">
        <div className="text-sm font-semibold uppercase tracking-wide text-indigo-200">Oggi · {todayLabel}</div>
        {todayVariant ? (
          <>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black">{todayVariant.name}</h2>
              {onOpenVariant && (
                <button
                  onClick={() => onOpenVariant(todayVariant.id)}
                  className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/20 transition hover:bg-white/25"
                >
                  Apri nella Dieta →
                </button>
              )}
            </div>
            <div className="mt-3">
              <MacroStrip totals={totalsById.get(todayVariant.id)} dark />
            </div>
          </>
        ) : (
          <p className="mt-1 text-indigo-100">Nessuna variante assegnata a oggi. Scegline una qui sotto.</p>
        )}
      </section>

      {/* Assegnazioni per giorno */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
        <div className="mb-4">
          <h2 className="text-lg font-black text-slate-950">Dieta della settimana</h2>
          <p className="text-sm text-slate-500">
            Assegna una variante a ogni giorno: vedi subito i macro e apri il modello con un tocco.
          </p>
        </div>

        <div className="space-y-2">
          {DAYS.map((day) => {
            const variant = assignedVariant(day.id);
            const isToday = day.id === TODAY_ID;
            return (
              <div
                key={day.id}
                className={`rounded-2xl border p-3 ${isToday ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200'}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{day.label}</span>
                    {isToday && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white">oggi</span>
                    )}
                  </div>
                  <select
                    value={variant ? variant.id : ''}
                    onChange={(e) =>
                      dispatch({ type: 'SET_DAY_VARIANT', payload: { day: day.id, variantId: e.target.value } })
                    }
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:w-56"
                  >
                    <option value="">— nessuna —</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                {variant && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <MacroStrip totals={totalsById.get(variant.id)} />
                    {onOpenVariant && (
                      <button
                        onClick={() => onOpenVariant(variant.id)}
                        className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
                      >
                        Apri →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Media giornaliera */}
      {assignedDays.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-lg font-black text-slate-950">Media giornaliera</h2>
            <span className="text-xs text-slate-400">su {assignedDays.length} giorni assegnati</span>
          </div>
          <MacroStrip totals={average} />
        </section>
      )}
    </div>
  );
}