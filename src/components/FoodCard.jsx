import { useState } from 'react';
import { MACRO_KEYS } from '../constants';
import MacroBadge from './MacroBadge';
import WarningMessage from './WarningMessage';
import { calculateFoodMacros } from '../utils/macros';

export default function FoodCard({ food, mealId, meals = [], dispatch, onSwap, onDragStart, onDragEnd }) {
  const [moveOpen, setMoveOpen] = useState(false);
  const calculated = calculateFoodMacros(food);
  const missingMacros = food.hasIncompleteMacros ? food.missingMacros ?? [] : [];
  const otherMeals = meals.filter((meal) => meal.id !== mealId);

  function handleDragStart(event) {
    const payload = { mealId, foodId: food.id };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', `${food.name} (${mealId})`);
    onDragStart?.(payload);
  }

  // Alternativa al trascinamento: scegli il pasto da un menu. Molto piu' comodo
  // quando il pasto di destinazione e' fuori schermo (cioe' quasi sempre).
  function moveTo(targetMealId) {
    setMoveOpen(false);
    dispatch({
      type: 'MOVE_FOOD',
      payload: { sourceMealId: mealId, targetMealId, foodId: food.id }
    });
  }

  return (
    <article
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex gap-3 md:w-72">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {food.image ? (
              <img src={food.image} alt={food.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl">🍽️</div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-slate-950">{food.name}</h3>
            <p className="truncate text-sm text-slate-500">{food.brand || 'Brand non disponibile'}</p>
            {food.replacedFoodName && (
              <p className="mt-1 truncate text-xs font-semibold text-indigo-600">
                Swap da: {food.replacedFoodName}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
              {food.source === 'open-food-facts' && (
                <span className="max-w-full truncate rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                  OFF · {food.barcode || 'barcode n/d'}
                </span>
              )}
              {food.source === 'manual' && (
                <span className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-fuchsia-700">Creato da te</span>
              )}
              {food.source === 'mock' && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">Dato locale legacy</span>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 lg:max-w-xs">
              <span className="text-sm font-bold text-slate-600">Grammi</span>
              <input
                type="number"
                min="0"
                step="1"
                value={food.grams}
                onChange={(event) =>
                  dispatch({
                    type: 'UPDATE_FOOD_GRAMS',
                    payload: { mealId, foodId: food.id, grams: event.target.value }
                  })
                }
                onDragStart={(event) => event.stopPropagation()}
                className="w-full min-w-0 bg-transparent text-right text-lg font-black text-slate-950 outline-none"
              />
              <span className="text-sm text-slate-500">g</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => onSwap(mealId, food.id)} className="btn-secondary">Swap</button>

              {otherMeals.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMoveOpen((value) => !value)}
                    aria-expanded={moveOpen}
                    className="btn-secondary"
                  >
                    Sposta
                  </button>

                  {moveOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setMoveOpen(false)} />
                      <div className="absolute left-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                          Sposta in…
                        </div>
                        {otherMeals.map((meal) => (
                          <button
                            key={meal.id}
                            type="button"
                            onClick={() => moveTo(meal.id)}
                            className="w-full truncate rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            {meal.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={() => dispatch({ type: 'REMOVE_FOOD', payload: { mealId, foodId: food.id } })}
                className="btn-danger"
              >
                Rimuovi
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MACRO_KEYS.map((key) => (
              <MacroBadge key={key} macroKey={key} value={calculated[key]} compact />
            ))}
          </div>

          <WarningMessage incompleteMacros={missingMacros} />
        </div>
      </div>
    </article>
  );
}