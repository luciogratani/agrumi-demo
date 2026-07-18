// Composizione del diorama come PLACEMENT di prop sciolti.
// Gli asset sono ritagli a dimensioni diverse (non full-frame allineati),
// quindi ognuno va posizionato a mano riferendosi alla reference (Firefly.png).
//
// Coordinate ARTBOARD normalizzate:
//   u: 0..1  sinistra -> destra   (centro X)
//   v: 0..1  alto -> basso        (centro Y)
//   s: altezza come frazione dell'altezza board (larghezza derivata dall'aspect texture)
//   rot: gradi (rotazione sul piano)
//   z: profondità (cresce verso la camera)
//
// NB: le posizioni di chioma/dehors sono un PRIMO PASSAGGIO, da rifinire a vista.

// --- profondità dei gruppi ---
const Z = {
  cielo: 0.0,
  nuvole: 0.15,
  uccelli: 0.2,
  albero: 1.0,
  canopyBack: 1.4, // foglie/limoni dietro il gatto
  gatto: 2.0,
  canopyFront: 3.0, // foglie/limoni davanti al gatto/tronco
  shop: 4.0,
  insegna: 4.1,
  ground: 5.0,
  dehors: 5.2,
  fallen: 5.4,
}

// helper: crea un pezzo di chioma (foglia o limone) con nome univoco
const F = (file) => `/assets/el/foglie/${file}.png`
const L = (file) => `/assets/el/limoni/${file}.png`

// Chioma: foglie distribuite in un arco attorno ai rami.
// [file, u, v, s, rot]
const leavesBack = [
  ['foglia_1', 0.20, 0.24, 0.075, -35],
  ['foglia_3', 0.28, 0.15, 0.075, -20],
  ['foglia_5', 0.14, 0.34, 0.070, -55],
  ['foglia_7', 0.38, 0.11, 0.070, -5],
  ['foglia_2', 0.62, 0.11, 0.070, 8],
  ['foglia_4', 0.72, 0.16, 0.075, 25],
  ['foglia_6', 0.82, 0.26, 0.075, 45],
  ['foglia_8', 0.86, 0.36, 0.070, 60],
  ['foglia_9', 0.50, 0.09, 0.065, 0],
  ['foglia_10', 0.33, 0.30, 0.065, -25],
  ['foglia_2', 0.67, 0.30, 0.065, 25],
]

const leavesFront = [
  ['foglia_4', 0.24, 0.44, 0.075, -50],
  ['foglia_6', 0.30, 0.52, 0.070, -30],
  ['foglia_1', 0.74, 0.46, 0.075, 48],
  ['foglia_8', 0.70, 0.54, 0.070, 30],
  ['foglia_3', 0.18, 0.46, 0.065, -60],
  ['foglia_5', 0.80, 0.52, 0.065, 55],
]

const lemonsBack = [
  ['limone_1', 0.24, 0.30, 0.11, -8],
  ['limone_4', 0.76, 0.22, 0.11, 10],
  ['limone_2', 0.16, 0.44, 0.10, -12],
]
const lemonsFront = [
  ['limone_3', 0.30, 0.46, 0.12, 6],
  ['limone_5', 0.80, 0.42, 0.11, 14],
  ['limone_6', 0.66, 0.50, 0.12, -6],
]

function canopy(list, loader, z, tag) {
  return list.map(([file, u, v, s, rot], i) => ({
    name: `${tag}_${i}_${file}`,
    url: loader(file),
    u, v, s, rot, z,
  }))
}

export const ELEMENTS = [
  // --- BACKDROP ---
  { name: 'cielo',   url: '/assets/el/cielo.png',   u: 0.5,  v: 0.5,   s: 1.0,  z: Z.cielo },
  { name: 'nuvole',  url: '/assets/el/nuvole.png',  u: 0.5,  v: 0.085, s: 0.11, z: Z.nuvole },
  { name: 'uccelli', url: '/assets/el/uccelli.png', u: 0.53, v: 0.10,  s: 0.05, z: Z.uccelli },

  // --- ALBERO (tronco+rami) ---
  { name: 'albero',  url: '/assets/el/albero.png',  u: 0.5,  v: 0.36,  s: 0.66, z: Z.albero },

  // --- CHIOMA dietro il gatto ---
  ...canopy(leavesBack, F, Z.canopyBack, 'lf_b'),
  ...canopy(lemonsBack, L, Z.canopyBack, 'lm_b'),

  // --- GATTO ---
  { name: 'gatto',   url: '/assets/el/gatto.png',   u: 0.47, v: 0.40,  s: 0.34, z: Z.gatto },

  // --- CHIOMA davanti al gatto ---
  ...canopy(leavesFront, F, Z.canopyFront, 'lf_f'),
  ...canopy(lemonsFront, L, Z.canopyFront, 'lm_f'),

  // --- SHOP ---
  { name: 'locale',  url: '/assets/el/locale.png',  u: 0.5,  v: 0.72,  s: 0.46, z: Z.shop },
  { name: 'insegna', url: '/assets/el/insegna.png', u: 0.16, v: 0.66,  s: 0.11, z: Z.insegna },

  // --- FOREGROUND ---
  { name: 'pavimento', url: '/assets/el/pavimento.png', u: 0.5,  v: 0.94, s: 0.10, z: Z.ground },
  { name: 'pianta_sx', url: '/assets/el/piante/pianta_1.png', u: 0.30, v: 0.83, s: 0.11, z: Z.dehors },
  { name: 'pianta_dx', url: '/assets/el/piante/pianta_2.png', u: 0.66, v: 0.83, s: 0.10, z: Z.dehors },
  { name: 'tavolo',    url: '/assets/el/tavolo.png',           u: 0.46, v: 0.85, s: 0.075, z: Z.dehors },
  { name: 'lavagna',   url: '/assets/el/lavagna.png',          u: 0.14, v: 0.85, s: 0.085, z: Z.dehors },
  { name: 'sedia_sx',  url: '/assets/el/sedie/sedia_1.png',    u: 0.38, v: 0.85, s: 0.095, z: Z.dehors },
  { name: 'sedia_dx',  url: '/assets/el/sedie/sedia_2.png',    u: 0.56, v: 0.85, s: 0.085, z: Z.dehors },
  { name: 'limone_terra', url: '/assets/el/limone.png',        u: 0.5,  v: 0.93, s: 0.14, z: Z.fallen },
]
