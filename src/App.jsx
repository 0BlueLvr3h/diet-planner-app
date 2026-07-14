import { useEffect, useMemo, useReducer, useState } from 'react';
import BarcodeFoodMenu from './components/BarcodeFoodMenu';
import DiffPanel from './components/DiffPanel';
import FoodSearchModal from './components/FoodSearchModal';
import MealCard from './components/MealCard';
import PersistencePanel from './components/PersistencePanel';
import TargetEditor from './components/TargetEditor';
import VariantTabs from './components/VariantTabs';
import { BARCODE_BACKEND_URL, ENABLE_BARCODE_STREAM } from './constants';
import { createInitialState, dietReducer } from './state/dietReducer';
import { getOpenFoodFactsProductByBarcode } from './services/openFoodFacts';
import { calculateDiff, calculateVariantTotals } from './utils/macros';
import { buildPersistedDocument, getStoredMetadata, parseImportedDietState, saveStateToStorage } from './utils/storage';
import { apiGetState, apiPutState } from './services/api';

export default function App({ username, onLogout }) {
  const [state, dispatch] = useReducer(dietReducer, undefined, createInitialState);
  const [searchContext, setSearchContext] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [lastSavedAt, setLastSavedAt] = useState(() => getStoredMetadata()?.savedAt ?? null);
  const [storageError, setStorageError] = useState('');
  const [draggedFood, setDraggedFood] = useState(null);
  const [dropTargetMealId, setDropTargetMealId] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const activeVariant = useMemo(
    () => state.variants.find((variant) => variant.id === state.activeVariantId) ?? state.variants[0],
    [state.variants, state.activeVariantId]
  );

  const totals = useMemo(() => calculateVariantTotals(activeVariant), [activeVariant]);
  const diff = useMemo(() => calculateDiff(state.target, totals), [state.target, totals]);

  // Al login carico lo stato salvato sul server per questo utente.
  // Finche' non ho finito blocco l'autosave (hydrated=false), cosi' non
  // sovrascrivo i dati del server con lo stato iniziale locale.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const doc = await apiGetState();
      if (!cancelled && doc) {
        try {
          dispatch({ type: 'HYDRATE_STATE', payload: parseImportedDietState(JSON.stringify(doc)) });
        } catch {
          // stato server assente o non valido: tengo lo stato locale iniziale
        }
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Autosave con debounce: salva sul server (per utente) + cache locale.
  useEffect(() => {
    if (!hydrated) return undefined; // non salvare prima del caricamento iniziale
    setSaveStatus('saving');

    const timeoutId = window.setTimeout(async () => {
      const doc = buildPersistedDocument(state);
      saveStateToStorage(state); // cache locale (offline / backup)
      const ok = await apiPutState(doc);

      if (ok) {
        setSaveStatus('saved');
        setLastSavedAt(doc.savedAt);
        setStorageError('');
      } else {
        setSaveStatus('error');
        setStorageError('Non riesco a salvare sul server. Controlla la connessione.');
      }
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [state, hydrated]);

  // Ponte col backend: ogni barcode scansionato dal telefono viene cercato su
  // Open Food Facts e finisce nel catalogo "Alimenti da barcode".
  // Disattivabile da constants.js (ENABLE_BARCODE_STREAM). Se il backend non gira
  // l'app resta pienamente funzionante: EventSource ritenta da solo.
  useEffect(() => {
    if (!ENABLE_BARCODE_STREAM) return undefined;

    let closed = false;
    const source = new EventSource(`${BARCODE_BACKEND_URL}/api/barcode/stream`);

    source.onmessage = async (event) => {
      try {
        const { code } = JSON.parse(event.data);
        if (!code) return;
        const product = await getOpenFoodFactsProductByBarcode(code);
        if (product && !closed) {
          dispatch({ type: 'UPSERT_BARCODE_FOOD', payload: { food: product } });
        }
      } catch (streamError) {
        console.warn('Scan non processato', streamError);
      }
    };

    source.onerror = () => {
      // Backend non raggiungibile: EventSource gestisce da sé la riconnessione.
    };

    return () => {
      closed = true;
      source.close();
    };
  }, []);

  function openAddFood(mealId) {
    setSearchContext({ mode: 'add', mealId });
  }

  function openSwapFood(mealId, foodId) {
    setSearchContext({ mode: 'swap', mealId, foodId });
  }

  function handleSelectFood(food) {
    if (!searchContext) return;

    if (food.source === 'manual') {
      dispatch({ type: 'UPSERT_CUSTOM_FOOD', payload: { food } });
    }

    if (searchContext.mode === 'swap') {
      dispatch({
        type: 'SWAP_FOOD',
        payload: {
          mealId: searchContext.mealId,
          foodId: searchContext.foodId,
          food
        }
      });
    } else {
      dispatch({
        type: 'ADD_FOOD',
        payload: {
          mealId: searchContext.mealId,
          food,
          grams: food.defaultGrams ?? 100
        }
      });
    }

    setSearchContext(null);
  }

  function handleFoodDragStart({ mealId, foodId }) {
    setDraggedFood({ mealId, foodId });
  }

  function handleFoodDragEnd() {
    setDraggedFood(null);
    setDropTargetMealId(null);
  }

  function handleMealDragOver(event, mealId) {
    if (draggedFood?.mealId === mealId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (draggedFood) setDropTargetMealId(mealId);
  }

  function handleMealDragLeave(event, mealId) {
    if (!event.currentTarget.contains(event.relatedTarget) && dropTargetMealId === mealId) {
      setDropTargetMealId(null);
    }
  }

  function handleMealDrop(event, targetMealId) {
    event.preventDefault();

    let payload = draggedFood;

    try {
      const transferPayload = event.dataTransfer.getData('application/json');
      if (transferPayload) payload = JSON.parse(transferPayload);
    } catch {
      // Se il browser non restituisce dataTransfer valido, uso lo stato React.
    }

    if (payload?.mealId && payload?.foodId && payload.mealId !== targetMealId) {
      dispatch({
        type: 'MOVE_FOOD',
        payload: {
          sourceMealId: payload.mealId,
          targetMealId,
          foodId: payload.foodId
        }
      });
    }

    handleFoodDragEnd();
  }

  function addMeal() {
    const name = window.prompt('Nome del nuovo pasto', 'Nuovo pasto');
    if (!name?.trim()) return;
    dispatch({ type: 'ADD_MEAL', payload: { name: name.trim() } });
  }

  function importState(importedState) {
    dispatch({ type: 'HYDRATE_STATE', payload: importedState });
  }

  function resetState() {
    dispatch({ type: 'RESET_STATE' });
    setLastSavedAt(null);
    setStorageError('');
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-8 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-slate-300">
              Ciao, <span className="font-semibold text-white">{username}</span>
            </span>
            <button
              onClick={onLogout}
              className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
            >
              Esci
            </button>
          </div>
          <div className="mt-4 max-w-3xl">
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-indigo-100 ring-1 ring-white/10">
              Web App modelli dieta · Varianti · Swap · Open Food Facts
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Diet Planner Variants
            </h1>
            <p className="mt-3 text-lg text-slate-300">
              Non un diario giornaliero, ma un sistema per creare modelli alimentari stabili, duplicabili e modificabili con compensazione macro in tempo reale.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-5 max-w-7xl space-y-5 px-4 pb-12 lg:px-8">
        <TargetEditor target={state.target} tolerance={state.tolerance} dispatch={dispatch} />
        <DiffPanel target={state.target} totals={totals} diff={diff} tolerance={state.tolerance} />
        <PersistencePanel
          state={state}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          storageError={storageError}
          onImportState={importState}
          onResetState={resetState}
        />
        <VariantTabs variants={state.variants} activeVariantId={state.activeVariantId} dispatch={dispatch} />

        <BarcodeFoodMenu barcodeFoods={state.barcodeFoods} variants={state.variants} dispatch={dispatch} />

        <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between lg:p-5">
          <div>
            <h2 className="text-lg font-black text-slate-950">Variante attiva: {activeVariant?.name}</h2>
            <p className="text-sm text-slate-500">
              Trascina le card alimento da un pasto all'altro per riorganizzare il modello.
            </p>
          </div>
          <button onClick={addMeal} className="btn-secondary">Aggiungi pasto</button>
        </section>

        <div className="space-y-5">
          {activeVariant?.meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              dispatch={dispatch}
              onAddFood={openAddFood}
              onSwap={openSwapFood}
              onFoodDragStart={handleFoodDragStart}
              onFoodDragEnd={handleFoodDragEnd}
              onMealDragOver={handleMealDragOver}
              onMealDrop={handleMealDrop}
              onMealDragLeave={handleMealDragLeave}
              isDropTarget={dropTargetMealId === meal.id}
              isDraggingFromThisMeal={draggedFood?.mealId === meal.id}
            />
          ))}
        </div>
      </main>

      <FoodSearchModal
        open={Boolean(searchContext)}
        mode={searchContext?.mode}
        onClose={() => setSearchContext(null)}
        onSelect={handleSelectFood}
        customFoods={state.customFoods}
        onSaveCustomFood={(food) => dispatch({ type: 'UPSERT_CUSTOM_FOOD', payload: { food } })}
        onDeleteCustomFood={(foodId) => dispatch({ type: 'DELETE_CUSTOM_FOOD', payload: { foodId } })}
        onBarcodeFoodFound={(food) => dispatch({ type: 'UPSERT_BARCODE_FOOD', payload: { food } })}
      />
    </div>
  );
}