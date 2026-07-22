import { CAT } from './rig'

// Profondità e reattività al vento, per gruppo di layer.
//
// Il numero di gruppo viene dal prefisso messo nel PSD e definisce l'ordine di
// disegno; la profondità invece è una scelta di regia e non sempre coincide.
// Nuvole e uccelli stanno nel gruppo 4 (disegnati davanti) ma nella finzione
// sono lontanissimi, quindi hanno una voce a parte.
//
// Questi sono solo i valori di partenza: a runtime si regolano da Leva, e il
// pannello esporta il JSON da reincollare qui.

// depth: 0 = fondale immobile, 1 = piano più vicino alla camera.
// wind: quanto il gruppo reagisce al vento (0 = fermo).
// exit: quanto il gruppo scorre nella transizione fra scene (vedi sotto).
//
// `exit` è una tabella separata da `depth` di proposito: sono due regie
// diverse, e infatti i valori tarati non si somigliano affatto. La parallasse
// è uno scarto di pochi punti percentuali, dove il rapporto fra i gruppi si
// legge come profondità; la transizione è una corsa di quasi due altezze di
// schermo, dove lo stesso rapporto diventa la velocità con cui un pezzo esce
// dall'inquadratura.
//
// Il differenziale non segue la distanza dalla camera ma **l'ordine in cui le
// cose devono sparire**: il cielo corre più del frame (1.39) e se ne va per
// primo, le foglie davanti e quelle di 3.2 restano indietro (0.69 e 0.65) e
// sono le ultime a lasciare lo schermo. È questo sfalsamento a far leggere il
// movimento come un diorama che si smonta invece che come un'immagine che
// scorre.
//
// Il fondale resta a 0: è il muro dietro, non si muove mai.
export const GROUPS = {
  sfondo: { label: '0 · sfondo', depth: 0.0, wind: 0.0, exit: 0.0 },
  cielo: { label: '· nuvole e uccelli', depth: 0.42, wind: 2, exit: 1.39 },
  albero: { label: '1 · albero', depth: 0.2, wind: 0.45, exit: 0.77 },
  tronchetto: { label: '2 · tronchetto', depth: 0.32, wind: 0.8, exit: 1.06 },
  tronco: { label: '3 · tronco orizz.', depth: 0.4, wind: 0.55, exit: 1.0 },
  g31: { label: '3.1 · foglie e limoni', depth: 0.59, wind: 0.37, exit: 0.95 },
  gatto: { label: '3.1 · gatto', depth: 0.36, wind: 0.0, exit: 0.86 },
  g32: { label: '3.2 · foglie e limoni', depth: 0.29, wind: 0.31, exit: 0.65 },
  locale: { label: '4 · locale e insegna', depth: 0.17, wind: 0, exit: 0.94 },
  g5: { label: '5 · foglie davanti', depth: 0.22, wind: 1.0, exit: 0.69 },
}

// Cornice della transizione: **superata**. In origine alcune foglie del gruppo
// 5 restavano appese in alto a incorniciare la carta della destinazione; ora
// quelle foglie sono asset veri, parentati all'albero (vedi FOLLOWS), e la
// cornice non si usa più. La tabella resta vuota: l'infrastruttura (`exitFor`,
// la manopola `linger` del pannello) è inerte e si può togliere in una pulizia.
export const LINGER = {}

// Corsa d'uscita di un layer: quella del suo gruppo, se non è di cornice.
export function exitFor(layer, groupExit, linger) {
  if (!linger.enabled) return groupExit
  const factor = LINGER[layer.slug]
  return factor === undefined ? groupExit : factor * linger.exit
}

const BY_PSD_GROUP = {
  0: 'sfondo',
  1: 'albero',
  2: 'tronchetto',
  3: 'tronco',
  3.1: 'g31',
  3.2: 'g32',
  4: 'locale',
  5: 'g5',
}

// Correzioni di scala su singoli layer, applicate attorno al loro centro.
// Servono quando il ritaglio in Photoshop non coincide con la dimensione
// voluta in scena e non vale la pena riesportare.
const SCALE = {
  '4-logo-insegna': 0.97,
}

export function scaleFor(layer) {
  return SCALE[layer.slug] ?? 1
}

// Correzioni di posizione su singoli layer, in frazioni di tela come le x/y del
// manifest: x positivo = destra, y positivo = giù. Servono quando un ritaglio va
// accostato di pochi pixel rispetto a dov'è stato esportato.
//
// Il tronchetto in alto a sinistra, anche da fermo, non tocca del tutto il
// tronco: l'innesto resta staccato di un filo. Lo si sposta un po' verso il
// tronco. Lo spostamento agisce sul *gruppo*, quindi trascina anche il figlio
// appeso (3-2-sx) — «lui e i figli» in un valore solo. Tarare a occhio: con la
// HMR di Vite il salvataggio si vede subito.
const OFFSET = {
  '2-tronchetto-alto-sx': { x: 0.008, y: 0.008 },
}

export function offsetFor(slug) {
  return OFFSET[slug] ?? null
}

// Layer presenti negli export ma non visibili di partenza: la testa a occhi
// chiusi è il fotogramma del blink, la mostra il rig del gatto quando serve.
export const HIDDEN = [/occhi-chiusi/]

export function isHidden(layer) {
  return HIDDEN.some((re) => re.test(layer.slug))
}

// Doppioni di copertura: ritagli del gruppo 5 messi davanti solo per stare
// sopra le nuvole (che nel PSD sono nel gruppo 4, disegnato davanti, ma nella
// finzione sono lontanissime). Non sono foglie vere — l'originale è già nella
// chioma — quindi galleggiavano nel cielo con fase propria, staccati da tutto.
//
// Ora le nuvole passano dietro la chioma (vedi ORDER), quindi la copertura non
// serve più: questi non si disegnano affatto, una draw call in meno ciascuno.
// I file .webp restano su disco: per recuperarne anche la VRAM andrebbero tolti
// dalla pipeline che genera il manifest.
export const DUPLICATI = new Set([
  '5-foglia-2',
  '5-foglia-nuvola-sx',
  '5-layer-10',
  '5-layer-11',
  '5-layer-12',
  '5-foglie-nuvola-dx',
])

export function isDuplicate(layer) {
  return DUPLICATI.has(layer.slug)
}

// Forzature dell'ordine di disegno, per slug. Di regola l'ordine è la posizione
// nel manifest, ma le nuvole vanno spostate *dietro* la chioma: nella finzione
// sono lontane, e tenerle davanti obbligava a duplicare le foglie per coprirle.
// Un valore < dell'indice dell'albero (1) le mette dietro tutto il verde, ma
// pur sempre davanti al muro di fondo (renderOrder -20).
const ORDER = {
  '4-nuvola-dx': 0.5,
  '4-nuvola-sx': 0.5,
}

export function orderFor(layer, index) {
  return ORDER[layer.slug] ?? index
}

// Layer solidali a un altro: vengono disegnati dentro il gruppo del padre,
// quindi ne ereditano pivot, rotazione del vento e scarto di parallasse.
// Senza questo ogni layer avrebbe una fase casuale propria e il logo
// scivolerebbe via dall'insegna su cui è stampato.
//
// È lo stesso meccanismo che servirà al rig del gatto (orecchie, coda, occhi
// come sotto-piani imparentati) quando si arriverà alla Milestone 4.
export const FOLLOWS = {
  // Il logo è stampato sulla targa.
  '4-logo-insegna': '4-locale-tetto-insegna',
  // Il gatto è poggiato sul ramo orizzontale: quando il ramo oscilla col
  // vento deve inclinarsi con lui, non restare sospeso a mezz'aria.
  [CAT.body]: '3-tronco-orizzontale',
  [CAT.head]: '3-tronco-orizzontale',
  [CAT.tail]: '3-tronco-orizzontale',
  // Foglie e limoni della chioma: asset veri appesi all'albero, non doppioni di
  // copertura. Da soli avevano fase propria e ondeggiavano scollegati dal ramo;
  // ancorati inclinano col vento del padre e restano attaccati. Il renderOrder
  // resta quello del manifest, quindi si disegnano al loro posto nella pila.
  //
  // Foglia e limone poggiati sul ramo orizzontale, sotto il gatto: stesso ramo
  // del gatto, così si muovono insieme a lui.
  '3-1-foglia': '3-tronco-orizzontale',
  '3-1-limone': '3-tronco-orizzontale',
  // Gruppo 3.2. `sx` sta sul tronchetto in alto a sinistra — segue quel ramo,
  // non tutto l'albero — quindi diventa figlio del tronchetto (che per questo
  // ha bisogno di un perno all'innesto, vedi PIVOTS in rig.js). Gli altri due
  // stanno sui rami principali dell'albero.
  '3-2-sx': '2-tronchetto-alto-sx',
  '3-2-dx': '1-albero',
  '3-2-dxx': '1-albero',
  // Foglia e limone in cima a destra: erano tenuti liberi per la vecchia
  // cornice della transizione (ora superata), quindi tornano foglie normali
  // appese all'albero.
  '5-foglia': '1-albero',
  '5-limone': '1-albero',
}

// Layer che non proiettano ombra, pur avendo una profondità.
// Il logo è stampato sull'insegna, non è una sagoma staccata dal muro:
// un'ombra propria lo farebbe galleggiare.
const NO_SHADOW = [/logo-insegna/]

export function castsShadow(layer) {
  return !NO_SHADOW.some((re) => re.test(layer.slug))
}

// A quale gruppo di regia appartiene un layer del manifest.
export function groupKeyFor(layer) {
  // Il cielo è lontano a prescindere dal gruppo in cui è finito nel PSD.
  if (/nuvola|uccello/.test(layer.slug)) return 'cielo'
  // Il gatto è animato a parte (Milestone 4), il vento non lo tocca.
  if (layer.slug.includes('gatto')) return 'gatto'
  return BY_PSD_GROUP[layer.group] ?? 'g31'
}
