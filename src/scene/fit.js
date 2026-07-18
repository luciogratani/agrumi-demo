import { ARTBOARD_ASPECT } from './layers.js'

// Altezza dell'artboard in unità mondo (arbitraria: la camera ci si adatta).
export const BOARD_H = 2
export const BOARD_W = BOARD_H * ARTBOARD_ASPECT

// artboard normalizzato (u,v con v verso il basso, s = frazione altezza) -> mondo
export function place({ u, v, s }) {
  return {
    x: (u - 0.5) * BOARD_W,
    y: (0.5 - v) * BOARD_H,
    height: s * BOARD_H,
  }
}

// Inquadratura "cover": il diorama riempie sempre il viewport.
// Imposta frustum + zoom della camera ortografica in base al viewport.
export function fitCover(camera, width, height) {
  const viewAspect = width / height
  camera.top = 1
  camera.bottom = -1
  camera.left = -viewAspect
  camera.right = viewAspect
  camera.zoom = Math.max(2 / BOARD_H, (2 * viewAspect) / BOARD_W)
  camera.updateProjectionMatrix()
}
