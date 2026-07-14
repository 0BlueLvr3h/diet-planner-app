export default function SaveBar({ mode, onSetMode, dirty, saveStatus, lastSavedAt, onSaveNow, canUndo, onUndo }) {
  const savedTime = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
      {/* Toggle modalita' salvataggio */}
      <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
        <button
          onClick={() => onSetMode('auto')}
          className={`rounded-lg px-3 py-1.5 transition ${mode === 'auto' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Auto
        </button>
        <button
          onClick={() => onSetMode('manual')}
          className={`rounded-lg px-3 py-1.5 transition ${mode === 'manual' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Manuale
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          title="Annulla (Ctrl+Z)"
        >
          Annulla
        </button>

        {mode === 'manual' ? (
          dirty ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-amber-600">Non salvato</span>
              <button
                onClick={onSaveNow}
                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Salva ora
              </button>
            </div>
          ) : (
            <span className="text-sm font-medium text-emerald-600">Tutto salvato</span>
          )
        ) : (
          <span className="text-sm font-medium text-slate-500">
            {saveStatus === 'saving'
              ? 'Salvataggio…'
              : saveStatus === 'error'
                ? 'Errore salvataggio'
                : savedTime
                  ? `Salvato · ${savedTime}`
                  : 'Salvato'}
          </span>
        )}
      </div>
    </div>
  );
}