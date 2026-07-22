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

Vive sulla home: è il sito. La prima versione a 5 piani (`src/components/`,
`src/scene/`, che stava su `#/diorama`) è stata cancellata — se dovesse servire
sta nella storia di git, fino al commit che l'ha rimossa.

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

**La CTA** — al momento **non c'è**: `Cta.jsx` è stato rimosso ed è da rifare
(`ROADMAP.md` §1.1). Le ragioni della prima versione restano valide e vale la
pena non riscoprirle da capo:

- è HTML sopra il canvas, non una mesh. Testo vettoriale nitido a qualsiasi
  densità, `<button>` vero (tastiera, lettori di schermo, focus), e si cambia
  senza riesportare niente;
- sceglie di **non** somigliare alla scena: il diorama è un mondo di carta
  materico e affollato, e un bottone anch'esso di carta diventerebbe un altro
  oggetto del collage invece che qualcosa da toccare. Il navy viene
  dall'insegna, dove però compare solo come inchiostro: è l'unico colore che la
  scena non usa come superficie.

---

## 7. Transizione fra scene

Il sito ha tre destinazioni disposte in verticale, e si passa dall'una all'altra
facendo scorrere il diorama:

```
  -1  menu        0  hero        +1  booking
```

Il segno è la direzione in cui scorre **la scena**, non l'utente: a `+1` il
diorama è salito e ha lasciato il posto al booking.

### Il valore condiviso (`transition.js`)

GSAP anima **un oggetto JS**, `{ p }`, e `useFrame` lo legge. Mai il contrario:
ogni Sprite riscrive posizione e rotazione a ogni fotogramma e `ShadowPass`
possiede il ciclo di rendering, quindi una tween che scrivesse direttamente su
`group.position` verrebbe sovrascritta a fotogrammi alterni. È lo stesso schema
del ref di `useParallaxInput`, così di modelli mentali ne resta uno.

Le scene di destinazione sono DOM e non hanno un `useFrame` da cui leggere: si
iscrivono con `subscribe` e ricevono `p` a ogni fotogramma. **Su DOM GSAP può
scrivere direttamente** — lì non c'è nessuno che sovrascrive.

### `exit`, e perché non è `depth`

`depth.js` ha una tabella separata per la transizione. Sono due regie diverse e
i valori tarati non si somigliano: la parallasse è uno scarto di pochi punti
percentuali dove il rapporto fra i gruppi si legge come profondità, la
transizione è una corsa di quasi due altezze di schermo dove lo stesso rapporto
diventa **velocità di uscita dall'inquadratura**.

Il differenziale non segue la distanza dalla camera ma **l'ordine in cui le cose
devono sparire**: cielo e locale corrono più del frame e se ne vanno per primi,
le foglie davanti restano indietro e sono le ultime. È questo sfalsamento a far
leggere il movimento come un diorama che si smonta invece che come un'immagine
che scorre.

Il fondale resta a 0 — è il muro dietro, e il cielo fermo è gratis: colore di
sfondo e `Backdrop` non sono Sprite, quindi non li tocca nessuno.

### I gesti (`gestures.js`)

Stato **discreto guidato dal gesto**, non dalla posizione di scroll. Il booking
è un form: su mobile la tastiera che si apre ridimensiona il viewport e manda
fuori sincrono qualunque timeline agganciata allo scroll. Superata la soglia
parte una transizione intera.

**La direzione segue la convenzione nativa**, non la parola «su»: il dito che
sale porta il contenuto in alto e scopre ciò che sta sotto, quindi swipe verso
l'alto (e rotellina verso il basso) portano al booking. È l'opposto di come si
descrive a voce, ed è il motivo dell'interruttore per invertirlo.

Due cose che sembrano superflue e non lo sono:

- **il blocco anti-inerzia.** Trackpad e iOS mandano eventi per quasi un secondo
  dopo che il dito si è staccato: senza guardia un gesto solo faceva due passi,
  dal menu al booking. Si riarma 240 ms dopo l'ultimo evento, non a fine
  animazione;
- **`touch-action: none` sulla cornice.** I listener sono passivi e non possono
  chiamare `preventDefault`: senza, su mobile lo swipe fa pull-to-refresh.

I gesti si spengono con orbit control o modifica perni attivi, dove
trascinamento e clic servono ad altro.

### Le destinazioni (`Destinations.jsx`, `Booking.jsx`)

Scorrono in senso opposto al diorama e in modo lineare su `p`: arrivano mentre
la scena se ne va, e condividono l'ease con lei senza doverlo ripetere. Il menu
è ancora un segnaposto; il booking è un form vero, ed è lì che si è capito cosa
regge.

**La destinazione non copre il mondo, ci si appoggia sopra.** All'inizio era un
rettangolo opaco a tutto schermo e lo stacco era netto — ma non per via del
testo: perché il mondo cambiava tutto insieme, oggetti, fondo e materiale. Il
cielo è l'unica cosa che già non si muove, quindi era continuità disponibile che
si stava buttando via. Ora la destinazione è **un foglio di carta con un margine
attorno**, il cielo resta visibile, e qualche foglia del gruppo 5 non esce con
le altre e incornicia il foglio (`LINGER` in `depth.js`).

Due nodi e non uno: il wrapper è trasparente e a tutto schermo, ed è lui che
trasla. Traslando la carta, che è più piccola della cornice, un
`translateY(100%)` la sposterebbe solo della propria altezza e ne resterebbe una
striscia dal bordo.

**Dentro la carta non si scorre mai.** È stato provato: lo scorrimento interno
litiga con i gesti che governano gli stati del sito, perché lo stesso movimento
del pollice significa due cose diverse a seconda di dove è arrivato il
contenuto. Esisteva una logica che negoziava (cedi al contenuto finché ha corsa,
poi naviga) ed è stata **tolta** — il gesto verticale ha un significato solo. Il
contenuto si adatta alla carta, a passi: se un passo non ci sta, si divide, non
si fa scorrere.

La carta ha un `max-width`: il contenitore è a schermo pieno e senza limite su
desktop si stirerebbe per tutta la finestra, con un'interfaccia da pollice larga
mille pixel.

### Lingua visiva dell'interfaccia

**I colori sono campionati dagli asset, non affiancati a occhio.** Inchiostro
`#113251` dal logo sull'insegna, limone `#efb416` dai limoni, carta `#f0e2c9`
dalla targa schiarita quanto basta a leggerci sopra. Se gli asset cambiano si
ricampionano invece di andare alla deriva — bastano un istogramma sui pixel
opachi di `public/layers/*.webp` e i bucket più popolosi.

Due regole che tengono insieme il resto:

- **il navy non è mai superficie, solo inchiostro**, com'è nella scena. L'unica
  eccezione è il bottone d'azione, ed è proprio per questo che si vede;
- **un solo colore pieno in tutta la carta**, il limone sulla scelta fatta.
  Tutto il resto sono contorni all'inchiostro al 20%.

L'interfaccia è deliberatamente quieta: fuori c'è un diorama affollato, e più ci
si avvicina alla conferma meno deve esserci da guardare.

> **Manca la tipografia.** Tutto gira su `system-ui`, che non è una scelta ma
> l'assenza di una: niente webfont per non aggiungere una richiesta di rete, e
> nel repo non ci sono file di font. La poca personalità del testo viene da come
> è usato — maiuscoletto spaziato a `0.16em` per occhielli ed etichette, la voce
> che il marchio già usa in «SAPORI SOLARI» — non da cosa è. Scegliere un
> display face cambierà il carattere della pagina più di qualunque altra cosa
> fatta finora.

---

## 8. Il pannello (leva)

`controls.jsx`. È lo strumento di lavoro principale — praticamente ogni valore
della scena è stato trovato lì, non scritto a mano.

**Come si usa.** Si tarano i parametri a occhio, si preme **Esporta JSON** (li
copia negli appunti e li stampa in console), si incolla il risultato in chat e
i valori vengono riversati nel codice. Mai trascrivere a mano.

Cartelle:

| | |
|---|---|
| **Viewport** | anteprima in una cornice grande quanto l'area **davvero visibile** su telefono. Non è più il default: da quando il sito è a schermo pieno la scena si guarda intera, e la cornice serve solo a controllare la composizione su un'area stretta senza prendere in mano il telefono |
| **Rig gatto** | perni, respiro, idle, inseguimento, coda, blink |
| **Camera** | orbit control, separazione Z, reset vista |
| **Sfondo** | composito appiattito, pavimento, orizzonte |
| **Ombre** | direzione, distanza, risoluzione, sfocatura, passate, opacità, colore |
| **Parallasse** | intensità, morbidezza, giroscopio |
| **Vento** | ampiezza, le due frequenze, folata |
| **Transizione** | corsa, durata, ease, gesti, e i tre passaggi a bottone |
| **Piani** | profondità, vento e corsa d'uscita per gruppo |

I bottoni della transizione restano accanto ai gesti di proposito: servono a
rivedere lo stesso passaggio molte volte mentre si tarano corsa e durata, cosa
che a swipe è scomoda.

**Editor dei perni.** Con `modifica perni` attivo si clicca sulla scena nel
punto di rotazione del pezzo selezionato: il perno appare in giallo, gli altri
in bianco, e l'export li include. Piazzarli a numeri sarebbe frustrante.

**Comportamento del pannello.** Si chiama con **`L`** e parte nascosto. Prima
era sempre presente e sbiadiva al 5% quando il puntatore era altrove, per non
falsare il giudizio sulla composizione; da quando la scena occupa tutto lo
schermo e contiene interfacce vere, la regia è uno strumento che si tira fuori
quando serve.

Due esclusioni necessarie nella scorciatoia: `Cmd`/`Ctrl+L` è la barra degli
indirizzi, e la pressione va ignorata dentro i campi di testo — scrivere
«Lucio» nel nome della prenotazione farebbe altrimenti comparire il pannello.
Su telefono non c'è tastiera e quindi non compare mai, che è il comportamento
voluto.

Un dettaglio non ovvio: l'opacità tiene conto anche del **trascinamento**.
Gli slider di leva catturano il puntatore, quindi trascinando si esce dal
pannello e il solo `:hover` cadrebbe — facendolo sparire proprio mentre lo si
sta regolando.

---

## 9. Trappole, in breve

- l'ordine di disegno viene dai **numeri nei nomi dei livelli PSD**: cambiarli
  in Photoshop cambia la scena, e nessun ordinamento nel codice va «corretto»
  senza sapere questo;
- `depthTest` è **off** ovunque: la Z non ordina niente, lo fa `renderOrder`;
- `ShadowPass` ha in mano il ciclo di rendering;
- le texture sono in `public/`, il manifest in `src/` — Vite avverte se si
  importa JSON da `public/`;
- il gatto è **figlio del ramo**: spostare il ramo sposta il gatto, ed è voluto;
- il giroscopio richiede **HTTPS** (`HTTPS=1 pnpm dev`) e, su iOS, un permesso
  concesso durante un gesto dell'utente;
- **GSAP non scrive mai sugli oggetti three**, solo su un numero che `useFrame`
  legge. Sul DOM invece scrive diretto, e va bene.

---

## 10. Mappa dei file

```
src/diorama/
  Diorama.jsx      canvas, camera, albero dei layer, input parallasse
  Sprite.jsx       un layer: perno, annidamento, movimenti
  ShadowPass.jsx   buffer delle ombre, sfocatura, composizione
  Backdrop.jsx     muro e pavimento
  Destinations.jsx menu e booking: la carta sul cielo (DOM, non scena)
  Booking.jsx      form di prenotazione a passi (prototipo, non invia nulla)
  PivotEditor.jsx  piazzamento dei perni col clic
  controls.jsx     pannello leva ed export
  transition.js    stato delle tre scene, tween GSAP
  gestures.js      wheel e swipe → passi di transizione
  depth.js         tabella di regia dei layer
  rig.js           pezzi e perni del gatto
  bend.js          piegatura della coda
  manifest.json    generato — non modificare a mano

tools/
  prep-layers.mjs    PSD → WebP + manifest + asset UI
  check-manifest.mjs verifica l'allineamento senza browser
```
