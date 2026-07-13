import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist');   // il frontend React compilato

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// --- Stato in memoria (nessun DB: e' un semplice tramite) --------------------
let lastScan = null;
const history = [];
const HISTORY_MAX = 20;
const sseClients = new Set();

function broadcast(scan) {
  const payload = `data: ${JSON.stringify(scan)}\n\n`;
  for (const res of sseClients) res.write(payload);
}

// --- API ---------------------------------------------------------------------
app.post('/api/barcode', (req, res) => {
  const raw = req.body && req.body.code;
  const code = typeof raw === 'string' ? raw.trim() : '';
  if (!code) return res.status(400).json({ error: 'Campo "code" mancante o vuoto.' });

  const scan = {
    code,
    source: String((req.body && req.body.source) || 'unknown'),
    at: new Date().toISOString(),
  };

  lastScan = scan;
  history.unshift(scan);
  if (history.length > HISTORY_MAX) history.pop();

  broadcast(scan);
  return res.status(202).json(scan);
});

app.get('/api/barcode/latest', (_req, res) => res.json(lastScan));
app.get('/api/barcode/history', (_req, res) => res.json(history));

app.get('/api/barcode/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  if (lastScan) res.write(`data: ${JSON.stringify(lastScan)}\n\n`);

  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  sseClients.add(res);

  req.on('close', () => {
    clearInterval(ping);
    sseClients.delete(res);
  });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', clients: sseClients.size }));

// --- Frontend React compilato ------------------------------------------------
app.use(express.static(distPath));
app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});