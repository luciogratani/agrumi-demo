# Backlog

Aggiornato il 22/07/2026. Un solo posto per il piano e per le cose parcheggiate:
due elenchi separati divergono, ed è così che si perdono i pezzi.

**Il criterio d'ordine — cosa si deteriora se rimandato.** Il backend non si
deteriora: si fa bene anche senza ispirazione e il risultato non cambia. Il
lavoro creativo sì: rimandato, quando lo si riprende ci si accontenta. Finché il
mood c'è, va speso su ciò che solo il mood può produrre.

---

## Fase 1 — chiudere la prima impressione

Alla fine c'è una hero **completa e mostrabile**.

### 1.1 CTA della hero — da fare

È l'unica cosa che manca alla fase 1. Gli asset ci sono già
(`public/ui/cta-limone.webp` + fallback PNG, generati da `prep-layers.mjs`); il
codice no: `Cta.jsx` era stato scritto e poi rimosso.

- HTML/SVG **sopra** il canvas, mai una mesh: testo vettoriale nitido a ogni
  densità, `<button>` vero (tastiera, lettori di schermo, focus), e si cambia
  senza riesportare niente;
- **non deve somigliare alla scena.** Il diorama è un collage di carta affollato:
  un bottone anch'esso di carta diventa un altro oggetto del collage invece che
  qualcosa da toccare. Il navy dell'insegna è l'unico colore che la scena non usa
  mai come superficie — vedi [`interfaccia.md`](interfaccia.md);
- sblocca lo **sguardo del gatto verso la CTA**, già rimandato una volta;
- l'intro esiste già: la CTA dovrà entrare per ultima, dentro quel movimento.

Da decidere: se porta al booking in pagina (cioè fa `go(-1)`) o altrove.

### 1.2 Precaricamento reale nel loader — mezzo fatto

La schermata di caricamento c'è ([`loading-screen.md`](loading-screen.md)), ma
la barra non conosce un numero: si avvicina al 90% e rallenta. Il gancio
`window.__loader.progress(v)` è già lì e aspetta la sorgente vera.

«Reale» ha un significato tecnico preciso: non basta attendere il download delle
texture, va forzato il **caricamento sulla GPU** (`renderer.initTexture`). Senza,
al primo fotogramma c'è comunque uno scatto mentre vengono trasferite — è la
differenza fra un preloader vero e uno finto.

### 1.3 Rifiniture della transizione

- il gesto è **discreto**: superata la soglia parte tutto. Trascinare il diorama
  seguendo il dito, con snap al rilascio, sarebbe più ricco — ma ha senso solo
  ora che il movimento in sé convince;
- durata a 2 s: giusta per valutare, probabilmente lunga per una navigazione
  ripetuta. È il primo numero da rivedere quando diventa il gesto vero.

---

## Fase 2 — il prodotto

### 2.0 Scegliere la tipografia

Non c'è: tutto gira su `system-ui`, che è l'assenza di una scelta. È il singolo
intervento che cambierà di più il carattere del sito, e va fatto **prima** di
costruire menu e form definitivi — rifarla dopo significa ritarare ogni
spaziatura. Vincoli: peso in rete, e un display face che regga accanto a un
diorama di carta senza fare il verso all'illustrazione.

### 2.1 Componenti reali: menu e form di prenotazione

Il booking ha ora la sua carta vera — foglio, righe e barra ritagliati dal PSD,
impaginati dal manifest — ma resta un **prototipo di interfaccia**: stato locale,
non invia niente. Quello che gli manca, in ordine:

- **le icone in vettoriale.** Adesso ce ne sono tre segnaposto in `icone.jsx`,
  disegnate su griglia 24 in `currentColor`: sostituirle è cambiare il contenuto
  dei tre `<svg>` e nient'altro;
- **il font** (§2.0), che è la cosa che cambierà di più come si legge la carta;
- **gli elementi di contesto** attorno alla carta — rami, sgabello, gatto — che
  vanno nel diorama come Sprite col loro vento e la loro corsa d'ingresso, non
  nel DOM: la carta è il confine fra il mondo e l'interfaccia;
- l'invio vero, che dipende da §2.2.

Il menu è ancora un segnaposto, ed è lì che vale la pena spendere l'azzardo
visivo, perché non c'è niente da compilare.

**È il punto del sito.** Sta dopo la fase 1 non perché conti meno, ma perché è un
registro creativo diverso — tipografia, gerarchia, flusso di compilazione — e
vale la pena affrontarlo freschi.

> **Avvertimento.** Il rischio concreto del piano è arrivare a una hero splendida
> attaccata a un booking che non esiste. Chiusa la fase 1, la mossa giusta è
> questa, non altra rifinitura della hero.

### 2.2 Backend

Il più rimandabile, e non solo per il mood: è **prematuro**. La struttura dati la
detta il form, non il contrario. Farlo prima significa rifarlo dopo.

---

## Parcheggiate — decise, manca il momento

### «Riduci movimento» spegne la transizione invece di ammorbidirla

Con `prefers-reduced-motion` attivo, `transition.js` porta la tween a **0.01 s**
— un fotogramma. Non è un bug, è quello che gli abbiamo chiesto, ma è chiesto
male: il passaggio fra i tre stati diventa istantaneo e **non si capisce che è
successo qualcosa**. Verificato su iPhone il 22/07/2026, con quell'impostazione
accesa; su Android, dove era spenta, tutto normale.

Il rimedio giusto **non è accorciare il viaggio**: quell'impostazione esiste per
il malessere vestibolare, e mezzo diorama che attraversa lo schermo in mezzo
secondo è semmai peggio che in due. È **togliere il viaggio e mettere una
dissolvenza**: il diorama resta fermo e la carta compare sopra di lui. Non
tradisce il progetto, ne è la versione ferma — la carta si appoggia già sul
mondo invece di sostituirlo (vedi [`interfaccia.md`](interfaccia.md)).

Tocca `transition.js` (durata e un flag esposto), `Diorama.jsx` (corsa a 0),
`Destinations.jsx` (opacità al posto della traslazione) e l'intro, che è lo
stesso movimento e ha lo stesso problema.

Rinviato il 22/07/2026: decisione dell'utente, si riprende più avanti.

### `ShadowPass` è un punto singolo di rottura

Gira a `useFrame` priorità 1, e questo **disattiva il rendering automatico di
R3F**: tutta l'immagine dipende da una sola riga (`ShadowPass.jsx:168`). Se
quella lancia un'eccezione, React, GSAP e gli `useFrame` degli sprite
continuano a girare ma **sul canvas non cambia più un pixel** — il diorama
diventa una fotografia con le carte che ci scorrono lisce sopra.

Non è un problema osservato, è una fragilità strutturale trovata leggendo il
codice mentre si indagava sul caso iPhone. Il ciclo non muore (R3F prenota la
rAF successiva prima di eseguire i subscriber, quindi rilancia e riempie la
console), ma il sito resta immobile. Rimedio: un `try/catch` attorno al passo di
composizione che, se qualcosa va storto, ricada sul rendering semplice — meglio
senza ombre che fermo.

### Peso in memoria (misurato, non fatto)

29 sprite, 7.2 MP, **27.4 MB di VRAM** (36.4 coi mipmap). I file scaricati sono
800 kB: il problema non è la rete, è la GPU.

1. **`0-sfondo` da solo pesa 10.6 MB, il 39% del totale** — ed è la composizione
   appiattita, nascosta, che serve solo da riferimento. Caricarla solo in
   sviluppo (`import.meta.env.DEV`) o su richiesta: guadagno più grosso, costa
   una riga;
2. **mipmap**: costano il 33% e servono poco, gli sprite si vedono quasi a 1:1;
3. **KTX2/Basis**: i WebP si comprimono in rete ma sulla GPU tornano RGBA grezzi.
   Ha senso solo su texture definitive;
4. **`TARGET_W`**: 1440 è calibrato sul DPR limitato a 2. Non toccarlo senza
   rimisurare.

### Rig più fine del gatto — servono asset nuovi

Orecchie separate (scatto rapido e raro, un orecchio solo), occhi e pupille
staccati dalla testa per muovere lo sguardo senza ruotare tutto.

### Ombre

- **bande di profondità**: oggi tutte le ombre condividono un raggio di
  sfocatura. Un oggetto più staccato dal muro dovrebbe proiettarne una più
  morbida — due o tre buffer invece di uno;
- **scelta della risoluzione**: piena / metà / un quarto sono esposte per
  confronto. Presa la decisione, le altre si tolgono.

### Estetica

- **contorno di carta deliberato**: il PNG-8 dava un alone bianco accidentale,
  risolto col PNG-24. Se quel look serve, si rifà apposta — colore crema,
  spessore e irregolarità regolabili — invece che come residuo tecnico.

### Abbellimenti della hero

Pericolosi non perché inutili, ma perché **senza fondo**: manca un momento in cui
è finita. Un'idea precisa che arriva mentre si lavora ad altro si prende al volo;
come attività a sé va limitata nel tempo.
