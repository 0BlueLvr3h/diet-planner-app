import { MACRO_KEYS } from '../constants';

export function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function roundMacro(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(toNumber(value) * factor) / factor;
}

export function emptyMacros() {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

export function calculateFoodMacros(food) {
  const grams = toNumber(food?.grams, 0);
  const macrosPer100g = food?.macrosPer100g ?? {};

  return MACRO_KEYS.reduce((acc, key) => {
    acc[key] = roundMacro((toNumber(macrosPer100g[key], 0) * grams) / 100);
    return acc;
  }, emptyMacros());
}

export function calculateMealTotals(meal) {
  return (meal?.foods ?? []).reduce((totals, food) => {
    const foodTotals = calculateFoodMacros(food);
    MACRO_KEYS.forEach((key) => {
      totals[key] = roundMacro(totals[key] + foodTotals[key]);
    });
    return totals;
  }, emptyMacros());
}

export function calculateVariantTotals(variant) {
  return (variant?.meals ?? []).reduce((totals, meal) => {
    const mealTotals = calculateMealTotals(meal);
    MACRO_KEYS.forEach((key) => {
      totals[key] = roundMacro(totals[key] + mealTotals[key]);
    });
    return totals;
  }, emptyMacros());
}

// Diff = totale variante - target. Esempio: 1880 - 1900 = -20 kcal.
export function calculateDiff(target, totals) {
  return MACRO_KEYS.reduce((diff, key) => {
    diff[key] = roundMacro(toNumber(totals?.[key], 0) - toNumber(target?.[key], 0));
    return diff;
  }, emptyMacros());
}

export function isDiffInsideTolerance(diff, tolerance) {
  return MACRO_KEYS.every((key) => Math.abs(toNumber(diff?.[key], 0)) <= toNumber(tolerance?.[key], 0));
}

export function getMacroStatus(value, tolerance) {
  const absolute = Math.abs(toNumber(value, 0));
  const limit = toNumber(tolerance, 0);

  if (absolute <= limit) return 'ok';
  if (absolute <= limit * 2) return 'warning';
  return 'danger';
}

export function getMissingMacroKeys(food) {
  const macros = food?.macrosPer100g ?? {};
  return MACRO_KEYS.filter((key) => !Number.isFinite(Number(macros[key])));
}

function messageForDelta(key, delta) {
  const abs = roundMacro(Math.abs(delta));

  if (key === 'kcal') {
    return delta < 0 ? `Hai tolto ${abs} kcal` : `Hai aggiunto ${abs} kcal`;
  }

  const labels = {
    protein: 'proteine',
    carbs: 'carboidrati',
    fat: 'grassi'
  };

  if (key === 'protein' && delta < 0) return `Hai ridotto ${abs}g di ${labels[key]}`;
  return delta < 0 ? `Hai tolto ${abs}g di ${labels[key]}` : `Hai aggiunto ${abs}g di ${labels[key]}`;
}

// Mostra warning solo se il diff globale è fuori tolleranza e il delta locale va nella stessa direzione dello sbilanciamento.
export function getFoodContextWarnings(food, globalDiff, tolerance) {
  if (!food?.touched) return [];
  if (isDiffInsideTolerance(globalDiff, tolerance)) return [];

  const current = calculateFoodMacros(food);
  const baseline = food?.baselineMacrosSnapshot ?? current;
  const warnings = [];

  MACRO_KEYS.forEach((key) => {
    const diff = toNumber(globalDiff?.[key], 0);
    const limit = toNumber(tolerance?.[key], 0);
    const delta = roundMacro(toNumber(current?.[key], 0) - toNumber(baseline?.[key], 0));
    const minimumVisibleDelta = key === 'kcal' ? 5 : 0.5;

    if (Math.abs(diff) <= limit) return;
    if (Math.abs(delta) < minimumVisibleDelta) return;
    if (Math.sign(delta) !== Math.sign(diff)) return;

    warnings.push({ key, delta, message: messageForDelta(key, delta) });
  });

  return warnings;
}

export function formatSigned(value, unit = '') {
  const rounded = roundMacro(value);
  if (rounded === 0) return `0${unit ? ` ${unit}` : ''}`;
  return `${rounded > 0 ? '+' : ''}${rounded}${unit ? ` ${unit}` : ''}`;
}
