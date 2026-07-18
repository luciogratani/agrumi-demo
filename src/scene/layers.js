// Artboard sorgente: tutti i layer sono esportati/compositi su questo frame,
// centrati e allineati. L'aspect guida il fit della camera.
export const ARTBOARD = { w: 935, h: 1683 }
export const ARTBOARD_ASPECT = ARTBOARD.w / ARTBOARD.h // ~0.5556 (verticale)

// Stack di profondità, dal fondo (dietro) al davanti (verso la camera).
// z cresce verso la camera. Le distanze sono tarate a occhio: contano solo
// per la parallasse (M2), non per la prospettiva (camera ortografica).
//
// NB: alcuni PNG sono ancora in fase di assemblaggio a mano (chioma albero,
// dehors). `ready:false` = placeholder/parziale, va rifinito.
export const LAYERS = [
  { name: 'backdrop',   url: '/assets/backdrop.png',   z: 0.0, ready: true },
  { name: 'tree_back',  url: '/assets/tree_back.png',  z: 1.0, ready: false },
  { name: 'cat',        url: '/assets/cat.png',        z: 2.0, ready: true },
  { name: 'tree_front', url: '/assets/tree_front.png', z: 3.0, ready: false },
  { name: 'shop',       url: '/assets/shop.png',       z: 4.0, ready: true },
  { name: 'foreground', url: '/assets/foreground.png', z: 5.0, ready: true },
]
