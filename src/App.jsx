import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import AppShell from './components/AppShell';
import BarcodeFoodMenu from './components/BarcodeFoodMenu';
import DiffPanel from './components/DiffPanel';
import FoodSearchModal from './components/FoodSearchModal';
import MealCard from './components/MealCard';
import PersistencePanel from './components/PersistencePanel';
import SaveBar from './components/SaveBar';
import TargetEditor from './components/TargetEditor';
import VariantTabs from './components/VariantTabs';
import WeekPlanner from './components/WeekPlanner';
import { BARCODE_BACKEND_URL, ENABLE_BARCODE_STREAM } from './constants';
import { createInitialState, dietReducer } from './state/dietReducer';
import { getOpenFoodFactsProductByBarcode } from './services/openFoodFacts';
import { calculateDiff, calculateVariantTotals } from './utils/macros';
import { buildPersistedDocument, getStoredMetadata, parseImportedDietState, saveStateToStorage } from './utils/storage';
import { apiGetState, apiPutState } from './services/api';

function readSaveMode() {
  try {
    return localStorage.getItem('dp_saveMode') === 'manual' ? 'manual' : 'auto';
  } catch {
    return 'auto';
  }
}

export default function App({ username, onLogout }) {
  const [state, dispatch] = useReducer(dietReducer, undefined, createInitialState);
  const [section, setSection] = useState('diet');
  const [searchContext, setSearchContext] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [lastSavedAt, setLastSavedAt] = useState(() => getStoredMetadata()?.savedAt ?? null);
  const [storageError, setStorageError] = useState('');
  const [draggedFood, setDraggedFood] = useState(null);
  const [dropTargetMealId, setDropTargetMealId] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // Salvataggio: auto vs manuale, e flag "modifiche non salvate".
  const [saveMode, setSaveMode] = useState(readSaveMode);
  const [dirty, setDirty] = useState(false);

  // Undo: storico degli stati precedenti + toast dopo un'eliminazione.
  const stateRef = useRef(state);
  stateRef.current = state;
  const historyRef = useRef([]);
  const [historyLen, setHistoryLen] = useState(0);
  const [undoToastAt, setUndoToastAt] = useState(0);

  const activeVariant = useMemo(
    () => state.variants.find((variant) => variant.id === state.activeVariantId) ?? state.variants[0],
    [state.variants, state.activeVariantId]
  );

  const totals = useMemo(() => calculateVariantTotals(activeVariant), [activeVariant]);
  const diff = useMemo(() => calculateDiff(state.target, totals), [state.target, totals]);

  // dispatch "tracciato": prima di applicare l'azione salva lo stato corrente
  // nello storico, cosi' l'undo puo' tornare indietro. Usato per le azioni utente.
  const dispatchTracked = useCallback((action) => {
    historyRef.current.push(stateRef.current);
    if (historyRef.current.length > 50) historyRef.current.shift();
    setHistoryLen(historyRef.current.length);
    if (/DELETE|REMOVE/i.test(action.type)) setUndoToastAt(Date.now());
    dispatch(action);
  }, []);

  const undo = useCallback(() => {
    const previous = historyRef.current.pop();
    setHistoryLen(historyRef.current.length);
    setUndoToastAt(0);
    if (previous !== undefined) dispatch({ type: 'HYDRATE_STATE', payload: previous });
  }, []);

  const doSave = useCallback(async () => {
    const doc = buildPersistedDocument(stateRef.current);
    saveStateToStorage(stateRef.current); // cache locale (offline / backup)
    const ok = await apiPutState(doc);
    if (ok) {
      setSaveStatus('saved');
      setLastSavedAt(doc.savedAt);
      setStorageError('');
      setDirty(false);
    } else {
      setSaveStatus('error');
      setStorageError('Non riesco a salvare sul server. Controlla la connessione.');
    }
    return ok;
  }, []);

  // Al login carico lo stato salvato sul server per questo utente (dispatch grezzo:
  // il caricamento non deve finire nello storico dell'undo).
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

  // Reazione a ogni modifica: in AUTO salva (debounce), in MANUALE marca "da salvare".
  useEffect(() => {
    if (!hydrated) return undefined;

    if (saveMode === 'manual') {
      setDirty(true);
      return undefined;
    }

    setSaveStatus('saving');
    const timeoutId = window.setTimeout(() => { doSave(); }, 600);
    return () => window.clearTimeout(timeoutId);
  }, [state, hydrated, saveMode, doSave]);

  // Salva la preferenza di modalita'.
  useEffect(() => {
    try { localStorage.setItem('dp_saveMode', saveMode); } catch { /* ignoro */ }
  }, [saveMode]);

  // Avviso se chiudi la pagina con modifiche non salvate (solo in manuale).
  useEffect(() => {
    function onBeforeUnload(event) {
      if (saveMode === 'manual' && dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveMode, dirty]);

  // Ctrl+Z / Cmd+Z per annullare (ignorato mentre scrivi in un campo).
  useEffect(() => {
    function onKeyDown(event) {
      const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'z' || event.key === 'Z');
      if (!isUndo) return;
      const el = event.target;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      event.preventDefault();
      undo();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo]);

  // Nasconde il toast dopo qualche secondo.
  useEffect(() => {
    if (!undoToastAt) return undefined;
    const timeoutId = window.setTimeout(() => setUndoToastAt(0), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [undoToastAt]);

  // Ponte col backend: ogni barcode scansionato dal telefono viene cercato su
  // Open Food Facts. Dispatch grezzo: gli scan automatici non vanno nell'undo.
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

  async function handleSaveNow() {
    setSaveStatus('saving');
    await doSave();
  }

  function openAddFood(mealId) {
    setSearchContext({ mode: 'add', mealId });
  }

  function openSwapFood(mealId, foodId) {
    setSearchContext({ mode: 'swap', mealId, foodId });
  }

  function handleSelectFood(food) {
    if (!searchContext) return;

    if (food.source === 'manual') {
      dispatchTracked({ type: 'UPSERT_CUSTOM_FOOD', payload: { food } });
    }

    if (searchContext.mode === 'swap') {
      dispatchTracked({
        type: 'SWAP_FOOD',
        payload: {
          mealId: searchContext.mealId,
          foodId: searchContext.foodId,
          food
        }
      });
    } else {
      dispatchTracked({
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
      dispatchTracked({
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
    dispatchTracked({ type: 'ADD_MEAL', payload: { name: name.trim() } });
  }

  function importState(importedState) {
    dispatchTracked({ type: 'HYDRATE_STATE', payload: importedState });
  }

  function resetState() {
    dispatchTracked({ type: 'RESET_STATE' });
    setStorageError('');
  }

  return (
    <>
      <AppShell section={section} onSectionChange={setSection} username={username} onLogout={onLogout}>
        <SaveBar
          mode={saveMode}
          onSetMode={setSaveMode}
          dirty={dirty}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          onSaveNow={handleSaveNow}
          canUndo={historyLen > 0}
          onUndo={undo}
        />

        {section === 'diet' && (
          <>
            <DiffPanel target={state.target} totals={totals} diff={diff} tolerance={state.tolerance} />
            <VariantTabs variants={state.variants} activeVariantId={state.activeVariantId} dispatch={dispatchTracked} />

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
                  dispatch={dispatchTracked}
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
          </>
        )}

        {section === 'barcode' && (
          <BarcodeFoodMenu barcodeFoods={state.barcodeFoods} variants={state.variants} dispatch={dispatchTracked} />
        )}

        {section === 'week' && (
          <WeekPlanner
            weekAssignments={state.weekAssignments}
            variants={state.variants}
            dispatch={dispatchTracked}
            onOpenVariant={(variantId) => {
              dispatchTracked({ type: 'SET_ACTIVE_VARIANT', payload: { variantId } });
              setSection('diet');
            }}
          />
        )}

        {section === 'settings' && (
          <>
            <TargetEditor target={state.target} tolerance={state.tolerance} dispatch={dispatchTracked} />
            <PersistencePanel
              state={state}
              saveStatus={saveStatus}
              lastSavedAt={lastSavedAt}
              storageError={storageError}
              onImportState={importState}
              onResetState={resetState}
            />
          </>
        )}
      </AppShell>

      {undoToastAt !== 0 && (
        <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
          <div className="flex items-center gap-4 rounded-full bg-slate-900 px-5 py-3 text-sm text-white shadow-2xl">
            <span>Elemento eliminato</span>
            <button onClick={undo} className="font-bold text-indigo-300 transition hover:text-indigo-200">
              Annulla
            </button>
          </div>
        </div>
      )}

      <FoodSearchModal
        open={Boolean(searchContext)}
        mode={searchContext?.mode}
        onClose={() => setSearchContext(null)}
        onSelect={handleSelectFood}
        customFoods={state.customFoods}
        barcodeFoods={state.barcodeFoods}
        onSaveCustomFood={(food) => dispatchTracked({ type: 'UPSERT_CUSTOM_FOOD', payload: { food } })}
        onDeleteCustomFood={(foodId) => dispatchTracked({ type: 'DELETE_CUSTOM_FOOD', payload: { foodId } })}
        onBarcodeFoodFound={(food) => dispatchTracked({ type: 'UPSERT_BARCODE_FOOD', payload: { food } })}
      />
    </>
  );
}