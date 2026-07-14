// Script admin: reimposta la password di un utente, o elenca gli utenti.
// Le password non sono recuperabili (nel DB c'e' solo l'hash), quindi qui se ne
// imposta una NUOVA. Usa lo stesso database del server (server/data.db).
//
// Uso:
//   node reset-password.js --list                     -> elenca gli utenti
//   node reset-password.js <username> <nuova-password> -> cambia la password
//
// Funziona anche mentre il server e' acceso (SQLite in modalita' WAL lo consente).

import bcrypt from 'bcryptjs';
import db from './db.js';

const [, , cmd, newPassword] = process.argv;

function listUsers() {
  const users = db.prepare('SELECT id, username, created_at FROM users ORDER BY id').all();
  if (users.length === 0) {
    console.log('Nessun utente registrato.');
    return;
  }
  console.log('Utenti registrati:');
  for (const u of users) {
    console.log(`  #${u.id}  ${u.username}   (creato: ${u.created_at})`);
  }
}

function resetPassword(username, password) {
  if (!username || !password) {
    console.error('Uso: node reset-password.js <username> <nuova-password>');
    console.error('     node reset-password.js --list');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('La password deve avere almeno 6 caratteri.');
    process.exit(1);
  }

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!user) {
    console.error(`Utente "${username}" non trovato. Usa --list per vedere gli utenti.`);
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, username);
  // Chiude le sessioni attive: dovra' rifare login con la nuova password.
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

  console.log(`Password aggiornata per "${username}". Le sessioni attive sono state chiuse.`);
}

if (cmd === '--list') {
  listUsers();
} else {
  resetPassword(cmd, newPassword);
}