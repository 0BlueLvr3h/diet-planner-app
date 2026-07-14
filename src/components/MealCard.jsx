import { MACRO_KEYS } from '../constants';
import FoodCard from './FoodCard';
import MacroBadge from './MacroBadge';
import { calculateMealTotals } from '../utils/macros';

export default function MealCard({
  meal,
  meals = [],
  dispatch,
  onAddFood,
  onSwap,
  onFoodDragStart,
  onFoodDragEnd,
  onMealDragOver,
  onMealDrop,
  onMealDragLeave,
  isDropTarget = false,
  isDraggingFromThisMeal = false
}) {
  const totals = calculateMealTotals(meal);
  const count = meal.foods.length;

  return (
    <section
      onDragOver={(event) => onMealDragOver(event, meal.id)}
      onDragLeave={(event) => onMealDragLeave(event, meal.id)}
      onDrop={(event) => onMealDrop(event, meal.id)}
      className={`rounded-3xl border p-4 shadow-soft transition lg:p-5 ${
        isDropTarget
          ? 'border-indigo-300 bg-indigo-50 ring-4 ring-indigo-100'
          : isDraggingFromThisMeal
            ? 'border-slate-200 bg-slate-50 opacity-95'
            : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black text-slate-950">{meal.name}</h2>
            <p className="text-sm text-slate-500">
              {count} aliment{count === 1 ? 'o' : 'i'}
            </p>
          </div>
          <button onClick={() => onAddFood(meal.id)} className="btn-primary shrink-0">
            Aggiungi alimento
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MACRO_KEYS.map((key) => (
            <MacroBadge key={key} macroKey={key} value={totals[key]} compact />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {count === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Nessun alimento in questo pasto. Usa “Aggiungi alimento”, oppure spostane uno da un altro
            pasto con il menu “Sposta”.
          </div>
        ) : (
          meal.foods.map((food) => (
            <FoodCard
              key={food.id}
              food={food}
              mealId={meal.id}
              meals={meals}
              dispatch={dispatch}
              onSwap={onSwap}
              onDragStart={onFoodDragStart}
              onDragEnd={onFoodDragEnd}
            />
          ))
        )}
      </div>
    </section>
  );
}