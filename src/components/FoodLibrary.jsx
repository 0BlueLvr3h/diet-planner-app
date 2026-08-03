import { useMemo, useState } from 'react';
import { MACRO_KEYS, MACRO_LABELS, MACRO_UNITS, SODIUM_LIMIT_MG } from '../constants';
import { roundMacro, sodiumMgPer100g } from '../utils/macros';
import { normalizeBarcodeFoods, barcodeFoodKey } from '../utils/barcodeFoods';
import { normalizeCustomFoodProduct } from '../utils/customFoods';

// Colonne ordinabili: i 4 macro + sodio. Tutti i valori sono "per 100 g",
// cosi' il confronto tra alimenti e' omogeneo (indipendente dai grammi).
const SORT_COLUMNS = [
  { id: 'name', label: 'Nome' },
  ...MACRO_KEYS.map((key) => ({ id: key, label: MACRO_LABELS[key] })),
  { id: 'sodium', label: 'Sodio' }
];

function valueFor(food, columnId) {
  if (columnId === 'name') return (food.name || '').toLowerCase();
  if (columnId === 'sodium') {
    const mg = sodiumMgPer100g(food.macrosPer100g);
    return mg; // null se n/d
  }
  const v = Number(food.macrosPer100g?.[columnId]);
  return Number.isFinite(v) ? v : null;
}

// Ordinamento che spinge sempre i "n/d" in fondo, in entrambe le direzioni:
// quando cerco "quello con meno sodio" non voglio che gli n/d vincano come se fossero 0.
function compareBy(columnId, dir) {
  return (a, b) => {
    const va = valueFor(a, columnId);
    const vb = valueFor(b, columnId);
    if (columnId === 'name') return dir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
    if (va == null && vb == null) return 0;
    if (va == null) return 1; // n/d sempre in fondo, in entrambe le direzioni
    if (vb == null) return -1;
    return dir === 'asc' ? va - vb : vb - va;
  };
}

export default function FoodLibrary({ customFoods = [], barcodeFoods = [], dispatch }) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('sodium');
  const [sortDir, setSortDir] = useState('asc');
  const [typeFilter, setTypeFilter] = useState('all'); // all | barcode | custom
  const [onlyNoSodium, setOnlyNoSodium] = useState(false);
  const [editing, setEditing] = useState(null); // key dell'alimento in modifica sodio
  const [saltInput, setSaltInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Lista unificata: barcode + custom, con un tag 'kind' per sapere che azioni offrire.
  const all = useMemo(() => {
    const bc = normalizeBarcodeFoods(barcodeFoods).map((f) => ({ ...f, kind: 'barcode', key: `b:${barcodeFoodKey(f)}` }));
    const cu = customFoods.map(normalizeCustomFoodProduct).map((f) => ({ ...f, kind: 'custom', key: `c:${f.id}` }));
    return [...bc, ...cu];
  }, [barcodeFoods, customFoods]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = all;
    if (typeFilter !== 'all') list = list.filter((f) => f.kind === typeFilter);
    if (onlyNoSodium) list = list.filter((f) => sodiumMgPer100g(f.macrosPer100g) == null);
    if (q) list = list.filter((f) => `${f.name} ${f.brand} ${f.barcode}`.toLowerCase().includes(q));
    return [...list].sort(compareBy(sortBy, sortDir));
  }, [all, typeFilter, onlyNoSodium, query, sortBy, sortDir]);

  const noSodiumCount = useMemo(
    () => all.filter((f) => sodiumMgPer100g(f.macrosPer100g) == null).length,
    [all]
  );

  function toggleSort(columnId) {
    if (sortBy === columnId) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnId);
      setSortDir(columnId === 'name' ? 'asc' : 'asc');
    }
  }

  function openSodium(food) {
    const cur = Number(food.macrosPer100g?.sodium);
    setSaltInput(Number.isFinite(cur) && cur > 0 ? String(+(cur * 2.5).toFixed(3)) : '');
    setEditing(food.key);
  }

  function saveSodium(food) {
    const salt = Number(String(saltInput).replace(',', '.'));
    if (!Number.isFinite(salt) || salt < 0) return;
    const sodiumG = salt / 2.5;
    if (food.kind === 'barcode') {
      dispatch({ type: 'SET_BARCODE_FOOD_SODIUM', payload: { key: barcodeFoodKey(food), sodiumG } });
    } else {
      // per i custom ri-salvo l'alimento con il sodio aggiornato
      dispatch({
        type: 'UPSERT_CUSTOM_FOOD',
        payload: { food: { ...food, macrosPer100g: { ...food.macrosPer100g, sodium: sodiumG } } }
      });
    }
    setEditing(null);
  }

  function remove(food) {
    if (food.kind === 'barcode') {
      dispatch({ type: 'DELETE_BARCODE_FOOD', payload: { key: barcodeFoodKey(food) } });
    } else {
      dispatch({ type: 'DELETE_CUSTOM_FOOD', payload: { foodId: food.id } });
    }
    setConfirmDelete(null);
  }

  const sortArrow = (columnId) => (sortBy === columnId ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
        <h2 className="text-lg font-black text-slate-950">Tutti gli alimenti</h2>
        <p className="mt-1 text-sm text-slate-500">
          La tua libreria completa · {all.length} alimenti. Ordina, filtra, correggi il sodio o elimina i doppioni.
        </p>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca per nome, brand o barcode…"
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none ring-indigo-200 focus:ring-4"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* filtro tipo */}
          <div className="inline-flex rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
            {[
              { id: 'all', label: 'Tutti' },
              { id: 'barcode', label: 'Barcode' },
              { id: 'custom', label: 'A mano' }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTypeFilter(opt.id)}
                className={`rounded-xl px-3 py-1.5 transition ${
                  typeFilter === opt.id ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* filtro solo n/d */}
          <button
            type="button"
            onClick={() => setOnlyNoSodium((v) => !v)}
            className={`rounded-2xl border px-3 py-1.5 text-sm font-bold transition ${
              onlyNoSodium
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Solo sodio n/d{noSodiumCount > 0 ? ` (${noSodiumCount})` : ''}
          </button>
        </div>

        {/* barra di ordinamento */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="mr-1 text-xs font-bold uppercase tracking-wide text-slate-400">Ordina per</span>
          {SORT_COLUMNS.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => toggleSort(col.id)}
              className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                sortBy === col.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {col.label}
              {sortArrow(col.id)}
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Nessun alimento con questi filtri.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((food) => {
            const sodio = sodiumMgPer100g(food.macrosPer100g);
            return (
              <div key={food.key} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-black text-slate-900">{food.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          food.kind === 'barcode' ? 'bg-emerald-50 text-emerald-700' : 'bg-fuchsia-50 text-fuchsia-700'
                        }`}
                      >
                        {food.kind === 'barcode' ? 'Barcode' : 'A mano'}
                      </span>
                    </div>
                    {food.brand ? <p className="truncate text-sm text-slate-500">{food.brand}</p> : null}

                    {/* valori per 100 g */}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                      {MACRO_KEYS.map((key) => (
                        <span key={key} className="whitespace-nowrap text-slate-500">
                          {MACRO_LABELS[key]}{' '}
                          <span className="font-bold text-slate-800">
                            {roundMacro(food.macrosPer100g?.[key])}
                          </span>
                          {MACRO_UNITS[key] === 'g' ? 'g' : ''}
                        </span>
                      ))}
                      <span className="whitespace-nowrap text-slate-500">
                        Sodio{' '}
                        <span className={`font-bold ${sodio != null && sodio * 5 > SODIUM_LIMIT_MG ? 'text-rose-600' : 'text-slate-800'}`}>
                          {sodio == null ? 'n/d' : `${sodio} mg`}
                        </span>
                        <span className="text-slate-400"> /100g</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => openSodium(food)} className="btn-secondary">Sodio</button>
                    <button onClick={() => setConfirmDelete(food.key)} className="btn-danger">Elimina</button>
                  </div>
                </div>

                {/* editor sodio inline */}
                {editing === food.key && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Inserisci il <strong>sale</strong> per 100 g (dall'etichetta): lo converto in sodio (÷ 2.5).
                    </p>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={saltInput}
                        onChange={(event) => setSaltInput(event.target.value)}
                        placeholder="es. 1.0"
                        className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                      />
                      <span className="pb-2 text-sm text-slate-600">
                        ={' '}
                        {(() => {
                          const s = Number(String(saltInput).replace(',', '.'));
                          return Number.isFinite(s) && s >= 0 ? `${Math.round((s / 2.5) * 1000)} mg di sodio` : '— mg';
                        })()}
                      </span>
                      <button onClick={() => saveSodium(food)} className="btn-primary">Salva</button>
                      <button onClick={() => setEditing(null)} className="btn-secondary">Annulla</button>
                    </div>
                  </div>
                )}

                {/* conferma eliminazione */}
                {confirmDelete === food.key && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3">
                    <span className="text-sm font-semibold text-rose-800">Eliminare “{food.name}” dalla libreria?</span>
                    <div className="flex gap-2">
                      <button onClick={() => remove(food)} className="btn-danger">Sì, elimina</button>
                      <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Annulla</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
