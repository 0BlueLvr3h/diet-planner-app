# Barcode backend

Backend minimale per la diet-planner app. Fa **solo da tramite**: riceve un codice a
barre e lo inoltra al frontend. La ricerca su Open Food Facts resta nel frontend
(`getOpenFoodFactsProductByBarcode()`), il backend non la tocca.

Copia questa cartella `server/` nella root del progetto `diet-planner-app/`.

## Avvio

```bash
cd server
npm install
npm start          # oppure: npm run dev  (riavvio automatico)
```

In ascolto su `http://0.0.0.0:3001` (porta configurabile con `PORT=...`).

Apri `http://localhost:3001/` per la **pagina di test**: invia un codice a mano e lo
vedi arrivare in tempo reale. È esattamente ciò che farà il telefono con la POST.

## API

| Metodo | Rotta                   | Cosa fa                                                        |
|--------|-------------------------|---------------------------------------------------------------|
| POST   | `/api/barcode`          | Riceve `{ "code": "...", "source": "..." }`. Rispone `202`.    |
| GET    | `/api/barcode/stream`   | Canale SSE: il frontend resta in ascolto e riceve ogni scan.  |
| GET    | `/api/barcode/latest`   | Ultimo scan (o `null`). Fallback via polling / test con curl. |
| GET    | `/api/barcode/history`  | Ultimi 20 scan (debug).                                        |
| GET    | `/api/health`           | `{ status: "ok", clients: N }`.                               |

Test rapido:

```bash
curl -X POST localhost:3001/api/barcode \
  -H 'Content-Type: application/json' \
  -d '{"code":"8000500310427","source":"curl"}'

curl localhost:3001/api/barcode/latest
```

## Come lo consumerà il frontend (prossimo step)

Un piccolo hook che apre la EventSource e, a ogni scan, chiama la ricerca esistente:

```js
useEffect(() => {
  const es = new EventSource('http://<ip-backend>:3001/api/barcode/stream');
  es.onmessage = (e) => {
    const { code } = JSON.parse(e.data);
    getOpenFoodFactsProductByBarcode(code).then(/* mostra il prodotto */);
  };
  return () => es.close();
}, []);
```

In sviluppo conviene aggiungere un proxy in `vite.config.js` così il frontend chiama
`/api/...` senza problemi di CORS:

```js
server: { proxy: { '/api': 'http://localhost:3001' } }
```

## Note

- `cors()` è aperto per lo sviluppo: in produzione restringi all'origine del frontend.
- Nessun DB: lo stato (ultimo scan + storico breve) è in memoria e si azzera al riavvio.
- Il backend usa plain HTTP: va benissimo per riceverlo. L'HTTPS serve solo più avanti,
  lato pagina-telefono, perché il browser dà accesso alla fotocamera solo in HTTPS.
