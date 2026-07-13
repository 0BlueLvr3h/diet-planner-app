import { useEffect, useMemo, useState } from 'react';
import { MACRO_KEYS, MACRO_LABELS, MACRO_UNITS } from '../constants';
import { roundMacro, toNumber } from '../utils/macros';
import { barcodeFoodKey } from '../utils/barcodeFoods';

function MacroPer100g({ macrosPer100g }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MACRO_KEYS.map((key) => {
        const value = macrosPer100g?.[key];
        const shown = Number.isFinite(Number(value)) ? `${roundMacro(value)} ${MACRO_UNITS[key]}` : 'n/d';
        return (
          <span
            key={key}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600"
            title={`${MACRO_LABELS[key]} per 100 g`}
          >
            {MACRO_LABELS[key]}: {shown}
          </span>
        );
      })}
    </div>
  );
}

function BarcodeFoodRow({ food, variants, dispatch }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? '');
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === variantId) ?? variants[0],
    [variants, variantId]
  );
  const meals = selectedVariant?.meals ?? [];
  const [mealId, setMealId] = useState(meals[0]?.id ?? '');
  const [grams, setGrams] = useState(food.defaultGrams ?? 100);
  const [assignedTo, setAssignedTo] = useState('');

  // Se cambia la variante scelta (o le varianti disponibili), riallinea il pasto.
  useEffect(() => {
    if (!meals.some((meal) => meal.id === mealId)) {
      setMealId(meals[0]?.id ?? '');
    }
  }, [meals, mealId]);

  // Il messaggio di conferma sparisce da solo dopo un paio di secondi.
  useEffect(() => {
    if (!assignedTo) return undefined;
    const timeoutId = window.setTimeout(() => setAssignedTo(''), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [assignedTo]);

  function assign() {
    if (!variantId || !mealId) return;
    dispatch({
      type: 'ASSIGN_BARCODE_FOOD',
      payload: { variantId, mealId, food, grams: toNumber(grams, 100) }
    });
    const mealName = meals.find((meal) => meal.id === mealId)?.name ?? 'pasto';
    setAssignedTo(`${selectedVariant?.name} · ${mealName}`);
  }

  function remove() {
    dispatch({ type: 'DELETE_BARCODE_FOOD', payload: { key: barcodeFoodKey(food) } });
  }

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-3 lg:p-4">
      <div className="flex gap-3">
        {food.image ? (
          <img
            src={food.image}
            alt=""
            className="h-14 w-14 flex-shrink-0 rounded-xl border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 text-[10px] font-semibold text-slate-400">
            no img
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-bold text-slate-900">{food.name}</span>
            {food.brand ? <span className="text-sm text-slate-500">· {food.brand}</span> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              {food.barcode || 'barcode n/d'}
            </span>
            {food.quantity ? <span className="text-[11px] text-slate-400">{food.quantity}</span> : null}
          </div>
          <div className="mt-2">
            <MacroPer100g macrosPer100g={food.macrosPer100g} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Variante
          <select
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-400 focus:outline-none"
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Pasto
          <select
            value={mealId}
            onChange={(event) => setMealId(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-400 focus:outline-none"
          >
            {meals.map((meal) => (
              <option key={meal.id} value={meal.id}>
                {meal.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex w-24 flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Grammi
          <input
            type="number"
            min="0"
            value={grams}
            onChange={(event) => setGrams(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-400 focus:outline-none"
          />
        </label>

        <div className="flex gap-2">
          <button onClick={assign} disabled={!mealId} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40">
            Assegna
          </button>
          <button onClick={remove} className="btn-danger">Rimuovi</button>
        </div>
      </div>

      {assignedTo ? (
        <p className="mt-2 text-sm font-semibold text-emerald-600">Aggiunto a {assignedTo}</p>
      ) : null}
    </li>
  );
}

export default function BarcodeFoodMenu({ barcodeFoods = [], variants = [], dispatch }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            Alimenti da barcode
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-sm font-bold text-indigo-700">
              {barcodeFoods.length}
            </span>
          </h2>
          <p className="text-sm text-slate-500">
            I prodotti trovati tramite codice a barre. Assegnali a una variante e a un pasto.
          </p>
        </div>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        barcodeFoods.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Ancora nessun alimento. Cerca un prodotto per codice a barre (o scansionane uno dal telefono):
            comparirà qui, pronto da assegnare a una variante.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {barcodeFoods.map((food) => (
              <BarcodeFoodRow key={barcodeFoodKey(food)} food={food} variants={variants} dispatch={dispatch} />
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
