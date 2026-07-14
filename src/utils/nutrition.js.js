// Calcolo di fabbisogno calorico e macro.
//
// NOTA IMPORTANTE: queste equazioni sono stime di popolazione, non misure.
// Anche la migliore (Mifflin-St Jeor) cade entro il 10% del valore reale solo per
// la maggior parte delle persone, non per tutte. Il fattore di attivita' e' ancora
// piu' grezzo. Il risultato va usato come punto di partenza da correggere
// osservando il peso reale nel tempo.

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentario', hint: 'Ufficio, poco o niente sport', factor: 1.2 },
  { id: 'light', label: 'Leggermente attivo', hint: '1-3 allenamenti a settimana', factor: 1.375 },
  { id: 'moderate', label: 'Moderatamente attivo', hint: '3-5 allenamenti a settimana', factor: 1.55 },
  { id: 'very', label: 'Molto attivo', hint: '6-7 allenamenti a settimana', factor: 1.725 },
  { id: 'extra', label: 'Estremamente attivo', hint: 'Lavoro fisico + allenamenti quotidiani', factor: 1.9 }
];

export const GOALS = [
  { id: 'cut', label: 'Dimagrimento', delta: -0.15, hint: '-15% dal mantenimento' },
  { id: 'maintain', label: 'Mantenimento', delta: 0, hint: 'Resti dove sei' },
  { id: 'bulk', label: 'Massa', delta: 0.1, hint: '+10% sul mantenimento' }
];

export const PROTEIN_OPTIONS = [1.6, 1.8, 2.0, 2.2];
export const FAT_OPTIONS = [0.6, 0.8, 1.0];

// Soglie di sicurezza: sotto queste il calcolatore non scende, a prescindere
// dall'obiettivo. Non e' pignoleria: e' il minimo per non fare danni.
const FLOOR_KCAL = { male: 1500, female: 1200 };

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Mifflin-St Jeor (1990): lo standard quando non conosci la composizione corporea.
export function bmrMifflin({ sex, weightKg, heightCm, age }) {
  const base = 10 * num(weightKg) + 6.25 * num(heightCm) - 5 * num(age);
  return sex === 'female' ? base - 161 : base + 5;
}

// Katch-McArdle: parte dalla massa magra, quindi ignora il peso "passivo" del
// grasso. Piu' accurata di Mifflin SE la percentuale di grasso e' attendibile.
export function bmrKatch({ weightKg, bodyFatPct }) {
  const lean = num(weightKg) * (1 - num(bodyFatPct) / 100);
  return 370 + 21.6 * lean;
}

export function hasUsableBodyFat(bodyFatPct) {
  const value = Number(bodyFatPct);
  return Number.isFinite(value) && value >= 3 && value <= 60;
}

export function computeMacros({ kcal, weightKg, proteinPerKg, fatPerKg }) {
  const protein = num(weightKg) * num(proteinPerKg);
  const fat = num(weightKg) * num(fatPerKg);
  // I carboidrati sono il resto: e' la voce piu' elastica e la meno critica.
  const carbs = Math.max(0, (num(kcal) - protein * 4 - fat * 9) / 4);

  return {
    kcal: Math.round(num(kcal)),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat)
  };
}

export function makeEmptyProfile() {
  return {
    sex: 'male',
    age: '',
    heightCm: '',
    weightKg: '',
    bodyFatPct: '',
    formula: 'auto',
    activityId: 'moderate',
    goalId: 'maintain',
    proteinPerKg: 1.8,
    fatPerKg: 0.8
  };
}

export function computeNutritionPlan(profile) {
  const {
    sex = 'male',
    age,
    heightCm,
    weightKg,
    bodyFatPct,
    formula = 'auto',
    activityId = 'moderate',
    goalId = 'maintain',
    proteinPerKg = 1.8,
    fatPerKg = 0.8
  } = profile ?? {};

  const errors = [];
  if (num(age) < 14 || num(age) > 100) errors.push('Inserisci un\u2019età tra 14 e 100 anni.');
  if (num(heightCm) < 120 || num(heightCm) > 230) errors.push('Inserisci un\u2019altezza tra 120 e 230 cm.');
  if (num(weightKg) < 30 || num(weightKg) > 300) errors.push('Inserisci un peso tra 30 e 300 kg.');
  if (String(bodyFatPct ?? '').trim() !== '' && !hasUsableBodyFat(bodyFatPct)) {
    errors.push('La percentuale di grasso deve stare tra 3 e 60, oppure lasciala vuota.');
  }
  if (errors.length > 0) return { ok: false, errors };

  const katchAvailable = hasUsableBodyFat(bodyFatPct);
  const mifflin = bmrMifflin({ sex, weightKg, heightCm, age });
  const katch = katchAvailable ? bmrKatch({ weightKg, bodyFatPct }) : null;

  // 'auto' preferisce Katch quando c'e' una percentuale di grasso plausibile.
  const useKatch = katchAvailable && (formula === 'katch' || formula === 'auto');
  const bmr = useKatch ? katch : mifflin;

  const activity = ACTIVITY_LEVELS.find((level) => level.id === activityId) ?? ACTIVITY_LEVELS[0];
  const goal = GOALS.find((item) => item.id === goalId) ?? GOALS[1];

  const tdee = bmr * activity.factor;
  const rawTarget = tdee * (1 + goal.delta);

  const floor = FLOOR_KCAL[sex] ?? FLOOR_KCAL.male;
  const warnings = [];
  let kcal = rawTarget;

  if (kcal < floor) {
    kcal = floor;
    warnings.push(
      `Il calcolo scendeva sotto le ${floor} kcal e l\u2019ho fermato lì. Per un deficit più aggressivo serve una guida professionale.`
    );
  }
  if (kcal < bmr) {
    warnings.push(
      'Il target è sotto il tuo metabolismo basale: sostenibile solo per periodi brevi e sotto controllo.'
    );
  }

  const macros = computeMacros({ kcal, weightKg, proteinPerKg, fatPerKg });

  return {
    ok: true,
    bmr: Math.round(bmr),
    bmrMifflin: Math.round(mifflin),
    bmrKatch: katch === null ? null : Math.round(katch),
    usedFormula: useKatch ? 'katch' : 'mifflin',
    katchAvailable,
    tdee: Math.round(tdee),
    activity,
    goal,
    macros,
    warnings
  };
}