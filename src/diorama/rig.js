// Rig del gatto: pezzi e loro punti di rotazione.
//
// Per foglie e rami il perno si ricava da solo (bordo inferiore del bounding
// box) e va benissimo. Per un personaggio no: la testa deve ruotare attorno
// alla base del collo, non al proprio bordo inferiore, altrimenti scivola via
// dal corpo invece di girarsi.
//
// I perni sono in coordinate normalizzate sulla tela (0,0 in alto a sinistra,
// come il manifest) e si piazzano a occhio con l'editor: modalità perni nel
// pannello, clic sul punto, poi "Esporta JSON" e i valori tornano qui.

export const CAT = {
  body: '3-1-1-gatto-body',
  head: '3-1-2-gatto-testa',
  blink: '3-1-3-gatto-testa-occhi-chiusi',
  tail: '3-1-0-gatto-coda',
}

export const PIVOTS = {
  // Base del collo, dove la testa sparisce sotto il corpo.
  '3-1-2-gatto-testa': { x: 0.5167, y: 0.3291 },
  // Attacco della coda, sotto il fianco.
  '3-1-0-gatto-coda': { x: 0.6199, y: 0.4584 },
}

export function pivotFor(slug) {
  return PIVOTS[slug] ?? null
}
