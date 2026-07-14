import { DEFAULT_MEALS, DEFAULT_TARGET, DEFAULT_TOLERANCE } from '../constants';
import { uid } from '../utils/id';
import { calculateFoodMacros, emptyMacros, toNumber } from '../utils/macros';
import { normalizeCustomFoodProduct } from '../utils/customFoods';
import { barcodeFoodKey, normalizeBarcodeFoods, upsertBarcodeFood } from '../utils/barcodeFoods';
import { loadStateFromStorage } from '../utils/storage';

function makeMeal(name, foods = []) {
  return {
    id: uid('meal'),
    name,
    foods
  };
}

function makeFoodItem(product, grams = 100, options = {}) {
  const food = {
    id: options.id ?? uid('food'),
    productId: product.id,
    name: product.name || 'Alimento senza nome',
    brand: product.brand || '',
    barcode: product.barcode || '',
    quantity: product.quantity || '',
    image: product.image || '',
    source: product.source || 'manual',
    grams: toNumber(grams, 100),
    macrosPer100g: {
      kcal: product.macrosPer100g?.kcal,
      protein: product.macrosPer100g?.protein,
      carbs: product.macrosPer100g?.carbs,
      fat: product.macrosPer100g?.fat
    },
    touched: options.touched ?? false,
    missingMacros: product.missingMacros ?? [],
    hasIncompleteMacros: product.hasIncompleteMacros ?? false,
    replacedFoodName: options.replacedFoodName ?? ''
  };

  const currentMacros = calculateFoodMacros(food);

  return {
    ...food,
    baselineMacrosSnapshot:
      options.baselineMacrosSnapshot ?? (food.touched ? emptyMacros() : currentMacros)
  };
}

function createEmptyVariant(name = 'Nuova variante') {
  return {
    id: uid('variant'),
    name,
    meals: DEFAULT_MEALS.map((meal) => makeMeal(meal))
  };
}

function resetVariantBaselines(variant, name) {
  return {
    ...variant,
    id: uid('variant'),
    name,
    meals: variant.meals.map((meal) => ({
      ...meal,
      id: uid('meal'),
      foods: meal.foods.map((food) => {
        const cloned = { ...food, id: uid('food'), touched: false, replacedFoodName: '' };
        return {
          ...cloned,
          baselineMacrosSnapshot: calculateFoodMacros(cloned)
        };
      })
    }))
  };
}

function normalizeCustomFoods(customFoods = []) {
  return customFoods.map(normalizeCustomFoodProduct);
}

function upsertCustomFood(customFoods, food) {
  const normalized = normalizeCustomFoodProduct(food);
  const exists = customFoods.some((item) => item.id === normalized.id);

  if (exists) {
    return customFoods.map((item) =>
      item.id === normalized.id
        ? { ...normalized, createdAt: item.createdAt || normalized.createdAt, updatedAt: new Date().toISOString() }
        : item
    );
  }

  return [normalized, ...customFoods];
}

export function createDefaultState() {
  const seedVariant = createEmptyVariant('Dieta Base');
  return {
    target: DEFAULT_TARGET,
    tolerance: DEFAULT_TOLERANCE,
    variants: [seedVariant],
    activeVariantId: seedVariant.id,
    customFoods: [],
    barcodeFoods: [],
    weekAssignments: {}
  };
}

export function normalizeAppState(candidate) {
  if (!candidate?.variants?.length) return createDefaultState();

  const activeVariantId = candidate.variants.some((variant) => variant.id === candidate.activeVariantId)
    ? candidate.activeVariantId
    : candidate.variants[0].id;

  return {
    target: { ...DEFAULT_TARGET, ...candidate.target },
    tolerance: { ...DEFAULT_TOLERANCE, ...candidate.tolerance },
    variants: candidate.variants,
    activeVariantId,
    customFoods: normalizeCustomFoods(candidate.customFoods ?? []),
    barcodeFoods: normalizeBarcodeFoods(candidate.barcodeFoods ?? []),
    weekAssignments: candidate.weekAssignments && typeof candidate.weekAssignments === 'object' ? candidate.weekAssignments : {}
  };
}

export function createInitialState() {
  const persisted = loadStateFromStorage();
  return persisted?.variants?.length ? normalizeAppState(persisted) : createDefaultState();
}

function updateActiveVariant(state, updater) {
  return {
    ...state,
    variants: state.variants.map((variant) =>
      variant.id === state.activeVariantId ? updater(variant) : variant
    )
  };
}

function updateMeal(variant, mealId, updater) {
  return {
    ...variant,
    meals: variant.meals.map((meal) => (meal.id === mealId ? updater(meal) : meal))
  };
}

function updateFood(meal, foodId, updater) {
  return {
    ...meal,
    foods: meal.foods.map((food) => (food.id === foodId ? updater(food) : food))
  };
}

export function dietReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE_STATE': {
      return normalizeAppState(action.payload);
    }

    case 'RESET_STATE': {
      return createDefaultState();
    }

    case 'SET_DAY_VARIANT': {
      const { day, variantId } = action.payload;
      return {
        ...state,
        weekAssignments: { ...(state.weekAssignments ?? {}), [day]: variantId || null }
      };
    }

    case 'SET_TARGET': {
      const { key, value } = action.payload;
      return {
        ...state,
        target: {
          ...state.target,
          [key]: toNumber(value, 0)
        }
      };
    }

    case 'SET_TOLERANCE': {
      const { key, value } = action.payload;
      return {
        ...state,
        tolerance: {
          ...state.tolerance,
          [key]: toNumber(value, 0)
        }
      };
    }

    case 'RENAME_VARIANT': {
      const { variantId, name } = action.payload;
      const targetId = variantId ?? state.activeVariantId;
      const trimmed = String(name ?? '').trim();
      if (!trimmed) return state;

      return {
        ...state,
        variants: state.variants.map((variant) =>
          variant.id === targetId ? { ...variant, name: trimmed } : variant
        )
      };
    }

    case 'SET_ACTIVE_VARIANT':
      return { ...state, activeVariantId: action.payload.variantId };

    case 'ADD_VARIANT': {
      const newVariant = createEmptyVariant(action.payload?.name || `Nuova variante ${state.variants.length + 1}`);
      return {
        ...state,
        variants: [...state.variants, newVariant],
        activeVariantId: newVariant.id
      };
    }

    case 'DUPLICATE_VARIANT': {
      const activeVariant = state.variants.find((variant) => variant.id === state.activeVariantId);
      if (!activeVariant) return state;

      const duplicated = resetVariantBaselines(
        activeVariant,
        action.payload?.name || `${activeVariant.name} copia`
      );

      return {
        ...state,
        variants: [...state.variants, duplicated],
        activeVariantId: duplicated.id
      };
    }

    case 'DELETE_VARIANT': {
      if (state.variants.length <= 1) return state;
      const nextVariants = state.variants.filter((variant) => variant.id !== state.activeVariantId);
      return {
        ...state,
        variants: nextVariants,
        activeVariantId: nextVariants[0].id
      };
    }

    case 'ADD_MEAL': {
      return updateActiveVariant(state, (variant) => ({
        ...variant,
        meals: [...variant.meals, makeMeal(action.payload?.name || 'Nuovo pasto')]
      }));
    }

    case 'ADD_FOOD': {
      const { mealId, food } = action.payload;
      const grams = action.payload.grams ?? food.defaultGrams ?? 100;

      return updateActiveVariant(state, (variant) =>
        updateMeal(variant, mealId, (meal) => ({
          ...meal,
          foods: [...meal.foods, makeFoodItem(food, grams, { touched: true, baselineMacrosSnapshot: emptyMacros() })]
        }))
      );
    }

    case 'UPDATE_FOOD_GRAMS': {
      const { mealId, foodId, grams } = action.payload;
      return updateActiveVariant(state, (variant) =>
        updateMeal(variant, mealId, (meal) =>
          updateFood(meal, foodId, (food) => {
            const baseline = food.touched ? food.baselineMacrosSnapshot : calculateFoodMacros(food);
            return {
              ...food,
              grams: toNumber(grams, 0),
              touched: true,
              baselineMacrosSnapshot: baseline
            };
          })
        )
      );
    }

    case 'SWAP_FOOD': {
      const { mealId, foodId, food: selectedFood } = action.payload;
      return updateActiveVariant(state, (variant) =>
        updateMeal(variant, mealId, (meal) =>
          updateFood(meal, foodId, (oldFood) => {
            const baseline = oldFood.touched ? oldFood.baselineMacrosSnapshot : calculateFoodMacros(oldFood);
            return makeFoodItem(selectedFood, oldFood.grams, {
              id: oldFood.id,
              touched: true,
              baselineMacrosSnapshot: baseline,
              replacedFoodName: oldFood.name
            });
          })
        )
      );
    }

    case 'REMOVE_FOOD': {
      const { mealId, foodId } = action.payload;
      return updateActiveVariant(state, (variant) =>
        updateMeal(variant, mealId, (meal) => ({
          ...meal,
          foods: meal.foods.filter((food) => food.id !== foodId)
        }))
      );
    }


    case 'MOVE_FOOD': {
      const { sourceMealId, targetMealId, foodId } = action.payload;
      if (!sourceMealId || !targetMealId || !foodId || sourceMealId === targetMealId) return state;

      return updateActiveVariant(state, (variant) => {
        const sourceMeal = variant.meals.find((meal) => meal.id === sourceMealId);
        const targetMeal = variant.meals.find((meal) => meal.id === targetMealId);
        const movedFood = sourceMeal?.foods.find((food) => food.id === foodId);

        if (!sourceMeal || !targetMeal || !movedFood) return variant;

        return {
          ...variant,
          meals: variant.meals.map((meal) => {
            if (meal.id === sourceMealId) {
              return {
                ...meal,
                foods: meal.foods.filter((food) => food.id !== foodId)
              };
            }

            if (meal.id === targetMealId) {
              return {
                ...meal,
                foods: [...meal.foods, movedFood]
              };
            }

            return meal;
          })
        };
      });
    }

    case 'UPSERT_CUSTOM_FOOD': {
      return {
        ...state,
        customFoods: upsertCustomFood(state.customFoods ?? [], action.payload.food)
      };
    }

    case 'DELETE_CUSTOM_FOOD': {
      return {
        ...state,
        customFoods: (state.customFoods ?? []).filter((food) => food.id !== action.payload.foodId)
      };
    }

    case 'UPSERT_BARCODE_FOOD': {
      return {
        ...state,
        barcodeFoods: upsertBarcodeFood(state.barcodeFoods ?? [], action.payload.food)
      };
    }

    case 'DELETE_BARCODE_FOOD': {
      const { key } = action.payload;
      return {
        ...state,
        barcodeFoods: (state.barcodeFoods ?? []).filter((food) => barcodeFoodKey(food) !== key)
      };
    }

    // Assegna un alimento del catalogo barcode a una variante specifica (anche non attiva).
    case 'ASSIGN_BARCODE_FOOD': {
      const { variantId, mealId, food } = action.payload;
      const grams = action.payload.grams ?? food?.defaultGrams ?? 100;
      if (!variantId || !mealId || !food) return state;

      return {
        ...state,
        variants: state.variants.map((variant) =>
          variant.id === variantId
            ? updateMeal(variant, mealId, (meal) => ({
                ...meal,
                foods: [
                  ...meal.foods,
                  makeFoodItem(food, grams, { touched: true, baselineMacrosSnapshot: emptyMacros() })
                ]
              }))
            : variant
        )
      };
    }

    default:
      return state;
  }
}