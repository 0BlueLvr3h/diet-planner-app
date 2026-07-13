import { MACRO_KEYS } from '../constants';
import { uid } from './id';
import { toNumber } from './macros';

export const EMPTY_CUSTOM_FOOD_FORM = {
  name: '',
  brand: '',
  barcode: '',
  quantity: '',
  grams: 100,
  kcal: '',
  protein: '',
  carbs: '',
  fat: ''
};

export function makeEmptyCustomFoodForm() {
  return { ...EMPTY_CUSTOM_FOOD_FORM };
}

function normalizeMacroValue(value) {
  return toNumber(value, 0);
}

export function validateCustomFoodForm(form) {
  const errors = [];

  if (!form.name?.trim()) {
    errors.push('Inserisci il nome alimento.');
  }

  if (toNumber(form.grams, 0) <= 0) {
    errors.push('Inserisci grammi iniziali maggiori di zero.');
  }

  MACRO_KEYS.forEach((key) => {
    const value = Number(form[key]);
    if (!Number.isFinite(value) || value < 0) {
      errors.push(`Inserisci un valore valido per ${key} per 100g.`);
    }
  });

  return errors;
}

export function createCustomFoodFromForm(form) {
  const now = new Date().toISOString();

  return {
    id: uid('custom'),
    name: form.name.trim(),
    brand: form.brand.trim() || 'Custom',
    barcode: form.barcode.trim(),
    quantity: form.quantity.trim() || 'custom',
    image: '',
    source: 'manual',
    defaultGrams: toNumber(form.grams, 100),
    macrosPer100g: {
      kcal: normalizeMacroValue(form.kcal),
      protein: normalizeMacroValue(form.protein),
      carbs: normalizeMacroValue(form.carbs),
      fat: normalizeMacroValue(form.fat)
    },
    missingMacros: [],
    hasIncompleteMacros: false,
    selectable: true,
    createdAt: now,
    updatedAt: now
  };
}

export function normalizeCustomFoodProduct(food) {
  const now = new Date().toISOString();

  return {
    id: food?.id || uid('custom'),
    name: food?.name || 'Alimento custom',
    brand: food?.brand || 'Custom',
    barcode: food?.barcode || '',
    quantity: food?.quantity || 'custom',
    image: food?.image || '',
    source: 'manual',
    defaultGrams: toNumber(food?.defaultGrams ?? food?.grams, 100),
    macrosPer100g: {
      kcal: normalizeMacroValue(food?.macrosPer100g?.kcal),
      protein: normalizeMacroValue(food?.macrosPer100g?.protein),
      carbs: normalizeMacroValue(food?.macrosPer100g?.carbs),
      fat: normalizeMacroValue(food?.macrosPer100g?.fat)
    },
    missingMacros: [],
    hasIncompleteMacros: false,
    selectable: true,
    createdAt: food?.createdAt || now,
    updatedAt: food?.updatedAt || now
  };
}

export function matchesFoodQuery(food, query = '') {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [food.name, food.brand, food.barcode, food.quantity]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

export function searchCustomFoods(customFoods = [], query = '') {
  return customFoods.map(normalizeCustomFoodProduct).filter((food) => matchesFoodQuery(food, query));
}

export function findCustomFoodByBarcode(customFoods = [], barcode = '') {
  const normalizedBarcode = barcode.trim();
  if (!normalizedBarcode) return null;

  return customFoods
    .map(normalizeCustomFoodProduct)
    .find((food) => food.barcode && food.barcode === normalizedBarcode) ?? null;
}
