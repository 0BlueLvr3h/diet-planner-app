import { useEffect, useMemo, useState } from 'react';
import { MACRO_KEYS, MACRO_LABELS, MACRO_UNITS } from '../constants';
import { getOpenFoodFactsProductByBarcode, searchOpenFoodFacts } from '../services/openFoodFacts';
import {
  createCustomFoodFromForm,
  findCustomFoodByBarcode,
  makeEmptyCustomFoodForm,
  searchCustomFoods,
  validateCustomFoodForm
} from '../utils/customFoods';
import { roundMacro } from '../utils/macros';

const SEARCH_PAGE_SIZE = 30;

const sourceLabels = {
  'open-food-facts': 'Open Food Facts',
  manual: 'Custom manuale',
  mock: 'Dato locale legacy'
};

function sourceLabel(food) {
  return sourceLabels[food.source] || food.source || 'Sorgente n/d';
}

function formatMacroValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? roundMacro(number) : 'n/d';
}

function uniqueBySourceAndId(foods) {
  const seen = new Set();
  return foods.filter((food) => {
    const key = `${food.source}-${food.id}-${food.barcode || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatPageLabel(meta) {
  if (!meta) return '';
  if (meta.totalPages === null) return `Pagina ${meta.page}`;
  return `Pagina ${meta.page} di ${meta.totalPages}`;
}

function ResultMacroRow({ food }) {
  return (
    <div className="grid grid-cols-4 gap-2 text-xs">
      {MACRO_KEYS.map((key) => (
        <div key={key} className="rounded-xl bg-slate-100 px-2 py-1 text-slate-700">
          <span className="block font-semibold uppercase text-slate-400">{MACRO_LABELS[key]}</span>
          <span className="font-black">
            {formatMacroValue(food.macrosPer100g[key])} {MACRO_UNITS[key]}
          </span>
        </div>
      ))}
    </div>
  );
}

function FoodResultCard({ food, mode, onSelect, onDeleteCustomFood }) {
  const relevanceClasses = food.isLowRelevance
    ? 'border-amber-200 bg-amber-50/40'
    : 'border-slate-200 bg-white';

  return (
    <article className={`rounded-3xl border p-4 shadow-sm ${relevanceClasses}`}>
      <div className="mb-3 flex gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {food.image ? (
            <img src={food.image} alt={food.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl">
              {food.source === 'manual' ? '✍️' : '🥫'}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-black text-slate-950">{food.name}</h3>
          <p className="truncate text-sm text-slate-500">{food.brand || 'Brand non disponibile'}</p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-bold">
            <span
              className={`rounded-full px-2 py-0.5 ${
                food.source === 'manual'
                  ? 'bg-fuchsia-50 text-fuchsia-700'
                  : food.source === 'mock'
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {sourceLabel(food)}
            </span>
            {food.isLowRelevance && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Poco pertinente</span>
            )}
            {food.source === 'open-food-facts' && food.isItalianMarket && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Italia</span>
            )}
            {food.quantity && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{food.quantity}</span>
            )}
          </div>
        </div>
      </div>

      <ResultMacroRow food={food} />

      {food.hasIncompleteMacros && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Mancano: {food.missingMacros.join(', ')}.
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          disabled={!food.selectable}
          onClick={() => onSelect(food)}
          className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {food.selectable ? (mode === 'swap' ? 'Sostituisci mantenendo i grammi' : `Aggiungi a ${food.defaultGrams ?? 100}g`) : 'Dati insufficienti'}
        </button>
        {food.source === 'manual' && onDeleteCustomFood && (
          <button
            type="button"
            onClick={() => onDeleteCustomFood(food.id)}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100"
          >
            Elimina
          </button>
        )}
      </div>
    </article>
  );
}

function CustomFoodForm({ form, setForm, error, onSubmit }) {
  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-fuchsia-100 bg-fuchsia-50/60 p-4">
      <div>
        <h3 className="text-lg font-black text-slate-950">Crea un alimento tuo</h3>
        <p className="mt-1 text-sm text-slate-600">
          Per quando il prodotto non si trova: il macellaio, una ricetta di casa, un alimento senza barcode.
        </p>
      </div>

      {error && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-bold text-slate-700">Nome alimento *</span>
          <input
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="Es. Petto di pollo del macellaio"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none ring-indigo-200 focus:ring-4"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-bold text-slate-700">Brand / origine</span>
          <input
            value={form.brand}
            onChange={(event) => updateField('brand', event.target.value)}
            placeholder="Es. Custom, Coop, Macellaio"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none ring-indigo-200 focus:ring-4"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-bold text-slate-700">Barcode opzionale</span>
          <input
            value={form.barcode}
            onChange={(event) => updateField('barcode', event.target.value)}
            placeholder="Opzionale"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none ring-indigo-200 focus:ring-4"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-bold text-slate-700">Quantità / note</span>
          <input
            value={form.quantity}
            onChange={(event) => updateField('quantity', event.target.value)}
            placeholder="Es. valori da etichetta, ricetta personale"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none ring-indigo-200 focus:ring-4"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1">
          <span className="text-sm font-bold text-slate-700">Grammi iniziali *</span>
          <input
            type="number"
            min="1"
            step="1"
            value={form.grams}
            onChange={(event) => updateField('grams', event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right font-black outline-none ring-indigo-200 focus:ring-4"
          />
        </label>

        {MACRO_KEYS.map((key) => (
          <label key={key} className="space-y-1">
            <span className="text-sm font-bold text-slate-700">{MACRO_LABELS[key]} / 100g *</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form[key]}
              onChange={(event) => updateField(key, event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right font-black outline-none ring-indigo-200 focus:ring-4"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-600">
          Viene aggiunto alla dieta e salvato nella tua libreria.
        </p>
        <button type="submit" className="btn-primary">
          Salva e usa
        </button>
      </div>
    </form>
  );
}

function PaginationControls({ meta, loading, failedPageRequest, onPageChange, onRetryFailedPage }) {
  if ((!meta || meta.totalFromApi === 0) && !failedPageRequest) return null;

  const failedPage = failedPageRequest?.page;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <span className="text-sm text-slate-400">
        {meta ? formatPageLabel(meta) : failedPage ? `Pagina ${failedPage}` : ''}
      </span>
      <div className="flex flex-wrap gap-2">
        {failedPage && (
          <button
            type="button"
            disabled={loading}
            onClick={onRetryFailedPage}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-50"
          >
            Riprova
          </button>
        )}
        {meta && (
          <>
            <button
              type="button"
              disabled={loading || !meta.hasPreviousPage}
              onClick={() => onPageChange(Math.max(1, (failedPage ?? meta.page) - 1))}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Precedente
            </button>
            <button
              type="button"
              disabled={loading || !meta.hasNextPage}
              onClick={() => onPageChange((failedPage ?? meta.page) + 1)}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Successiva
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function FoodSearchModal({
  open,
  mode,
  onClose,
  onSelect,
  customFoods = [],
  onSaveCustomFood,
  onDeleteCustomFood,
  onBarcodeFoodFound
}) {
  const [searchMode, setSearchMode] = useState('text');
  const [query, setQuery] = useState('');
  const [barcode, setBarcode] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);
  const [italyOnly, setItalyOnly] = useState(true);
  const [showLowRelevance, setShowLowRelevance] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchMeta, setSearchMeta] = useState(null);
  const [failedPageRequest, setFailedPageRequest] = useState(null);
  const [customForm, setCustomForm] = useState(() => makeEmptyCustomFoodForm());
  const [customFormError, setCustomFormError] = useState('');

  const title = useMemo(() => (mode === 'swap' ? 'Swap alimento' : 'Aggiungi alimento'), [mode]);

  useEffect(() => {
    if (!open) return;

    setSearchMode('text');
    setQuery('');
    setBarcode('');
    setError('');
    setEmpty(false);
    setItalyOnly(true);
    setShowLowRelevance(false);
    setShowFilters(false);
    setSearchMeta(null);
    setFailedPageRequest(null);
    setCustomFormError('');
    setCustomForm(makeEmptyCustomFoodForm());
    setResults(uniqueBySourceAndId(searchCustomFoods(customFoods, '')));
  }, [open, customFoods]);

  if (!open) return null;

  function customMatchesForCurrentMode() {
    if (searchMode === 'barcode') {
      return [findCustomFoodByBarcode(customFoods, barcode)].filter(Boolean);
    }

    return searchCustomFoods(customFoods, query);
  }

  async function runSearch(pageOverride = 1, overrides = {}) {
    if (searchMode === 'custom') return;

    const useItalyOnly = overrides.italyOnly ?? italyOnly;
    const useLowRelevance = overrides.showLowRelevance ?? showLowRelevance;
    const requestedPage = Math.max(1, Number(pageOverride) || 1);
    const requestSnapshot = { searchMode, query, barcode, page: requestedPage };

    setLoading(true);
    setError('');
    setEmpty(false);
    setFailedPageRequest(null);

    if (requestedPage === 1) {
      setSearchMeta(null);
      setResults(uniqueBySourceAndId(customMatchesForCurrentMode()));
    }

    try {
      let nextResults = [];
      let meta = null;
      const localCustomResults = requestedPage === 1 ? customMatchesForCurrentMode() : [];

      if (searchMode === 'barcode') {
        const found = await getOpenFoodFactsProductByBarcode(barcode, { italyOnly: useItalyOnly });
        if (found) onBarcodeFoodFound?.(found);
        nextResults = found ? [found] : [];
        meta = {
          totalFromApi: found ? 1 : 0,
          shownFromApi: found ? 1 : 0,
          highRelevanceCount: found ? 1 : 0,
          lowRelevanceCount: 0,
          hiddenLowRelevance: 0,
          italyOnly: useItalyOnly,
          page: 1,
          pageSize: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        };
      } else {
        const apiResponse = await searchOpenFoodFacts(query, {
          italyOnly: useItalyOnly,
          includeLowRelevance: useLowRelevance,
          page: requestedPage,
          pageSize: SEARCH_PAGE_SIZE
        });
        nextResults = apiResponse.results;
        meta = apiResponse.meta;
      }

      const merged = uniqueBySourceAndId([...localCustomResults, ...nextResults]);
      setResults(merged);
      setSearchMeta(meta);
      setEmpty(merged.length === 0);
    } catch (requestError) {
      console.warn(requestError);
      setFailedPageRequest(requestSnapshot);
      setError(
        searchMode === 'text'
          ? `Pagina ${requestedPage} non caricata. Riprova.`
          : 'Ricerca non riuscita. Riprova, oppure crea un alimento tuo.'
      );

      const fallbackResults = uniqueBySourceAndId(customMatchesForCurrentMode());
      const hadVisibleResults = results.length > 0;
      setResults((currentResults) => (currentResults.length > 0 ? currentResults : fallbackResults));
      setEmpty(!hadVisibleResults && fallbackResults.length === 0);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    runSearch(1);
  }

  function handlePageChange(nextPage) {
    runSearch(nextPage);
  }

  function handleRetryFailedPage() {
    if (!failedPageRequest) return;
    runSearch(failedPageRequest.page);
  }

  function revealLowRelevance() {
    setShowLowRelevance(true);
    runSearch(searchMeta?.page ?? 1, { showLowRelevance: true });
  }

  function handleCustomSubmit(event) {
    event.preventDefault();
    const errors = validateCustomFoodForm(customForm);

    if (errors.length > 0) {
      setCustomFormError(errors[0]);
      return;
    }

    const customFood = createCustomFoodFromForm(customForm);
    setCustomFormError('');
    onSaveCustomFood?.(customFood);
    onSelect(customFood);
  }

  function resetSearchState(nextMode) {
    setSearchMode(nextMode);
    setError('');
    setEmpty(false);
    setSearchMeta(null);
    setFailedPageRequest(null);
    setResults(uniqueBySourceAndId(searchCustomFoods(customFoods, '')));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-soft sm:rounded-3xl">
        <header className="border-b border-slate-200 p-4 lg:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950">{title}</h2>
              <p className="text-sm text-slate-500">
                Cerca un prodotto per nome o codice a barre. Se non lo trovi, puoi crearlo tu.
              </p>
            </div>
            <button onClick={onClose} className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-700 hover:bg-slate-200">
              Chiudi
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-3 lg:grid-cols-[190px_1fr_auto]">
            <select
              value={searchMode}
              onChange={(event) => resetSearchState(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-semibold text-slate-900 outline-none ring-indigo-200 focus:ring-4"
            >
              <option value="text">Cerca per nome</option>
              <option value="barcode">Codice a barre</option>
              <option value="custom">Crea a mano</option>
            </select>

            {searchMode === 'text' && (
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setFailedPageRequest(null);
                  setError('');
                }}
                placeholder="Esempio: salmone, yogurt greco, farina d'avena..."
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none ring-indigo-200 focus:ring-4"
              />
            )}

            {searchMode === 'barcode' && (
              <input
                value={barcode}
                onChange={(event) => {
                  setBarcode(event.target.value);
                  setFailedPageRequest(null);
                  setError('');
                }}
                placeholder="Codice a barre EAN"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none ring-indigo-200 focus:ring-4"
              />
            )}

            {searchMode === 'custom' && (
              <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50 px-4 py-3 text-sm font-bold text-fuchsia-700 lg:col-span-2">
                Compila il form qui sotto: l'alimento resta nella tua libreria e potrai riusarlo.
              </div>
            )}

            {searchMode !== 'custom' && (
              <button type="submit" disabled={loading} className="btn-primary disabled:cursor-wait disabled:opacity-60">
                {loading ? 'Cerco…' : 'Cerca'}
              </button>
            )}
          </form>

          {/* Riga di stato: una sola, e solo quando serve dire qualcosa */}
          {searchMode !== 'custom' && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                className="font-semibold text-slate-500 transition hover:text-slate-800"
              >
                {showFilters ? 'Nascondi filtri' : 'Filtri'}
              </button>

              {error ? (
                <span className="font-semibold text-amber-700">{error}</span>
              ) : empty ? (
                <span className="text-slate-500">Nessun risultato. Cambia i termini o crea l'alimento a mano.</span>
              ) : searchMeta && searchMeta.shownFromApi > 0 ? (
                <span className="text-slate-500">
                  {searchMeta.shownFromApi} risultati
                  {searchMeta.hiddenLowRelevance > 0 && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        onClick={revealLowRelevance}
                        className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
                      >
                        mostra altri {searchMeta.hiddenLowRelevance} meno pertinenti
                      </button>
                    </>
                  )}
                </span>
              ) : null}
            </div>
          )}

          {showFilters && searchMode !== 'custom' && (
            <div className="mt-2 flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={italyOnly}
                  onChange={(event) => {
                    setItalyOnly(event.target.checked);
                    setSearchMeta(null);
                    setFailedPageRequest(null);
                  }}
                  className="h-4 w-4 accent-emerald-600"
                />
                Priorità Italia
              </label>
              {searchMode === 'text' && (
                <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={showLowRelevance}
                    onChange={(event) => {
                      setShowLowRelevance(event.target.checked);
                      setSearchMeta(null);
                      setFailedPageRequest(null);
                    }}
                    className="h-4 w-4 accent-amber-600"
                  />
                  Mostra anche i risultati meno pertinenti
                </label>
              )}
            </div>
          )}
        </header>

        <main className="overflow-y-auto p-4 lg:p-5">
          {searchMode === 'custom' ? (
            <div className="space-y-4">
              <CustomFoodForm
                form={customForm}
                setForm={setCustomForm}
                error={customFormError}
                onSubmit={handleCustomSubmit}
              />

              {customFoods.length > 0 && (
                <section>
                  <div className="mb-3">
                    <h3 className="text-lg font-black text-slate-950">La tua libreria</h3>
                    <p className="text-sm text-slate-500">
                      {customFoods.length} alimenti creati da te. Riusali o eliminali.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {searchCustomFoods(customFoods, '').map((food) => (
                      <FoodResultCard
                        key={`${food.source}-${food.id}-${food.barcode}`}
                        food={food}
                        mode={mode}
                        onSelect={onSelect}
                        onDeleteCustomFood={onDeleteCustomFood}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {results.map((food) => (
                  <FoodResultCard
                    key={`${food.source}-${food.id}-${food.barcode}`}
                    food={food}
                    mode={mode}
                    onSelect={onSelect}
                    onDeleteCustomFood={food.source === 'manual' ? onDeleteCustomFood : undefined}
                  />
                ))}
              </div>
              <PaginationControls
                meta={searchMeta}
                loading={loading}
                failedPageRequest={failedPageRequest}
                onPageChange={handlePageChange}
                onRetryFailedPage={handleRetryFailedPage}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}