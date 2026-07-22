# La scena hero

Un diorama papercraft 2.5D: sagome di carta ritagliate, disposte su piani piatti
a profondità diverse, viste con camera **ortografica**. Non è una scena 3D
esplorabile — la profondità nasce dallo sfasamento in parallasse, non dalla
prospettiva. Vive sulla home: è il sito.

Da dove arrivano i file: [`pipeline-asset.md`](pipeline-asset.md). Le ombre:
[`ombre.md`](ombre.md). Come si muove fra le scene:
[`transizioni-gsap.md`](transizioni-gsap.md).

## Mappa dei file

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
  transition.js    stato delle tre scene, tween GSAP, intro
  gestures.js      wheel e swipe → passi di transizione
  depth.js         tabella di regia dei layer
  rig.js           pezzi e perni del gatto
  bend.js          piegatura della coda
  manifest.json    generato — non modificare a mano
```

## Coordinate

Il mondo è normalizzato: **altezza tela = 1**, larghezza = aspect del PSD
(≈ 0.747). Origine al centro, Y verso l'alto.

Il manifest usa invece coordinate tela: `(0,0)` in alto a sinistra, `(1,1)` in
basso a destra. La conversione sta in `computeGeom` (`Sprite.jsx`), unico punto in
cui le due convenzioni si incontrano.

## Materiali

Tutto **unlit** (`meshBasicMaterial`), `transparent`, `toneMapped: false`. Nessuna
luce dinamica, nessun PBR: è carta opaca, e le ombre di contatto sono già cotte
nei render.

**`depthWrite: false` e `depthTest: false`.** L'ordine di disegno lo decide solo
`renderOrder`. Con ~29 piani trasparenti sovrapposti il depth test taglierebbe le
sfumature di alpha ai bordi, e restano contorni netti dove servono transizioni
morbide.

Conseguenza da ricordare: **la posizione Z non conta niente visivamente.** Serve
solo alla *separazione Z* del pannello, che allontana i piani per ispezionare il
diorama con l'orbit control.

## Camera

Ortografica, in **cover-fit**: riempie sempre il viewport ritagliando il lato che
avanza. Su 9:16 il PSD (3:4) viene tagliato ai fianchi e non lascia bordi.

`near` è a **-100**: con la separazione Z attiva i piani finirebbero davanti alla
camera e sparirebbero. Il cover-fit si riapplica al resize **solo a orbit spento**,
altrimenti sovrascriverebbe lo zoom scelto a mano.

## I layer (`depth.js`)

La tabella di regia. Tutto dichiarativo:

| | cosa fa |
|---|---|
| `GROUPS` | profondità e reattività al vento, per gruppo |
| `FOLLOWS` | layer solidali a un altro (vedi sotto) |
| `SCALE` | correzioni di scala su singoli layer |
| `HIDDEN` | caricati ma non disegnati (la testa a occhi chiusi del blink) |
| `NO_SHADOW` | non proiettano ombra (il logo, stampato sulla targa) |
| `EXIT` / `LINGER` | corsa d'uscita nella transizione, e chi resta indietro |

`groupKeyFor()` decide a quale gruppo appartiene un layer. Due eccezioni rispetto
al numero PSD: **nuvole e uccelli** stanno nel gruppo 4 (disegnati davanti) ma
nella finzione sono lontani, e **il gatto** ha voce propria perché il vento non lo
tocca — si muove col suo rig.

Profondità e ordine di disegno sono quindi **due cose separate**: la prima è
regia, il secondo viene dal PSD.

## Sprite (`Sprite.jsx`)

Il cuore. Due nodi: un `<group>` sul **perno**, che porta tutte le
trasformazioni, e dentro la mesh spostata perché l'immagine cada al posto giusto.

**Perché il perno conta.** Ruotare attorno al centro dell'immagine farebbe
*scivolare* una foglia invece di farla ondeggiare. Di default il perno è il bordo
inferiore del bounding box — giusto per una foglia attaccata a un ramo. Per il
gatto no: la testa gira attorno alla base del collo, e i perni espliciti stanno in
`rig.js`. Si piazzano col clic (`PivotEditor.jsx`), non a numeri.

### Annidamento

Uno Sprite può contenerne altri. Un layer dichiarato in `FOLLOWS` viene reso
**dentro** il gruppo del padre e ne eredita vento, parallasse e profondità, ma
conserva perno e animazioni proprie. Serve a:

- **il logo sull'insegna**: aveva fase e bounding box propri, quindi scivolava via
  dalla targa su cui è stampato;
- **il gatto sul ramo**: senza, restava sospeso mentre il ramo oscillava. Continua
  intanto a respirare e a muovere testa e coda;
- **foglie e limoni sui rami**, per la stessa ragione.

Uno sprite annidato **non riapplica** vento, parallasse e Z: arrivano dal padre, e
ricalcolarli li conterebbe due volte.

## I movimenti

Tutti procedurali in `useFrame`, nessuna clip bakata.

- **vento**: somma di due seni a frequenze in rapporto irrazionale (non si ripete
  mai uguale), fase fissa per layer (altrimenti oscillano all'unisono), modulata
  da una folata lenta — il vento «respira». Il parametro *folata* è la frequenza
  di quel respiro: a 0.15 il ciclo dura ~40 s;
- **parallasse**: scarto proporzionale alla profondità, tutto su X/Y perché in
  ortografica la Z non dà profondità. Spenta di default;
- **respiro** (corpo del gatto): scala minima col perno in basso, orizzontale più
  della verticale — un torace si allarga, non si allunga;
- **idle della testa**: il comportamento principale su telefono. **Non c'è nessun
  seno, di proposito**: un gatto sta fermo a lungo, gira la testa e torna fermo.
  Sceglie una posa, la raggiunge, la tiene; spesso torna dritto invece di cercare
  un altro angolo, altrimenti sembra che cerchi qualcosa senza mai trovarlo;
- **inseguimento del puntatore**: additivo all'idle, con zona morta (evita il
  tremolio da servomotore). Spento di default, è interazione da desktop;
- **coda** (`bend.js`): piegata sui **vertici**, non ruotata rigida — una coda
  rigida sembra un tergicristallo. L'angolo cresce verso la punta ed è sfasato
  lungo la lunghezza, così il movimento si propaga come un'onda da un pezzo solo,
  senza catene di segmenti da esportare. La piegatura vale anche per la sagoma
  d'ombra, altrimenti l'ombra resterebbe dritta;
- **blink**: scambio secco di texture, 90 ms, intervalli irregolari, a volte
  doppio. La testa a occhi chiusi ha **lo stesso bounding box** di quella aperta,
  quindi non serve un layer in più: si cambia la mappa sulla stessa mesh.

## Fondale (`Backdrop.jsx`)

Muro di carta più un pavimento tinta unita. Sostituisce `0-sfondo`, che è la
composizione finale appiattita: comoda come riferimento, ma inchioda la parallasse
perché lì dentro ogni elemento è già al suo posto. Resta accessibile da pannello
come confronto — e pesa 10.6 MB di VRAM, vedi il backlog.

## Trappole

- `depthTest` è **off** ovunque: la Z non ordina niente, lo fa `renderOrder`;
- `ShadowPass` ha in mano il ciclo di rendering (vedi [`ombre.md`](ombre.md));
- il gatto è **figlio del ramo**: spostare il ramo sposta il gatto, ed è voluto;
- il giroscopio richiede **HTTPS** (`HTTPS=1 pnpm dev`) e, su iOS, un permesso
  concesso durante un gesto dell'utente.
