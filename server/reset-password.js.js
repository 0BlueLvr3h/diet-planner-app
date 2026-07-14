// Script admin per il database del server (server/data.db).
// Le password non sono recuperabili (nel DB c'e' solo l'hash): si imposta una NUOVA.
//
// Uso:
//   node reset-password.js --list                        -> elenca gli utenti
//   node reset-password.js <username> <nuova-password>   -> cambia la password
//   node reset-password.js --delete <username>           -> cancella un utente (+ la sua dieta)
//
// Funziona anche mentre il server e' acceso (SQLite in modalita' WAL lo consente).

import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import db from './db.js';

const [, , cmd, arg2] = process.argv;

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
    printUsage();
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
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

  console.log(`Password aggiornata per "${username}". Le sessioni attive sono state chiuse.`);
}

function deleteUser(username) {
  if (!username) {
    console.error('Uso: node reset-password.js --delete <username>');
    process.exit(1);
  }

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!user) {
    console.error(`Utente "${username}" non trovato. Usa --list per vedere gli utenti.`);
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(`ATTENZIONE: cancellare "${username}" elimina anche la sua dieta salvata. Operazione irreversibile.`);
  rl.question(`Per confermare, ridigita lo username "${username}": `, (answer) => {
    rl.close();
    if (answer.trim() !== username) {
      console.log('Annullato: lo username non corrisponde.');
      process.exit(0);
    }
    // ON DELETE CASCADE rimuove anche user_state e sessions collegati.
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    console.log(`Utente "${username}" cancellato (dieta e sessioni incluse).`);
    process.exit(0);
  });
}

function printUsage() {
  console.error('Uso:');
  console.error('  node reset-password.js --list');
  console.error('  node reset-password.js <username> <nuova-password>');
  console.error('  node reset-password.js --delete <username>');
}

if (cmd === '--list') {
  listUsers();
} else if (cmd === '--delete') {
  deleteUser(arg2);
} else if (!cmd) {
  printUsage();
  process.exit(1);
} else {
  resetPassword(cmd, arg2);
}