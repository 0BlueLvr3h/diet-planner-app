// Chiamate al backend: autenticazione + salvataggio stato per utente.
// URL relativi = stessa origine (il frontend e' servito dallo stesso server),
// quindi il cookie di sessione viaggia in automatico.

async function request(path, options = {}) {
  return fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
}

export async function apiMe() {
  const res = await request('/api/auth/me');
  if (!res.ok) return null;
  return res.json();
}

export async function apiRegister(username, password) {
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Registrazione fallita.');
  return data;
}

export async function apiLogin(username, password) {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Login fallito.');
  return data;
}

export async function apiLogout() {
  try { await request('/api/auth/logout', { method: 'POST' }); } catch { /* ignoro */ }
}

export async function apiGetState() {
  const res = await request('/api/state');
  if (!res.ok) return null;
  return res.json();     // il documento salvato, oppure null
}

export async function apiPutState(doc) {
  try {
    const res = await request('/api/state', { method: 'PUT', body: JSON.stringify(doc) });
    return res.ok;
  } catch {
    return false;
  }
}
