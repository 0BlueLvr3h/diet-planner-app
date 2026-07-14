import { useMemo, useState } from 'react';
import {
  ACTIVITY_LEVELS,
  FAT_OPTIONS,
  GOALS,
  PROTEIN_OPTIONS,
  computeNutritionPlan,
  makeEmptyProfile
} from '../utils/nutrition';

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      {hint && <span className="ml-1 text-xs font-normal text-slate-400">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none ring-indigo-200 focus:ring-4';

export default function CalorieCalculator({ profile, onSaveProfile, onApplyTargets }) {
  const [form, setForm] = useState(() => ({ ...makeEmptyProfile(), ...(profile ?? {}) }));
  const [applied, setApplied] = useState(false);

  const plan = useMemo(() => computeNutritionPlan(form), [form]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setApplied(false);
  }

  function handleApply() {
    if (!plan.ok) return;
    onApplyTargets(plan.macros);
    onSaveProfile?.(form);
    setApplied(true);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
        <h2 className="text-lg font-black text-slate-950">Calcolatore calorie e macro</h2>
        <p className="mt-1 text-sm text-slate-500">
          Stima il tuo fabbisogno giornaliero. È un <strong>punto di partenza</strong>, non una misura:
          seguilo 2-3 settimane e correggi in base a quello che fa il peso.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Sesso">
            <div className="inline-flex w-full rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
              {[
                { id: 'male', label: 'Uomo' },
                { id: 'female', label: 'Donna' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => update('sex', option.id)}
                  className={`flex-1 rounded-xl px-3 py-2 transition ${
                    form.sex === option.id ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Età" hint="anni">
            <input
              type="number"
              inputMode="numeric"
              value={form.age}
              onChange={(event) => update('age', event.target.value)}
              placeholder="30"
              className={inputClass}
            />
          </Field>

          <Field label="Altezza" hint="cm">
            <input
              type="number"
              inputMode="numeric"
              value={form.heightCm}
              onChange={(event) => update('heightCm', event.target.value)}
              placeholder="178"
              className={inputClass}
            />
          </Field>

          <Field label="Peso" hint="kg">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.weightKg}
              onChange={(event) => update('weightKg', event.target.value)}
              placeholder="80"
              className={inputClass}
            />
          </Field>

          <Field label="Grasso corporeo" hint="% — opzionale, ma migliora la stima">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.bodyFatPct}
              onChange={(event) => update('bodyFatPct', event.target.value)}
              placeholder="lascia vuoto se non lo sai"
              className={inputClass}
            />
          </Field>

          <Field label="Obiettivo">
            <select value={form.goalId} onChange={(event) => update('goalId', event.target.value)} className={inputClass}>
              {GOALS.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.label} ({goal.hint})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Livello di attività" hint="quasi tutti si sopravvalutano: scegli con onestà">
            <select
              value={form.activityId}
              onChange={(event) => update('activityId', event.target.value)}
              className={inputClass}
            >
              {ACTIVITY_LEVELS.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.label} — {level.hint}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Proteine" hint="g per kg di peso">
            <select
              value={form.proteinPerKg}
              onChange={(event) => update('proteinPerKg', Number(event.target.value))}
              className={inputClass}
            >
              {PROTEIN_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value} g/kg
                </option>
              ))}
            </select>
          </Field>

          <Field label="Grassi" hint="g per kg di peso">
            <select
              value={form.fatPerKg}
              onChange={(event) => update('fatPerKg', Number(event.target.value))}
              className={inputClass}
            >
              {FAT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value} g/kg
                </option>
              ))}
            </select>
          </Field>
        </div>

        {plan.katchAvailable && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
            <div className="text-sm font-bold text-slate-700">Formula per il metabolismo basale</div>
            <div className="mt-2 inline-flex rounded-xl bg-white p-1 text-sm font-semibold ring-1 ring-slate-200">
              {[
                { id: 'auto', label: 'Katch-McArdle' },
                { id: 'mifflin', label: 'Mifflin-St Jeor' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => update('formula', option.id)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    (form.formula === 'katch' ? 'auto' : form.formula) === option.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Katch-McArdle parte dalla massa magra: più precisa, se la percentuale di grasso è attendibile.
            </p>
          </div>
        )}
      </section>

      {/* Risultato */}
      {!plan.ok ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-slate-600">Compila i campi per vedere la stima.</p>
          {form.age !== '' && form.heightCm !== '' && form.weightKg !== '' && (
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              {plan.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white shadow-soft">
            <div className="text-sm font-semibold uppercase tracking-wide text-indigo-200">
              Target giornaliero · {plan.goal.label}
            </div>
            <div className="mt-1 text-4xl font-black">{plan.macros.kcal} kcal</div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Proteine', value: plan.macros.protein },
                { label: 'Carboidrati', value: plan.macros.carbs },
                { label: 'Grassi', value: plan.macros.fat }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                  <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-indigo-200">
                    {item.label}
                  </div>
                  <div className="font-black">{item.value} g</div>
                </div>
              ))}
            </div>

            <button
              onClick={handleApply}
              className="mt-5 w-full rounded-2xl bg-white px-4 py-3 font-black text-indigo-700 transition hover:bg-indigo-50 active:scale-[0.99]"
            >
              {applied ? '✓ Target impostati' : 'Usa questi valori'}
            </button>
            <p className="mt-2 text-center text-xs text-indigo-200">
              Sovrascrive i Target in Impostazioni. Annullabile con Ctrl+Z.
            </p>
          </section>

          {plan.warnings.length > 0 && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
              {plan.warnings.map((warning) => (
                <p key={warning} className="text-sm font-semibold text-amber-800">
                  {warning}
                </p>
              ))}
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">Come ci sono arrivato</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">
                  Metabolismo basale{' '}
                  <span className="text-slate-400">
                    ({plan.usedFormula === 'katch' ? 'Katch-McArdle' : 'Mifflin-St Jeor'})
                  </span>
                </dt>
                <dd className="font-black text-slate-900">{plan.bmr} kcal</dd>
              </div>

              {plan.katchAvailable && (
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <dt className="text-slate-400">L'altra formula direbbe</dt>
                  <dd className="font-semibold text-slate-500">
                    {plan.usedFormula === 'katch' ? plan.bmrMifflin : plan.bmrKatch} kcal
                  </dd>
                </div>
              )}

              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">
                  × attività <span className="text-slate-400">({plan.activity.factor})</span>
                </dt>
                <dd className="font-black text-slate-900">{plan.tdee} kcal</dd>
              </div>

              <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-2">
                <dt className="text-slate-500">
                  {plan.goal.label} <span className="text-slate-400">({plan.goal.hint})</span>
                </dt>
                <dd className="font-black text-indigo-700">{plan.macros.kcal} kcal</dd>
              </div>
            </dl>

            <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
              Queste formule sono medie di popolazione: la stima del basale cade entro il 10% del valore reale
              per la maggior parte delle persone, e il fattore di attività è ancora più approssimativo. In
              pratica il numero può sbagliare di 200-400 kcal. <strong>Il fabbisogno vero lo scopri, non lo
              calcoli</strong>: tieni questo target per 2-3 settimane e guarda il peso. Se non si muove, quello è
              il tuo mantenimento — qualunque cosa dica la formula. Per condizioni mediche, gravidanza o
              obiettivi agonistici, parlane con un professionista.
            </p>
          </section>
        </>
      )}
    </div>
  );
}