import { useState } from 'react';

export default function VariantTabs({ variants, activeVariantId, dispatch }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeVariant = variants.find((variant) => variant.id === activeVariantId);
  const canDelete = variants.length > 1;

  function addVariant() {
    const name = window.prompt('Nome nuova variante', `Nuova variante ${variants.length + 1}`);
    if (name === null) return;
    dispatch({ type: 'ADD_VARIANT', payload: { name: name.trim() || undefined } });
  }

  function duplicateVariant() {
    const name = window.prompt('Nome variante duplicata', `${activeVariant?.name ?? 'Variante'} copia`);
    if (name === null) return;
    dispatch({ type: 'DUPLICATE_VARIANT', payload: { name: name.trim() || undefined } });
  }

  // Rinomina la variante indicata, o quella attiva se non ne passo una.
  function renameVariant(variantId) {
    const targetId = variantId ?? activeVariantId;
    const variant = variants.find((item) => item.id === targetId);
    if (!variant) return;

    const name = window.prompt('Nuovo nome della variante', variant.name);
    if (name === null || !name.trim()) return;

    dispatch({ type: 'RENAME_VARIANT', payload: { variantId: targetId, name: name.trim() } });
  }

  function deleteVariant() {
    if (!canDelete) return;
    if (window.confirm(`Eliminare la variante "${activeVariant?.name}"?`)) {
      dispatch({ type: 'DELETE_VARIANT' });
    }
  }

  // Ogni voce del menu chiude il menu prima di agire (i prompt bloccano il thread).
  function runFromMenu(action) {
    setMenuOpen(false);
    window.setTimeout(action, 0);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Varianti dieta</h2>
          <p className="text-sm text-slate-500">
            Crea modelli stabili, duplicali e modificali al volo. Doppio tocco su una variante per rinominarla.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button onClick={addVariant} className="btn-primary">Nuova variante</button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Altre azioni sulla variante attiva"
              aria-expanded={menuOpen}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-600 transition hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                  <div className="truncate px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {activeVariant?.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => runFromMenu(duplicateVariant)}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Duplica
                  </button>
                  <button
                    type="button"
                    onClick={() => runFromMenu(() => renameVariant())}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Rinomina
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => runFromMenu(deleteVariant)}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                  >
                    Elimina
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {variants.map((variant) => {
          const active = variant.id === activeVariantId;
          return (
            <button
              key={variant.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_VARIANT', payload: { variantId: variant.id } })}
              onDoubleClick={() => renameVariant(variant.id)}
              title="Doppio clic per rinominare"
              className={`whitespace-nowrap rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                active
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              {variant.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}