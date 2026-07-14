export default function VariantTabs({ variants, activeVariantId, dispatch }) {
  function addVariant() {
    const name = window.prompt('Nome nuova variante', `Nuova variante ${variants.length + 1}`);
    dispatch({ type: 'ADD_VARIANT', payload: { name: name?.trim() || undefined } });
  }

  function duplicateVariant() {
    const active = variants.find((variant) => variant.id === activeVariantId);
    const name = window.prompt('Nome variante duplicata', `${active?.name ?? 'Variante'} copia`);
    dispatch({ type: 'DUPLICATE_VARIANT', payload: { name: name?.trim() || undefined } });
  }

  // Rinomina la variante indicata, o quella attiva se non ne passo una.
  function renameVariant(variantId) {
    const targetId = variantId ?? activeVariantId;
    const variant = variants.find((item) => item.id === targetId);
    if (!variant) return;

    const name = window.prompt('Nuovo nome della variante', variant.name);
    if (name === null) return;
    if (!name.trim()) return;

    dispatch({ type: 'RENAME_VARIANT', payload: { variantId: targetId, name: name.trim() } });
  }

  function deleteVariant() {
    if (variants.length <= 1) return;
    const confirmed = window.confirm('Eliminare la variante attiva?');
    if (confirmed) dispatch({ type: 'DELETE_VARIANT' });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Varianti dieta</h2>
          <p className="text-sm text-slate-500">
            Crea modelli stabili, duplicali e modificali al volo. Doppio tocco su una variante per rinominarla.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={addVariant} className="btn-primary">Nuova variante</button>
          <button onClick={duplicateVariant} className="btn-secondary">Duplica</button>
          <button onClick={() => renameVariant()} className="btn-secondary">Rinomina</button>
          <button
            onClick={deleteVariant}
            disabled={variants.length <= 1}
            className="btn-danger disabled:cursor-not-allowed disabled:opacity-40"
          >
            Elimina
          </button>
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