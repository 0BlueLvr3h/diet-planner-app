import { uid } from './id';
import { toNumber } from './macros';

// Un valore macro finito oppure null (JSON-safe) quando il dato manca da Open Food Facts.
function macroValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Chiave di deduplica: il barcode se presente, altrimenti l'id del prodotto.
export function barcodeFoodKey(food) {
  const barcode = typeof food?.barcode === 'string' ? food.barcode.trim() : '';
  return barcode || food?.id || '';
}

// Porta un prodotto (tipicamente normalizzato da Open Food Facts) alla forma
// stabile del catalogo. Compatibile con makeFoodItem del reducer.
export function normalizeBarcodeFood(product) {
  const barcode = typeof product?.barcode === 'string' ? product.barcode.trim() : '';

  return {
    id: product?.id || (barcode ? `off-${barcode}` : uid('barcode')),
    name: product?.name || 'Prodotto senza nome',
    brand: product?.brand || '',
    barcode,
    quantity: product?.quantity || '',
    image: product?.image || '',
    source: product?.source || 'open-food-facts',
    defaultGrams: toNumber(product?.defaultGrams, 100),
    macrosPer100g: {
      kcal: macroValue(product?.macrosPer100g?.kcal),
      protein: macroValue(product?.macrosPer100g?.protein),
      carbs: macroValue(product?.macrosPer100g?.carbs),
      fat: macroValue(product?.macrosPer100g?.fat)
    },
    missingMacros: Array.isArray(product?.missingMacros) ? product.missingMacros : [],
    hasIncompleteMacros: Boolean(product?.hasIncompleteMacros),
    addedAt: product?.addedAt || new Date().toISOString()
  };
}

export function normalizeBarcodeFoods(list = []) {
  return (Array.isArray(list) ? list : []).map(normalizeBarcodeFood);
}

// Inserisce o aggiorna un prodotto nel catalogo, deduplicando per barcode/id.
// Il prodotto già presente viene aggiornato ma conserva il suo addedAt originale.
export function upsertBarcodeFood(list = [], product) {
  const normalized = normalizeBarcodeFood(product);
  const key = barcodeFoodKey(normalized);
  if (!key) return list;

  const exists = list.some((item) => barcodeFoodKey(item) === key);

  if (exists) {
    return list.map((item) =>
      barcodeFoodKey(item) === key ? { ...normalized, addedAt: item.addedAt || normalized.addedAt } : item
    );
  }

  return [normalized, ...list];
}
