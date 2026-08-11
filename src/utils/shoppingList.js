import { toNumber } from './macros';

// Chiave di raggruppamento: due voci sono "lo stesso alimento" se hanno lo stesso
// barcode. Per gli alimenti a mano (senza barcode) uso il productId; come ultima
// rete, il nome. NB: prodotti con barcode diversi restano righe separate anche se
// il nome è simile (es. i due "Petto di tacchino") — ed è corretto, sono prodotti
// diversi con confezioni/valori diversi.
function groupKey(food) {
  const barcode = (food?.barcode || '').trim();
  if (barcode) return `b:${barcode}`;
  if (food?.productId) return `p:${food.productId}`;
  return `n:${(food?.name || '').trim().toLowerCase()}`;
}

// Costruisce le righe della lista dai giorni assegnati.
// dayKeys: array tipo ['mon','tue',...]; se vuoto/omesso, usa tutti i giorni assegnati.
export function buildShoppingRows(state, dayKeys) {
  const assignments = state?.weekAssignments || {};
  const variantsById = new Map((state?.variants || []).map((v) => [v.id, v]));

  const days = dayKeys && dayKeys.length ? dayKeys : Object.keys(assignments);
  const variantIds = [...new Set(days.map((d) => assignments[d]).filter(Boolean))];

  const grouped = new Map(); // key -> { name, grams, kcalPer100g }
  for (const vid of variantIds) {
    const variant = variantsById.get(vid);
    if (!variant) continue;
    for (const meal of variant.meals || []) {
      for (const food of meal.foods || []) {
        const key = groupKey(food);
        if (!grouped.has(key)) {
          grouped.set(key, {
            name: food.name || 'Senza nome',
            grams: 0,
            kcalPer100g: food?.macrosPer100g?.kcal
          });
        }
        grouped.get(key).grams += toNumber(food.grams, 0);
      }
    }
  }

  return [...grouped.values()]
    .map((r) => {
      const kcal100 = Number(r.kcalPer100g);
      const hasKcal = Number.isFinite(kcal100);
      return {
        name: r.name,
        grams: Math.round(r.grams),
        kcalTot: hasKcal ? Math.round((kcal100 * r.grams) / 100) : null,
        kcalPer100g: hasKcal ? Math.round(kcal100) : null
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

// Formatta le righe nel messaggio Telegram.
export function formatShoppingMessage(rows) {
  if (!rows || rows.length === 0) {
    return '🛒 Lista spesa\n\n(nessun alimento: assegna qualche variante ai giorni della settimana)';
  }
  let totKcal = 0;
  const lines = rows.map((r) => {
    if (r.kcalTot != null) totKcal += r.kcalTot;
    const tot = r.kcalTot != null ? `${r.kcalTot} kcal` : '— kcal';
    const rif = r.kcalPer100g != null ? ` · rif. ${r.kcalPer100g} kcal/100g` : '';
    return `• ${r.name}\n  ${r.grams}g · ${tot}${rif}`;
  });
  return [
    '🛒 Lista spesa — settimana',
    'Generata da Diet Planner',
    '',
    lines.join('\n'),
    '',
    `Totale settimana: ${totKcal} kcal · ${rows.length} alimenti`
  ].join('\n');
}
