import { useEffect, useState } from 'react';
import { apiLogin, apiLogout, apiMe, apiRegister } from '../services/api';

// Cancello del login: finche' non sei autenticato, l'app non si vede.
export default function AuthGate({ children }) {
  const [status, setStatus] = useState('loading'); // loading | out | in
  const [username, setUsername] = useState('');

  useEffect(() => {
    apiMe().then((me) => {
      if (me && me.username) {
        setUsername(me.username);
        setStatus('in');
      } else {
        setStatus('out');
      }
    });
  }, []);

  async function handleLogout() {
    await apiLogout();
    setUsername('');
    setStatus('out');
  }

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-500">
        Caricamento…
      </div>
    );
  }

  if (status === 'out') {
    return <LoginScreen onAuthed={(name) => { setUsername(name); setStatus('in'); }} />;
  }

  return children({ username, onLogout: handleLogout });
}

function LoginScreen({ onAuthed }) {
  const [mode, setMode] = useState('login'); // login | register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const action = isLogin ? apiLogin : apiRegister;
      const data = await action(username.trim(), password);
      onAuthed(data.username);
    } catch (err) {
      setError(err.message || "Qualcosa e' andato storto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-black text-slate-950">Diet Planner</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isLogin ? 'Accedi per ritrovare le tue diete.' : 'Crea un account per salvare le tue diete.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? 'Attendi…' : isLogin ? 'Accedi' : 'Registrati'}
          </button>
        </form>

        <button
          onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); }}
          className="mt-4 w-full text-sm text-slate-500 transition hover:text-slate-800"
        >
          {isLogin ? 'Non hai un account? Registrati' : "Hai gia' un account? Accedi"}
        </button>
      </div>
    </div>
  );
}
