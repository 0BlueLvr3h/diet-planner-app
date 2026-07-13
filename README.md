# Diet Planner Variants App

Web app responsive React + Tailwind per creare modelli di dieta, varianti, pasti, swap alimenti e compensazione macro usando Open Food Facts con fallback mock locale.

## Setup

```bash
npm install
npm run dev
```

Apri l'URL mostrato da Vite, di solito http://localhost:5173.

## Build produzione

```bash
npm run build
npm run preview
```

## Note API

La ricerca usa gli endpoint pubblici di Open Food Facts:

- `/api/v2/search?search_terms=...`
- `/api/v2/product/{BARCODE}.json`

Se la chiamata fallisce o non restituisce risultati, puoi usare il fallback locale presente in `src/data/mockFoods.json`.

## Update ricerca paginata resiliente

La ricerca Open Food Facts ora mantiene lo stato della pagina quando una chiamata fallisce: se la pagina successiva non risponde, appare il pulsante **Riprova pagina N** e i risultati già caricati restano visibili. Il pulsante **Cerca API** resta disponibile per lanciare una nuova ricerca dalla prima pagina.

La chiamata testuale usa prima `cgi/search.pl` e, se l'endpoint non risponde dopo un retry automatico, prova il fallback `/api/v2/search` sulla stessa query e sulla stessa pagina.

## Update ricerca alimenti più precisa

- I risultati a bassa pertinenza non sono più mostrati di default: si possono ancora visualizzare attivando **Mostra anche risultati poco pertinenti**.
- Il ranking ora controlla i termini della query su nome, brand, quantità e categorie con match per parola, riducendo i match casuali dovuti a semplici sottostringhe.
- Il pulsante **Pagina successiva** viene abilitato solo se la pagina successiva contiene prodotti effettivamente mostrabili con i filtri attivi.
