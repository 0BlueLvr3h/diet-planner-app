const DAYS = [
  { id: 'mon', label: 'Lunedì' },
  { id: 'tue', label: 'Martedì' },
  { id: 'wed', label: 'Mercoledì' },
  { id: 'thu', label: 'Giovedì' },
  { id: 'fri', label: 'Venerdì' },
  { id: 'sat', label: 'Sabato' },
  { id: 'sun', label: 'Domenica' },
];

export default function WeekPlanner({ weekAssignments, variants, dispatch }) {
  const assignments = weekAssignments || {};
  const variantIds = new Set(variants.map((v) => v.id));

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-950">Dieta della settimana</h2>
        <p className="text-sm text-slate-500">
          Assegna a ogni giorno una variante salvata, per avere una dieta fissa settimanale.
        </p>
      </div>

      <div className="space-y-2">
        {DAYS.map((day) => {
          const assignedId = assignments[day.id] || '';
          const stillExists = assignedId && variantIds.has(assignedId);
          return (
            <div
              key={day.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-semibold text-slate-800">{day.label}</span>
              <select
                value={stillExists ? assignedId : ''}
                onChange={(e) =>
                  dispatch({ type: 'SET_DAY_VARIANT', payload: { day: day.id, variantId: e.target.value } })
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:w-64"
              >
                <option value="">— nessuna —</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Qui scegli quale modello mangiare in ciascun giorno. Le modifiche ai modelli si fanno nella sezione Dieta.
      </p>
    </section>
  );
}