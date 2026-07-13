import { MACRO_KEYS } from '../constants';
import FoodCard from './FoodCard';
import MacroBadge from './MacroBadge';
import { calculateMealTotals } from '../utils/macros';

export default function MealCard({
  meal,
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
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">{meal.name}</h2>
          <p className="text-sm text-slate-500">
            {meal.foods.length} alimenti nel blocco · trascina qui una card per spostarla
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {MACRO_KEYS.map((key) => (
            <MacroBadge key={key} macroKey={key} value={totals[key]} compact />
          ))}
          <button onClick={() => onAddFood(meal.id)} className="btn-primary ml-0 xl:ml-2">
            Aggiungi alimento
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {meal.foods.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            Nessun alimento in questo pasto. Usa “Aggiungi alimento” o trascina qui una card da un altro pasto.
          </div>
        ) : (
          meal.foods.map((food) => (
            <FoodCard
              key={food.id}
              food={food}
              mealId={meal.id}
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
