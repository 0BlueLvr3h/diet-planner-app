import { useRef, useState } from 'react';
import { APP_SCHEMA_VERSION, BACKUP_FILE_PREFIX } from '../constants';
import { clearStateFromStorage, exportDietState, parseImportedDietState } from '../utils/storage';

function formatDateTime(value) {
  if (!value) return 'non ancora salvato';

  try {
    return new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function makeBackupFilename() {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
  return `${BACKUP_FILE_PREFIX}-${stamp}.json`;
}

export default function PersistencePanel({ state, saveStatus, lastSavedAt, storageError, onImportState, onResetState, dispatch }) {
  const fileInputRef = useRef(null);
  const [importError, setImportError] = useState('');
  const [chatId, setChatId] = useState(state.telegramChatId || '');

  const BOT_URL = 'https://t.me/DietaAppShoppingListBot';

  function salvaChatId() {
    dispatch({ type: 'SET_TELEGRAM_CHAT_ID', payload: { chatId: chatId.trim() } });
  }

  function exportJson() {
    const json = exportDietState(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = makeBackupFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const importedState = parseImportedDietState(text);
      setImportError('');
      onImportState(importedState);
    } catch (error) {
      setImportError(error.message || 'Import non riuscito.');
    }
  }

  function resetLocalData() {
    const confirmed = window.confirm(
      'Vuoi cancellare il salvataggio locale e ripartire dal modello iniziale? Questa azione non elimina eventuali file JSON esportati.'
    );

    if (!confirmed) return;
    clearStateFromStorage();
    setImportError('');
    onResetState();
  }

  return (
    <>
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">Persistenza dieta</h2>
          <p className="mt-1 text-sm text-slate-500">
            Autosave locale versionato, più export/import JSON per backup manuale o passaggio su un altro browser.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Schema v{APP_SCHEMA_VERSION}</span>
            <span
              className={`rounded-full px-3 py-1 ${
                saveStatus === 'saving'
                  ? 'bg-amber-100 text-amber-700'
                  : storageError
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {saveStatus === 'saving' ? 'Salvataggio...' : storageError ? 'Errore salvataggio' : 'Autosave attivo'}
            </span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
              Ultimo salvataggio: {formatDateTime(lastSavedAt)}
            </span>
          </div>
          {(storageError || importError) && (
            <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {storageError || importError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={exportJson} className="btn-secondary">
            Esporta JSON
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
            Importa JSON
          </button>
          <button onClick={resetLocalData} className="btn-danger">
            Reset locale
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={importJson}
          />
        </div>
      </div>
    </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:p-5">
        <h3 className="font-black text-slate-900">Collega Telegram</h3>
        <p className="mt-1 text-sm text-slate-500">
          Ricevi la lista della spesa come messaggio sul telefono.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>
            <a href={BOT_URL} target="_blank" rel="noreferrer" className="font-bold text-indigo-600 underline">
              Apri il bot
            </a>{' '}
            e premi <strong>Avvia</strong> (o scrivi /start).
          </li>
          <li>Copia il codice che ti risponde e incollalo qui sotto.</li>
        </ol>
        <div className="mt-3 flex gap-2">
          <input
            value={chatId}
            onChange={(event) => setChatId(event.target.value)}
            placeholder="Codice Telegram (es. 123456789)"
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 font-semibold outline-none ring-indigo-200 focus:ring-4"
          />
          <button onClick={salvaChatId} className="btn-primary">Salva</button>
        </div>
        {state.telegramChatId ? (
          <p className="mt-2 text-sm font-semibold text-emerald-700">Telegram collegato ✓</p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">Non ancora collegato.</p>
        )}
      </section>
    </>
  );
}
