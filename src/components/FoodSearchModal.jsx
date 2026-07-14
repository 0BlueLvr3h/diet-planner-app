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
  manual: 'Creato da te',
  mock: 'Dato locale legacy'
};

// Un codice a barre e' solo cifre (EAN-8, UPC, EAN-13...). Se l'utente scrive
// quello, cerchiamo il prodotto esatto invece di fare una ricerca testuale.
function looksLikeBarcode(value) {
  return /^\d{8,14}$/.test(String(value).trim().replace(/\s+/g, ''));
}

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
          Resta nella tua libreria e potrai riusarlo.
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

      <div className="mt-4 flex justify-end">
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
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);
  const [italyOnly, setItalyOnly] = useState(true);
  const [showLowRelevance, setShowLowRelevance] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchMeta, setSearchMeta] = useState(null);
  const [lastSearch, setLastSearch] = useState(null);
  const [failedPageRequest, setFailedPageRequest] = useState(null);
  const [customForm, setCustomForm] = useState(() => makeEmptyCustomFoodForm());
  const [customFormError, setCustomFormError] = useState('');

  const title = useMemo(() => (mode === 'swap' ? 'Swap alimento' : 'Aggiungi alimento'), [mode]);
  const isBarcodeQuery = looksLikeBarcode(query);

  useEffect(() => {
    if (!open) return;

    setQuery('');
    setCreating(false);
    setError('');
    setEmpty(false);
    setItalyOnly(true);
    setShowLowRelevance(false);
    setShowFilters(false);
    setSearchMeta(null);
    setLastSearch(null);
    setFailedPageRequest(null);
    setCustomFormError('');
    setCustomForm(makeEmptyCustomFoodForm());
    setResults(uniqueBySourceAndId(searchCustomFoods(customFoods, '')));
  }, [open, customFoods]);

  if (!open) return null;

  function localMatches(term, asBarcode) {
    if (asBarcode) return [findCustomFoodByBarcode(customFoods, term)].filter(Boolean);
    return searchCustomFoods(customFoods, term);
  }

  async function runSearch(pageOverride = 1, overrides = {}) {
    const term = query.trim();
    if (!term) return;

    const asBarcode = looksLikeBarcode(term);
    const useItalyOnly = overrides.italyOnly ?? italyOnly;
    const useLowRelevance = overrides.showLowRelevance ?? showLowRelevance;
    const requestedPage = asBarcode ? 1 : Math.max(1, Number(pageOverride) || 1);

    setLoading(true);
    setError('');
    setEmpty(false);
    setFailedPageRequest(null);
    setLastSearch({ term, asBarcode });

    if (requestedPage === 1) {
      setSearchMeta(null);
      setResults(uniqueBySourceAndId(localMatches(term, asBarcode)));
    }

    try {
      let nextResults = [];
      let meta = null;
      const localResults = requestedPage === 1 ? localMatches(term, asBarcode) : [];

      if (asBarcode) {
        const found = await getOpenFoodFactsProductByBarcode(term, { italyOnly: useItalyOnly });
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
        const apiResponse = await searchOpenFoodFacts(term, {
          italyOnly: useItalyOnly,
          includeLowRelevance: useLowRelevance,
          page: requestedPage,
          pageSize: SEARCH_PAGE_SIZE
        });
        nextResults = apiResponse.results;
        meta = apiResponse.meta;
      }

      const merged = uniqueBySourceAndId([...localResults, ...nextResults]);
      setResults(merged);
      setSearchMeta(meta);
      setEmpty(merged.length === 0);
    } catch (requestError) {
      console.warn(requestError);
      setFailedPageRequest({ term, page: requestedPage });
      setError(
        asBarcode
          ? 'Ricerca non riuscita. Riprova, oppure crea tu l\u2019alimento.'
          : `Pagina ${requestedPage} non caricata. Riprova.`
      );

      const fallbackResults = uniqueBySourceAndId(localMatches(term, asBarcode));
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

  function revealLowRelevance() {
    setShowLowRelevance(true);
    runSearch(searchMeta?.page ?? 1, { showLowRelevance: true });
  }

  function startCreating() {
    // Se ho appena cercato per nome, precompilo il campo: risparmia una digitazione.
    if (lastSearch && !lastSearch.asBarcode) {
      setCustomForm((current) => ({ ...current, name: current.name || lastSearch.term }));
    } else if (lastSearch?.asBarcode) {
      setCustomForm((current) => ({ ...current, barcode: current.barcode || lastSearch.term }));
    }
    setCustomFormError('');
    setCreating(true);
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

  const showingLibrary = !searchMeta && !lastSearch && results.length > 0;

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

          <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setFailedPageRequest(null);
                setError('');
              }}
              placeholder="Nome prodotto o codice a barre..."
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none ring-indigo-200 focus:ring-4"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Cerco…' : 'Cerca'}
            </button>
          </form>

          {isBarcodeQuery && (
            <p className="mt-2 text-xs font-semibold text-indigo-600">
              Sembra un codice a barre: cerco il prodotto esatto.
            </p>
          )}

          {/* Una riga sola: filtri, stato, e la via d'uscita per creare */}
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

            {!creating && (
              <button
                type="button"
                onClick={startCreating}
                className="ml-auto font-semibold text-fuchsia-700 transition hover:text-fuchsia-900"
              >
                Crea a mano
              </button>
            )}
          </div>

          {showFilters && (
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
            </div>
          )}
        </header>

        <main className="overflow-y-auto p-4 lg:p-5">
          {creating ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="text-sm font-semibold text-slate-500 transition hover:text-slate-800"
              >
                ← Torna ai risultati
              </button>
              <CustomFoodForm
                form={customForm}
                setForm={setCustomForm}
                error={customFormError}
                onSubmit={handleCustomSubmit}
              />
            </div>
          ) : empty ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 px-6 py-12 text-center">
              <p className="font-bold text-slate-700">
                {lastSearch?.asBarcode
                  ? `Nessun prodotto con il codice ${lastSearch.term}`
                  : `Nessun risultato per "${lastSearch?.term ?? query}"`}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Potrebbe non essere su Open Food Facts. Puoi inserirlo tu leggendo i valori dall'etichetta:
                resta salvato nella tua libreria.
              </p>
              <button type="button" onClick={startCreating} className="btn-primary mt-5">
                Crealo tu →
              </button>
            </div>
          ) : (
            <>
              {showingLibrary && (
                <p className="mb-3 text-sm font-semibold text-slate-500">I tuoi alimenti salvati</p>
              )}
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
                onPageChange={(page) => runSearch(page)}
                onRetryFailedPage={() => failedPageRequest && runSearch(failedPageRequest.page)}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}