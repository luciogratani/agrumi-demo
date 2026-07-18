# Agrumì — cosa c'è da fare

Aggiornato il 19/07/2026.

Un solo posto per il piano e per le cose parcheggiate: due elenchi separati
divergono, ed è così che si perdono i pezzi.

## Il criterio

**Cosa si deteriora se rimandato.** Il backend non si deteriora: si fa bene
anche senza ispirazione e il risultato non cambia. Il lavoro creativo sì —
rimandato, quando lo si riprende ci si accontenta.

Finché il mood c'è, va speso su ciò che solo il mood può produrre.

---

## Fase 1 — chiudere la prima impressione

I tre punti sono un blocco unico e vanno in quest'ordine. Alla fine c'è una
hero **completa e mostrabile**, non un punto intermedio.

### 1.0 Transizione fra scene (prototipo fatto)

Non era in piano: è arrivata prima perché definisce il **contenitore** in cui
tutto il resto dovrà vivere. Il diorama scorre in verticale fra tre stati (menu
· hero · booking), guidato dal gesto. Come funziona: `SCENA-3D.md` §7.

Cosa manca per dirla finita:

- le destinazioni sono segnaposto — diventano reali col §2.1;
- il gesto è **discreto**: si supera la soglia e parte tutto. Trascinare il
  diorama seguendo il dito, con snap al rilascio, sarebbe più ricco, ma ha
  senso solo dopo aver stabilito che il movimento in sé convince;
- durata a 2 s: giusta per valutare, probabilmente lunga per una navigazione
  ripetuta. È il primo numero da rivedere quando diventa il gesto vero.

### 1.1 CTA della hero

Per prima perché è corta e perché **sblocca le altre due**: l'animazione di
ingresso deve sapere che la CTA esiste, altrimenti va rifatta.

> **Stato:** `Cta.jsx` è stato **rimosso**, la CTA è da rifare. Le ragioni di
> progetto della prima versione sono conservate in `SCENA-3D.md` §6.

- HTML/SVG **sopra** il canvas, non una mesh 3D (vincolo del CLAUDE.md)
- forma di limone, scritta con font vettoriale
- è ciò che dà uno scopo alla hero: senza, è una bella illustrazione che non
  porta da nessuna parte
- sblocca lo **sguardo del gatto verso la CTA**, già rimandato una volta

Da decidere: se porta al booking in pagina o a una route separata.

### 1.2 Loading screen con precaricamento reale

Oggi la scena appare di colpo su fondo vuoto (`Suspense fallback={null}`).

«Reale» ha un significato tecnico preciso: non basta attendere il download
delle texture, bisogna forzarne il **caricamento sulla GPU**
(`renderer.initTexture`). Senza, al primo fotogramma c'è comunque uno scatto
mentre vengono trasferite — ed è la differenza fra un preloader vero e uno
finto.

È anche il momento giusto per l'ottimizzazione del peso (§4.1): un loading
screen rende il tempo di caricamento **visibile**, e i 10.6 MB sprecati di
`0-sfondo` diventano un difetto che si nota.

### 1.3 Animazione di ingresso

Il premio, da fare con lo slancio addosso.

È la cosa più coerente col concept: un diorama papercraft che si compone dal
basso **è letteralmente un libro pop-up che si apre**. Non un effetto generico
applicato a caso, ma il gesto proprio del materiale.

- elementi che salgono dal basso, ritardati in base alla profondità
- la camera è **ortografica**: nessuna prospettiva, quindi il movimento può
  essere solo zoom e scorrimento. Meno cinematografico, più coerente
- deve concludersi con la CTA che arriva per ultima

Ora costa molto meno: con la §1.0 fatta, l'intro è **una posa in più nello
stesso sistema** invece che un meccanismo a sé. Se si scrive a parte, si
riscrive.

---

## Fase 2 — il prodotto

### 2.1 Componenti reali: form di prenotazione e menu

**La cosa più importante di tutte** — è il punto del sito. Sta dopo la fase 1
non perché conti meno, ma perché è un **registro creativo diverso**:
tipografia, gerarchia, flusso di compilazione. Non la stessa vena che sta
facendo funzionare il diorama, e vale la pena affrontarla freschi.

> **Avvertimento.** Il rischio concreto del piano è arrivare a una hero
> splendida attaccata a un booking che non esiste. Chiusa la fase 1, la mossa
> giusta è questa — non altra rifinitura della hero.

### 2.2 Backend

Il più rimandabile, e non solo per questione di mood: è **prematuro**. La
struttura dati la detta il form di prenotazione, non il contrario. Farlo prima
significa rifarlo dopo.

---

## Fase 3 — abbellimenti hero

Pericoloso non perché inutile, ma perché **senza fondo**: manca un momento in
cui è finita. Se un'idea precisa arriva mentre si lavora ad altro, si prende al
volo; come attività a sé va limitata nel tempo.

---

## 4. Rifiniture decise ma parcheggiate

Non idee scartate: decise, manca il momento.

### 4.1 Ottimizzazione del peso (misurata, non fatta)

29 sprite, 7.2 MP, **27.4 MB di VRAM** (36.4 coi mipmap). I file scaricati sono
solo 800 kB: il problema non è la rete, è la memoria GPU.

1. **`0-sfondo` da solo pesa 10.6 MB, il 39% del totale** — ed è la
   composizione appiattita, nascosta, che serve solo da riferimento. Va
   caricata solo in sviluppo (`import.meta.env.DEV`) o su richiesta: guadagno
   più grosso, costa una riga.
2. **Mipmap**: costano il 33% e servono poco, gli sprite si vedono quasi a
   scala 1:1. Da rivalutare spegnendoli.
3. **KTX2/Basis**: i WebP si comprimono in rete ma sulla GPU tornano RGBA
   grezzi; KTX2 resta compresso anche in memoria. Ha senso solo su texture
   definitive.
4. **`TARGET_W`**: 1440 è ben calibrato sul DPR limitato a 2 (un iPhone SE
   arriva a ~1270 px di tela). Non toccarlo senza rimisurare.

### 4.2 Interazione da desktop

- **Testa che insegue il puntatore** — implementata e funzionante, spenta di
  default: su mobile l'idle autonomo è il comportamento principale, questa
  resta un di più per chi arriva da desktop.
- **Sguardo verso la CTA** — da fare insieme a §1.1.

### 4.3 Rig più fine del gatto

Dal CLAUDE.md, non ancora fatto: orecchie separate (scatto rapido e raro, un
orecchio solo), occhi e pupille separati dalla testa per muovere lo sguardo
senza ruotare tutta la testa. **Servono asset nuovi.**

### 4.4 Ombre

- **Bande di profondità**: oggi tutte le ombre condividono un raggio di
  sfocatura. Un oggetto più staccato dal muro dovrebbe proiettarne una più
  morbida — si ottiene con due o tre buffer invece di uno.
- **Scelta della risoluzione**: piena / metà / un quarto sono esposte per
  confronto. Presa la decisione, le altre si tolgono.

### 4.5 Estetica

- **Contorno di carta deliberato**: il PNG-8 dava un alone bianco accidentale,
  risolto col PNG-24. Se quel look serve, si rifà apposta — contorno color
  crema, spessore e irregolarità regolabili — invece che come residuo tecnico.

---

## Dov'eravamo (stato al 19/07/2026)

Hero su route `#/diorama2`; la home è volutamente vuota.

- **Pipeline** (`tools/prep-layers.mjs`): 29 livelli PSD a tela piena, ritagliati
  al bounding box e convertiti in WebP con un manifest che ne conserva la
  posizione. 24 MB → 0.7 MB. `tools/check-manifest.mjs` verifica l'allineamento
  senza browser.
- **Scena** (`src/diorama/`): camera ortografica cover-fit, piani unlit ordinati
  per `renderOrder`, vento procedurale, parallasse (spenta), fondale di carta al
  posto della composizione appiattita.
- **Ombre**: sagome disegnate in un render target, sfocate una volta sola con
  gaussiana separabile, unite col massimo e composte con opacità unica.
- **Rig gatto**: perni espliciti, respiro, idle autonomo della testa, coda
  piegata sui vertici, blink a scambio di texture. Il gatto è figlio del ramo,
  quindi oscilla con lui.
- **Transizione** (GSAP): tre stati in verticale, corsa d'uscita per gruppo
  tarata, gesti wheel/swipe, destinazioni segnaposto.
- **Pannello di regia** (leva): tutti i parametri, export JSON, anteprima in
  cornice di viewport mobile reale, editor dei perni.
