import { MACRO_KEYS } from '../constants';

const SEARCH_FIELDS = [
  'code',
  'id',
  'product_name',
  'product_name_it',
  'product_name_en',
  'brands',
  'nutriments',
  'image_front_small_url',
  'quantity',
  'countries',
  'countries_tags',
  'countries_tags_en',
  'stores',
  'stores_tags',
  'categories',
  'categories_tags'
].join(',');

const DEFAULT_SEARCH_OPTIONS = {
  italyOnly: true,
  includeLowRelevance: false,
  pageSize: 30,
  page: 1
};

const ITALY_TOKENS = new Set(['it', 'italy', 'italia', 'en:italy', 'it:italia']);

const STOPWORDS_IT = new Set([
  'a',
  'ad',
  'al',
  'allo',
  'alla',
  'ai',
  'agli',
  'alle',
  'con',
  'da',
  'dal',
  'dallo',
  'dalla',
  'dei',
  'degli',
  'delle',
  'del',
  'dell',
  'di',
  'e',
  'il',
  'in',
  'la',
  'le',
  'lo',
  'per',
  'un',
  'una'
]);

function parseMacro(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return value.split(',').map((item) => item.trim());
  return [];
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeQuery(query) {
  const normalized = normalizeText(query);
  if (!normalized) return [];

  const tokens = normalized
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 1)
    .filter((token) => !STOPWORDS_IT.has(token));

  return tokens.length > 0 ? tokens : normalized.split(' ').filter(Boolean);
}

function tokenizeText(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
}

function stemToken(token) {
  if (!token || token.length <= 4) return token;
  return token.replace(/[aeiou]$/i, '');
}

function tokenMatchesWord(queryToken, word) {
  if (!queryToken || !word) return false;
  if (word === queryToken) return true;

  const queryStem = stemToken(queryToken);
  const wordStem = stemToken(word);
  if (queryStem.length >= 4 && queryStem === wordStem) return true;

  return queryToken.length >= 3 && word.startsWith(queryToken);
}

function tokenMatchesWords(queryToken, words) {
  return words.some((word) => tokenMatchesWord(queryToken, word));
}

function getProductName(product) {
  return product?.product_name_it || product?.product_name || product?.product_name_en || 'Prodotto senza nome';
}

function productHasItalyMarket(product) {
  const countryValues = [
    ...asArray(product?.countries_tags_en),
    ...asArray(product?.countries_tags),
    ...asArray(product?.countries)
  ];

  return countryValues.some((value) => {
    const raw = String(value).toLowerCase();
    const normalized = normalizeText(value);
    return ITALY_TOKENS.has(raw) || ITALY_TOKENS.has(normalized) || normalized.includes('italy') || normalized.includes('italia');
  });
}

function computeRelevanceMeta(food, query) {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return {
      relevanceScore: food.selectable ? 30 : 10,
      isLowRelevance: false,
      matchedTokens: []
    };
  }

  const normalizedQuery = normalizeText(query);
  const name = normalizeText(food.name);
  const brand = normalizeText(food.brand);
  const quantity = normalizeText(food.quantity);
  const categories = normalizeText([...(food.categoriesTags ?? []), food.categories].join(' '));
  const haystack = [name, brand, quantity, categories].filter(Boolean).join(' ');
  const nameWords = tokenizeText(food.name);
  const brandWords = tokenizeText(food.brand);
  const quantityWords = tokenizeText(food.quantity);
  const categoryWords = tokenizeText([...(food.categoriesTags ?? []), food.categories].join(' '));
  const allWords = [...nameWords, ...brandWords, ...quantityWords, ...categoryWords];

  const matchedTokens = tokens.filter((token) => tokenMatchesWords(token, allWords));
  const matchedInName = tokens.filter((token) => tokenMatchesWords(token, nameWords)).length;
  const matchedInBrand = tokens.filter((token) => tokenMatchesWords(token, brandWords)).length;
  const matchedInCategories = tokens.filter((token) => tokenMatchesWords(token, categoryWords)).length;
  const matchedAnywhere = matchedTokens.length;
  const exactPhraseMatch = normalizedQuery.length > 2 && haystack.includes(normalizedQuery);
  const allTokensMatched = tokens.every((token) => tokenMatchesWords(token, allWords));
  const allTokensInName = tokens.every((token) => tokenMatchesWords(token, nameWords));

  // Per evitare risultati "a caso", le query con piu parole devono combaciare tutte
  // almeno tra nome, brand, quantità o categorie. Il match per singola parola resta più permissivo.
  const isLowRelevance = tokens.length > 1
    ? !(exactPhraseMatch || allTokensMatched)
    : matchedAnywhere === 0;

  let score = 0;

  if (!isLowRelevance) {
    if (exactPhraseMatch) score += 120;
    if (allTokensInName) score += 90;
    if (allTokensMatched) score += 50;
    score += matchedInName * 30;
    score += matchedInBrand * 10;
    score += matchedInCategories * 6;
    score += matchedAnywhere * 8;
  }

  if (food.image) score += 4;
  if (food.selectable) score += 8;
  if (!food.hasIncompleteMacros) score += 6;
  if (food.isItalianMarket) score += 12;

  return {
    relevanceScore: score,
    isLowRelevance,
    matchedTokens
  };
}

function rankProducts(foods, query) {
  return foods
    .map((food) => ({ ...food, ...computeRelevanceMeta(food, query) }))
    .sort((a, b) => {
      if (a.isLowRelevance !== b.isLowRelevance) return a.isLowRelevance ? 1 : -1;
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      if (a.isItalianMarket !== b.isItalianMarket) return a.isItalianMarket ? -1 : 1;
      if (a.hasIncompleteMacros !== b.hasIncompleteMacros) return a.hasIncompleteMacros ? 1 : -1;
      return String(a.name).localeCompare(String(b.name), 'it');
    });
}

function buildSearchUrl(options = {}) {
  const merged = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const url = new URL('/cgi/search.pl', 'https://world.openfoodfacts.org');

  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page', String(Math.max(1, Number(merged.page) || 1)));
  url.searchParams.set('page_size', String(Math.max(1, Number(merged.pageSize) || DEFAULT_SEARCH_OPTIONS.pageSize)));
  url.searchParams.set('fields', SEARCH_FIELDS);

  if (merged.italyOnly) {
    url.searchParams.set('lc', 'it');
    url.searchParams.set('cc', 'it');
  }

  return url;
}

function buildV2SearchUrl(options = {}) {
  const merged = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const url = new URL('/api/v2/search', 'https://world.openfoodfacts.org');

  url.searchParams.set('page', String(Math.max(1, Number(merged.page) || 1)));
  url.searchParams.set('page_size', String(Math.max(1, Number(merged.pageSize) || DEFAULT_SEARCH_OPTIONS.pageSize)));
  url.searchParams.set('fields', SEARCH_FIELDS);

  if (merged.italyOnly) {
    url.searchParams.set('lc', 'it');
    url.searchParams.set('cc', 'it');
  }

  return url;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status) {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

async function fetchJsonWithRetry(url, options = {}) {
  const attempts = Math.max(1, Number(options.attempts) || 2);
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs) || 650);
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        const error = new Error(`Errore Open Food Facts: ${response.status}`);
        error.status = response.status;
        error.url = url.toString();

        if (attempt < attempts && shouldRetryStatus(response.status)) {
          lastError = error;
          await sleep(retryDelayMs * attempt);
          continue;
        }

        throw error;
      }

      return await response.json();
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await sleep(retryDelayMs * attempt);
        continue;
      }
    }
  }

  throw lastError || new Error('Errore sconosciuto Open Food Facts');
}

function buildProductUrl(barcode, options = {}) {
  const merged = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const url = new URL(`/api/v2/product/${encodeURIComponent(barcode)}.json`, 'https://world.openfoodfacts.org');
  url.searchParams.set('fields', SEARCH_FIELDS);

  if (merged.italyOnly) {
    url.searchParams.set('lc', 'it');
    url.searchParams.set('cc', 'it');
  }

  return url;
}

function getTotalPages(json, pageSize, productsLength) {
  const apiPageCount = Number(json.page_count);
  if (Number.isFinite(apiPageCount) && apiPageCount > 0) return Math.ceil(apiPageCount);

  const count = Number(json.count);
  if (Number.isFinite(count) && count > 0) return Math.max(1, Math.ceil(count / pageSize));

  return productsLength >= pageSize ? null : 1;
}

export function normalizeOpenFoodFactsProduct(product) {
  const nutriments = product?.nutriments ?? {};
  const code = product?.code || product?.id || '';

  const normalized = {
    id: code ? `off-${code}` : `off-${Math.random().toString(16).slice(2)}`,
    name: getProductName(product),
    brand: product?.brands || 'Brand non disponibile',
    barcode: code,
    quantity: product?.quantity || '',
    image: product?.image_front_small_url || '',
    source: 'open-food-facts',
    countries: product?.countries || '',
    countriesTags: asArray(product?.countries_tags),
    countriesTagsEn: asArray(product?.countries_tags_en),
    stores: product?.stores || '',
    storesTags: asArray(product?.stores_tags),
    categories: product?.categories || '',
    categoriesTags: asArray(product?.categories_tags),
    isItalianMarket: productHasItalyMarket(product),
    macrosPer100g: {
      kcal: parseMacro(nutriments['energy-kcal_100g']),
      protein: parseMacro(nutriments.proteins_100g),
      carbs: parseMacro(nutriments.carbohydrates_100g),
      fat: parseMacro(nutriments.fat_100g)
    }
  };

  const missingMacros = MACRO_KEYS.filter((key) => normalized.macrosPer100g[key] === null);
  const presentMacros = MACRO_KEYS.filter((key) => normalized.macrosPer100g[key] !== null);

  return {
    ...normalized,
    missingMacros,
    hasIncompleteMacros: missingMacros.length > 0,
    selectable: normalized.macrosPer100g.kcal !== null && presentMacros.filter((key) => key !== 'kcal').length >= 2
  };
}


function readSearchPayload(json, query, options = {}) {
  const merged = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const pageSize = Math.max(1, Number(merged.pageSize) || DEFAULT_SEARCH_OPTIONS.pageSize);
  const products = Array.isArray(json.products) ? json.products : [];
  const normalized = products.map(normalizeOpenFoodFactsProduct).filter((food) => food.name !== 'Prodotto senza nome');
  const ranked = rankProducts(normalized, query);
  const highRelevanceCount = ranked.filter((food) => !food.isLowRelevance).length;
  const lowRelevanceCount = ranked.filter((food) => food.isLowRelevance).length;
  const visibleResults = merged.includeLowRelevance ? ranked : ranked.filter((food) => !food.isLowRelevance);
  const apiCount = Number(json.count);

  return {
    products,
    visibleResults,
    highRelevanceCount,
    lowRelevanceCount,
    hiddenLowRelevance: merged.includeLowRelevance ? 0 : lowRelevanceCount,
    totalAvailableFromApi: Number.isFinite(apiCount) ? apiCount : products.length,
    totalPages: getTotalPages(json, pageSize, products.length)
  };
}

async function fetchSearchPayload(query, options = {}) {
  const merged = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const page = Math.max(1, Number(merged.page) || 1);
  const pageSize = Math.max(1, Number(merged.pageSize) || DEFAULT_SEARCH_OPTIONS.pageSize);
  const cgiUrl = buildSearchUrl({ ...merged, page, pageSize });
  cgiUrl.searchParams.set('search_terms', query);

  let json;
  let endpoint = cgiUrl.toString();

  try {
    json = await fetchJsonWithRetry(cgiUrl, { attempts: 2 });
  } catch (cgiError) {
    const v2Url = buildV2SearchUrl({ ...merged, page, pageSize });
    v2Url.searchParams.set('search_terms', query);
    endpoint = v2Url.toString();

    try {
      json = await fetchJsonWithRetry(v2Url, { attempts: 2 });
    } catch (v2Error) {
      const error = new Error(
        `Open Food Facts non ha risposto per la pagina ${page}. Primo endpoint: ${cgiError.message}. Fallback: ${v2Error.message}`
      );
      error.cause = v2Error;
      error.page = page;
      throw error;
    }
  }

  return {
    endpoint,
    ...readSearchPayload(json, query, { ...merged, page, pageSize })
  };
}

export async function searchOpenFoodFacts(query, options = {}) {
  const trimmed = query.trim();
  const merged = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const currentPage = Math.max(1, Number(merged.page) || 1);
  const pageSize = Math.max(1, Number(merged.pageSize) || DEFAULT_SEARCH_OPTIONS.pageSize);

  if (!trimmed) {
    return {
      results: [],
      meta: {
        totalFromApi: 0,
        shownFromApi: 0,
        highRelevanceCount: 0,
        lowRelevanceCount: 0,
        hiddenLowRelevance: 0,
        italyOnly: merged.italyOnly,
        includeLowRelevance: merged.includeLowRelevance,
        page: currentPage,
        pageSize,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false
      }
    };
  }

  const payload = await fetchSearchPayload(trimmed, { ...merged, page: currentPage, pageSize });

  // Niente prefetch della pagina successiva: scaricava ogni volta due pagine invece
  // di una, raddoppiando la latenza di ogni ricerca. "Pagina successiva" ora si basa
  // sui metadati dell'API: puo' capitare di aprire una pagina senza risultati pertinenti.
  const hasNextPage = payload.totalPages === null
    ? payload.products.length >= pageSize
    : currentPage < payload.totalPages;

  return {
    results: payload.visibleResults,
    meta: {
      totalFromApi: payload.products.length,
      totalAvailableFromApi: payload.totalAvailableFromApi,
      shownFromApi: payload.visibleResults.length,
      highRelevanceCount: payload.highRelevanceCount,
      lowRelevanceCount: payload.lowRelevanceCount,
      hiddenLowRelevance: payload.hiddenLowRelevance,
      italyOnly: merged.italyOnly,
      includeLowRelevance: merged.includeLowRelevance,
      page: currentPage,
      pageSize,
      totalPages: payload.totalPages,
      hasPreviousPage: currentPage > 1,
      hasNextPage,
      endpoint: payload.endpoint
    }
  };
}

export async function getOpenFoodFactsProductByBarcode(barcode, options = {}) {
  const trimmed = barcode.trim();
  if (!trimmed) return null;

  const url = buildProductUrl(trimmed, options);

  const json = await fetchJsonWithRetry(url, { attempts: 2 });
  if (!json.product) return null;
  return normalizeOpenFoodFactsProduct(json.product);
}