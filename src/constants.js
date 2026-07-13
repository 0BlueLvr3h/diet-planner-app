export const MACRO_KEYS = ['kcal', 'protein', 'carbs', 'fat'];

export const MACRO_LABELS = {
  kcal: 'Kcal',
  protein: 'Proteine',
  carbs: 'Carboidrati',
  fat: 'Grassi'
};

export const MACRO_UNITS = {
  kcal: 'kcal',
  protein: 'g',
  carbs: 'g',
  fat: 'g'
};

export const DEFAULT_TARGET = {
  kcal: 1900,
  protein: 150,
  carbs: 180,
  fat: 50
};

export const DEFAULT_TOLERANCE = {
  kcal: 50,
  protein: 5,
  carbs: 5,
  fat: 3
};

export const DEFAULT_MEALS = ['Colazione', 'Pranzo', 'Spuntino', 'Cena'];

export const APP_SCHEMA_VERSION = 4;
export const APP_STORAGE_KEY = 'diet-planner:v1:state';
export const STORAGE_KEY = APP_STORAGE_KEY;
export const BACKUP_FILE_PREFIX = 'diet-planner-backup';

// Backend che riceve i barcode scansionati dal telefono (cartella server/).
// Vuoto = "stessa origine": il browser chiama l'API sullo stesso indirizzo da cui
// ha scaricato la pagina. Cosi', servito da Oracle, chiama Oracle da solo.
export const BARCODE_BACKEND_URL = '';
export const ENABLE_BARCODE_STREAM = true;