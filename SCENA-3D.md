# La scena 3D — handoff

Come funziona la hero di Agrumì, e soprattutto **perché** funziona così.
Le decisioni non ovvie sono annotate col loro motivo: parecchie sono il
risultato di strade sbagliate già percorse, e rifarle costa tempo.

Per lo stato del progetto e cosa c'è da fare: `ROADMAP.md`.
Per il concept e i vincoli di partenza: `CLAUDE.md`.

---

## In una frase

Un diorama papercraft 2.5D: sagome di carta ritagliate, disposte su piani
piatti a profondità diverse, viste con camera **ortografica**. Non è una scena
3D esplorabile — la profondità nasce dallo sfasamento in parallasse, non dalla
prospettiva.

Vive su `#/diorama2`. La home è volutamente vuota; `#/diorama` è una versione
precedente a 5 piani, tenuta funzionante ma superata.

---

## 1. Dagli asset alla scena

### La pipeline

`tools/prep-layers.mjs` legge i PNG esportati da Photoshop
(`scena 3d/layer da gen 1 - 3`) e produce `public/layers/*.webp` più
`src/diorama/manifest.json`.

Gli export sono **tutti a tela piena 3584×4800** e quasi interamente vuoti.
Caricarli così significherebbe ~69 MB di VRAM per layer, ~1.8 GB in totale:
insostenibile. Lo script quindi ritaglia ciascuno al suo bounding box alpha e
salva nel manifest la **posizione normalizzata sulla tela originale**. Il file
diventa piccolo ma sa dov'era: l'allineamento di Photoshop resta esatto al
pixel, senza riposizionare niente a mano.

24 MB di PNG → 0.7 MB di WebP.

### L'ordine Z

Viene dal **numero messo a mano nei nomi dei livelli PSD** (`0` sfondo, `1`
albero, … `5` foglie davanti, e `3.1.0`…`3.1.3` per i pezzi del gatto), non
dall'ordine dei file. A parità di numero decide l'indice dell'exporter, al
contrario: Photoshop numera dall'alto dello stack, quindi indice più alto
significa più indietro.

Due trappole già incontrate:

- **il prefisso del nome file lo decide Photoshop e cambia a ogni sessione**
  (`hero_…` è diventato `composite_demo_step_3_…`). Non ci si fa affidamento:
  si cerca la catena di indici, che è l'unica parte con forma fissa;
- **gli indici vanno confrontati come lista di numeri, non concatenati.** Il
  `3` di `step_3` finiva nella catena e la cifra risultante sforava la
  precisione degli interi, mandando in pattume l'ordinamento — sintomo: il
  logo dietro l'insegna.

### Verificare senza browser

`node tools/check-manifest.mjs` ricompone gli sprite su tela piena usando
**solo** gli offset del manifest e salva un PNG. È il modo per controllare
l'allineamento quando non c'è un browser headless a disposizione, ed è servito
ogni volta che gli asset sono cambiati.

### Rigenerare

```
node tools/prep-layers.mjs      # asset + manifest
node tools/check-manifest.mjs   # verifica allineamento
```

Lo script gestisce anche: livelli da saltare (`SKIP`, per il gatto intero
sostituito dai pezzi), il fondale di carta preso dal livello `sfondo nuovo`, e
gli asset di interfaccia (il limone della CTA, in WebP più fallback PNG).

---

## 2. Come è disegnata

### Coordinate

Il mondo è normalizzato: **altezza tela = 1**, larghezza = aspect del PSD
(≈ 0.747). Origine al centro, Y verso l'alto.

Il manifest usa invece coordinate tela: `(0,0)` in alto a sinistra, `(1,1)` in
basso a destra. La conversione sta in `computeGeom` (`Sprite.jsx`), che è
l'unico punto in cui le due convenzioni si incontrano.

### Materiali

Tutto **unlit** (`meshBasicMaterial`), `transparent`, `toneMapped: false`.
Nessuna luce dinamica, nessun materiale PBR: è carta opaca, e le ombre di
contatto sono già cotte nei render.

**`depthWrite: false` e `depthTest: false`.** L'ordine di disegno lo decide
solo `renderOrder`. Con ~29 piani trasparenti sovrapposti il depth test
taglierebbe le sfumature di alpha ai bordi, e il risultato sono contorni
netti dove dovrebbero esserci transizioni morbide.

Conseguenza da ricordare: **la posizione Z non conta niente visivamente.**
Serve solo alla `separazione Z` del pannello, che allontana i piani per
ispezionare il diorama con l'orbit control.

### Camera

Ortografica, in **cover-fit**: riempie sempre il viewport ritagliando il lato
che avanza. Su 9:16 il PSD (3:4) viene tagliato ai fianchi e non lascia bordi.

`near` è a **-100**: con la separazione Z attiva i piani finiscono davanti alla
camera e sparirebbero.

Il cover-fit si riapplica al resize **solo a orbit spento**, altrimenti
sovrascriverebbe lo zoom scelto a mano.

---

## 3. I layer

`depth.js` è la tabella di regia. Cinque cose, tutte dichiarative:

| | cosa fa |
|---|---|
| `GROUPS` | profondità e reattività al vento, per gruppo |
| `FOLLOWS` | layer solidali a un altro (vedi §4) |
| `SCALE` | correzioni di scala su singoli layer |
| `HIDDEN` | caricati ma non disegnati (la testa a occhi chiusi del blink) |
| `NO_SHADOW` | non proiettano ombra (il logo, stampato sulla targa) |

`groupKeyFor()` decide a quale gruppo appartiene un layer. Due eccezioni
rispetto al numero PSD: **nuvole e uccelli** stanno nel gruppo 4 (disegnati
davanti) ma nella finzione sono lontani, e **il gatto** ha voce propria perché
il vento non lo tocca — si muove col suo rig.

Profondità e ordine di disegno sono quindi **due cose separate**: la prima è
regia, il secondo viene dal PSD.

---

## 4. Sprite

`Sprite.jsx` è il cuore. Struttura a due nodi:

- un `<group>` sul **perno**, che porta tutte le trasformazioni;
- dentro, la mesh spostata perché l'immagine cada al posto giusto.

**Perché il perno conta.** Ruotare attorno al centro dell'immagine farebbe
*scivolare* una foglia invece di farla ondeggiare. Di default il perno è il
bordo inferiore del bounding box — giusto per una foglia attaccata a un ramo.
Per il gatto no: la testa deve girare attorno alla base del collo, e i perni
espliciti stanno in `rig.js`.

### Annidamento

Uno Sprite può contenere altri Sprite. Un layer dichiarato in `FOLLOWS` viene
reso **dentro** il gruppo del padre e ne eredita vento, parallasse e
profondità — ma conserva perno e animazioni proprie.

Serve a due casi:

- **il logo sull'insegna**: aveva fase casuale e bounding box propri, quindi
  scivolava via dalla targa su cui è stampato;
- **il gatto sul ramo**: è poggiato sul ramo orizzontale, e senza questo
  restava sospeso mentre il ramo oscillava. Continua intanto a respirare e a
  muovere testa e coda.

Uno sprite annidato **non riapplica** vento, parallasse e Z: arrivano dal
padre, e ricalcolarli li conterebbe due volte.

### I movimenti

Tutti procedurali in `useFrame`, nessuna clip bakata.

- **vento**: somma di due seni a frequenze in rapporto irrazionale (non si
  ripete mai uguale), fase fissa per layer (altrimenti oscillano all'unisono),
  il tutto modulato da una folata lenta — il vento «respira». Il parametro
  *folata* è la frequenza di quel respiro: a 0.15 il ciclo dura ~40 secondi;
- **parallasse**: scarto proporzionale alla profondità, tutto su X/Y perché in
  ortografica la Z non dà profondità. Spenta di default;
- **respiro** (corpo del gatto): scala minima col perno in basso, orizzontale
  più della verticale — un torace si allarga, non si allunga;
- **idle della testa**: comportamento principale su telefono. **Non c'è nessun
  seno, di proposito**: un gatto sta fermo a lungo, gira la testa e torna
  fermo. Sceglie una posa, la raggiunge, la tiene; spesso torna dritto invece
  di cercare un altro angolo, altrimenti sembra che cerchi qualcosa senza mai
  trovarlo;
- **inseguimento del puntatore**: additivo all'idle, con zona morta (evita il
  tremolio da servomotore). Spento di default, è interazione da desktop;
- **coda** (`bend.js`): piegata sui **vertici**, non ruotata rigida — una coda
  rigida sembra un tergicristallo. L'angolo cresce verso la punta ed è sfasato
  lungo la lunghezza, così il movimento si propaga come un'onda da un pezzo
  solo, senza catene di segmenti da esportare. La piegatura vale anche per la
  sagoma d'ombra, altrimenti l'ombra resterebbe dritta;
- **blink**: scambio secco di texture, 90ms, intervalli irregolari, a volte
  doppio. La testa a occhi chiusi ha **lo stesso bounding box** di quella
  aperta, quindi non serve un layer in più: si cambia la mappa sulla stessa
  mesh.

---

## 5. Ombre (`ShadowPass.jsx`)

Le sagome finiscono su un **layer dedicato di three.js**, vengono disegnate in
un render target, sfocate una volta sola con una gaussiana separabile, e
composte fra il fondale e gli sprite.

**Perché così, e non sfocando ogni ombra per conto suo.** È stato provato e non
regge: per un raggio ampio servono centinaia di campioni per pixel, e le
scorciatoie peggiorano le cose. Il tentativo coi mipmap produceva **rettangoli
pieni** — a raggio alto il livello mip collassa all'alpha medio della sagoma e
riempie uniformemente il quad.

Vantaggi della versione attuale:

- è una sfocatura vera, nessun artefatto per quanto si alzi il raggio;
- le ombre si **uniscono col massimo** nel buffer prima della composizione,
  quindi due sagome sovrapposte danno una sola ombra e l'opacità agisce sul
  risultato come un pezzo unico;
- il buffer sta a risoluzione ridotta e la riduzione stessa fa parte della
  sfocatura.

**Trappola.** Lo sfondo della scena va tolto per la durata della passata
(`scene.background = null` e ripristino): three lo disegnerebbe anche nel
buffer, riempiendolo di opaco e coprendo tutto lo schermo d'ombra.

`ShadowPass` gira a **priorità 1** in `useFrame`, il che disattiva il rendering
automatico di R3F: il ciclo di disegno lo gestisce lui. Se un giorno la scena
non appare più, è il primo posto dove guardare.

La sfocatura è espressa in **pixel a schermo**, non del buffer: cambiando
risoluzione cambia la qualità, non l'entità. Le passate ripetute dividono il
raggio per la radice del loro numero, quindi levigano senza allargare.

---

## 6. Fondale e CTA

**`Backdrop.jsx`** — muro di carta più un pavimento tinta unita. Sostituisce
`0-sfondo`, che è la composizione finale appiattita: comoda come riferimento,
ma inchioda la parallasse, perché lì dentro ogni elemento è già al suo posto.
Resta accessibile da pannello come confronto.

**`Cta.jsx`** — è HTML sopra il canvas, non una mesh. Testo vettoriale nitido a
qualsiasi densità, `<button>` vero (tastiera, lettori di schermo, focus), e si
cambia senza riesportare niente.

Sceglie di **non** somigliare alla scena: il diorama è un mondo di carta
materico e affollato, e un bottone anch'esso di carta diventerebbe un altro
oggetto del collage invece che qualcosa da toccare. Il navy viene dall'insegna,
dove però compare solo come inchiostro: è l'unico colore che la scena non usa
come superficie.

---

## 7. Il pannello (leva)

`controls.jsx`. È lo strumento di lavoro principale — praticamente ogni valore
della scena è stato trovato lì, non scritto a mano.

**Come si usa.** Si tarano i parametri a occhio, si preme **Esporta JSON** (li
copia negli appunti e li stampa in console), si incolla il risultato in chat e
i valori vengono riversati nel codice. Mai trascrivere a mano.

Cartelle:

| | |
|---|---|
| **Viewport** | anteprima nelle dimensioni dell'area **davvero visibile** su telefono, già al netto delle barre del browser |
| **Rig gatto** | perni, respiro, idle, inseguimento, coda, blink |
| **Camera** | orbit control, separazione Z, reset vista |
| **Sfondo** | composito appiattito, pavimento, orizzonte |
| **Ombre** | direzione, distanza, risoluzione, sfocatura, passate, opacità, colore |
| **Parallasse** | intensità, morbidezza, giroscopio |
| **Vento** | ampiezza, le due frequenze, folata |
| **Piani** | profondità e vento per gruppo |

**Editor dei perni.** Con `modifica perni` attivo si clicca sulla scena nel
punto di rotazione del pezzo selezionato: il perno appare in giallo, gli altri
in bianco, e l'export li include. Piazzarli a numeri sarebbe frustrante.

**Comportamento del pannello.** Da fermo scende al 5% di opacità e torna pieno
al passaggio del puntatore, così non falsa il giudizio sulla composizione. La
barra spaziatrice apre e chiude.

Un dettaglio non ovvio: l'opacità tiene conto anche del **trascinamento**.
Gli slider di leva catturano il puntatore, quindi trascinando si esce dal
pannello e il solo `:hover` cadrebbe — facendolo sparire proprio mentre lo si
sta regolando.

---

## 8. Trappole, in breve

- l'ordine di disegno viene dai **numeri nei nomi dei livelli PSD**: cambiarli
  in Photoshop cambia la scena, e nessun ordinamento nel codice va «corretto»
  senza sapere questo;
- `depthTest` è **off** ovunque: la Z non ordina niente, lo fa `renderOrder`;
- `ShadowPass` ha in mano il ciclo di rendering;
- le texture sono in `public/`, il manifest in `src/` — Vite avverte se si
  importa JSON da `public/`;
- il gatto è **figlio del ramo**: spostare il ramo sposta il gatto, ed è voluto;
- il giroscopio richiede **HTTPS** (`HTTPS=1 pnpm dev`) e, su iOS, un permesso
  concesso durante un gesto dell'utente.

---

## 9. Mappa dei file

```
src/diorama/
  Diorama.jsx     canvas, camera, albero dei layer, input parallasse
  Sprite.jsx      un layer: perno, annidamento, movimenti
  ShadowPass.jsx  buffer delle ombre, sfocatura, composizione
  Backdrop.jsx    muro e pavimento
  Cta.jsx         bottone di prenotazione (DOM, non scena)
  PivotEditor.jsx piazzamento dei perni col clic
  controls.jsx    pannello leva ed export
  depth.js        tabella di regia dei layer
  rig.js          pezzi e perni del gatto
  bend.js         piegatura della coda
  manifest.json   generato — non modificare a mano

tools/
  prep-layers.mjs    PSD → WebP + manifest + asset UI
  check-manifest.mjs verifica l'allineamento senza browser
```
