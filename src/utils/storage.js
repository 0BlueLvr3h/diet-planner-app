import { APP_SCHEMA_VERSION, APP_STORAGE_KEY, DEFAULT_TARGET, DEFAULT_TOLERANCE } from '../constants';
import { normalizeCustomFoodProduct } from './customFoods';
import { normalizeBarcodeFood } from './barcodeFoods';

function nowIso() {
  return new Date().toISOString();
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePersistedState(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // Formato nuovo: envelope versionato. Formato legacy: stato applicativo diretto.
  const candidate = raw.state && typeof raw.state === 'object' ? raw.state : raw;

  const variants = Array.isArray(candidate.variants) ? candidate.variants : [];
  if (variants.length === 0) return null;

  const activeVariantId = variants.some((variant) => variant.id === candidate.activeVariantId)
    ? candidate.activeVariantId
    : variants[0].id;

  return {
    target: { ...DEFAULT_TARGET, ...(candidate.target ?? {}) },
    tolerance: { ...DEFAULT_TOLERANCE, ...(candidate.tolerance ?? {}) },
    variants,
    activeVariantId,
    customFoods: Array.isArray(candidate.customFoods)
      ? candidate.customFoods.map(normalizeCustomFoodProduct)
      : [],
    barcodeFoods: Array.isArray(candidate.barcodeFoods)
      ? candidate.barcodeFoods.map(normalizeBarcodeFood)
      : [],
    weekAssignments: candidate.weekAssignments && typeof candidate.weekAssignments === 'object' ? candidate.weekAssignments : {}
  };
}

export function buildPersistedDocument(state) {
  return {
    app: 'diet-planner-variants',
    schemaVersion: APP_SCHEMA_VERSION,
    savedAt: nowIso(),
    state: cloneJson({
      target: state.target,
      tolerance: state.tolerance,
      variants: state.variants,
      activeVariantId: state.activeVariantId,
      customFoods: state.customFoods ?? [],
      barcodeFoods: state.barcodeFoods ?? [],
      weekAssignments: state.weekAssignments ?? {}
    })
  };
}

export function loadPersistedDocument() {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Impossibile leggere il documento persistito da localStorage', error);
    return null;
  }
}

export function loadStateFromStorage() {
  try {
    const document = loadPersistedDocument();
    return normalizePersistedState(document);
  } catch (error) {
    console.warn('Impossibile normalizzare lo stato salvato', error);
    return null;
  }
}

export function getStoredMetadata() {
  const document = loadPersistedDocument();
  if (!document) return null;

  return {
    schemaVersion: document.schemaVersion ?? 'legacy',
    savedAt: document.savedAt ?? null
  };
}

export function saveStateToStorage(state) {
  try {
    const document = buildPersistedDocument(state);
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(document));
    return { ok: true, savedAt: document.savedAt };
  } catch (error) {
    console.warn('Impossibile salvare lo stato in localStorage', error);
    return { ok: false, error };
  }
}

export function exportDietState(state) {
  return JSON.stringify(buildPersistedDocument(state), null, 2);
}

export function parseImportedDietState(jsonText) {
  let parsed;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error('Il file selezionato non contiene JSON valido.');
  }

  const normalized = normalizePersistedState(parsed);
  if (!normalized) {
    throw new Error('Il file JSON non sembra essere un backup valido di Diet Planner.');
  }

  return normalized;
}

export function clearStateFromStorage() {
  try {
    localStorage.removeItem(APP_STORAGE_KEY);
    return { ok: true };
  } catch (error) {
    console.warn('Impossibile cancellare lo stato da localStorage', error);
    return { ok: false, error };
  }
}