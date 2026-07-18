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
// cose devono sparire**: il cielo e il locale corrono più del frame (1.39 e
// 1.19) e se ne vanno per primi, le foglie davanti e quelle di 3.2 restano
// indietro (0.69 e 0.65) e sono le ultime a lasciare lo schermo. È questo
// sfalsamento a far leggere il movimento come un diorama che si smonta invece
// che come un'immagine che scorre.
//
// Il fondale resta a 0: è il muro dietro, non si muove mai.
export const GROUPS = {
  sfondo: { label: '0 · sfondo', depth: 0.0, wind: 0.0, exit: 0.0 },
  cielo: { label: '· nuvole e uccelli', depth: 1.0, wind: 0.15, exit: 1.39 },
  albero: { label: '1 · albero', depth: 0.32, wind: 0.25, exit: 0.77 },
  tronchetto: { label: '2 · tronchetto', depth: 0.32, wind: 0.35, exit: 1.06 },
  tronco: { label: '3 · tronco orizz.', depth: 0.18, wind: 0.4, exit: 1.0 },
  g31: { label: '3.1 · foglie e limoni', depth: 0.68, wind: 0.8, exit: 0.95 },
  gatto: { label: '3.1 · gatto', depth: 0.23, wind: 0.0, exit: 0.86 },
  g32: { label: '3.2 · foglie e limoni', depth: 0.53, wind: 0.9, exit: 0.65 },
  locale: { label: '4 · locale e insegna', depth: 0.46, wind: 0.3, exit: 1.19 },
  g5: { label: '5 · foglie davanti', depth: 0.15, wind: 1.0, exit: 0.69 },
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

// Layer presenti negli export ma non visibili di partenza: la testa a occhi
// chiusi è il fotogramma del blink, la mostra il rig del gatto quando serve.
export const HIDDEN = [/occhi-chiusi/]

export function isHidden(layer) {
  return HIDDEN.some((re) => re.test(layer.slug))
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
