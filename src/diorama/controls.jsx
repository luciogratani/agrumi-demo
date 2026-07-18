import { useEffect, useRef, useState } from 'react'
import { Leva, useControls, folder, button } from 'leva'
import { GROUPS } from './depth'

// Pannello di regia. Tutto ciò che si tara a occhio passa da qui, e il bottone
// "Esporta JSON" copia lo stato corrente negli appunti così com'è da
// reincollare in depth.js — niente trascrizione a mano dei valori.

// Schema Leva per le profondità/vento dei singoli gruppi, generato da GROUPS
// così aggiungere un gruppo non richiede di toccare il pannello.
const groupSchema = Object.fromEntries(
  Object.entries(GROUPS).map(([key, g]) => [
    key,
    folder(
      {
        [`${key}_depth`]: { value: g.depth, min: 0, max: 1, step: 0.01, label: 'profondità' },
        [`${key}_wind`]: { value: g.wind, min: 0, max: 2, step: 0.01, label: 'vento' },
      },
      { collapsed: true, label: g.label },
    ),
  ]),
)

export function useDioramaControls(resetView) {
  // I valori correnti, per il bottone di export: leggerli dallo state di React
  // dentro la callback darebbe una closure vecchia.
  const latest = useRef({})

  // Anteprima in una cornice delle dimensioni dell'area realmente visibile su
  // telefono: non l'intero schermo, ma quel che resta tolte barra indirizzi e
  // toolbar del browser. È lì che la composizione va giudicata.
  const viewport = useControls('Viewport', {
    device: {
      value: 'iphonese',
      options: {
        'iPhone 15 · 393×659': 'iphone15',
        'iPhone SE · 375×553': 'iphonese',
        'Pixel 8 · 412×747': 'pixel8',
        'iPhone 15 a schermo intero · 393×852': 'iphone15full',
        'Finestra intera': 'full',
      },
      label: 'dispositivo',
    },
  })

  const camera = useControls('Camera', {
    orbit: { value: false, label: 'orbit control' },
    // A z=0 tutti gli sprite sono complanari e orbitare mostrerebbe solo un
    // piano piatto: questo li distanzia in profondità per ispezionare il
    // diorama di lato. In ortografica la Z non altera l'inquadratura
    // frontale, quindi si può alzare senza falsare la composizione.
    zSpread: { value: 0, min: 0, max: 2, step: 0.01, label: 'separazione Z' },
    'Reset vista': button(() => resetView?.current?.()),
  })

  // `0-sfondo` è la composizione finale appiattita: utile come riferimento,
  // ma da spento lascia libera la parallasse. Al suo posto muro + pavimento.
  const scene = useControls('Sfondo', {
    showFlat: { value: false, label: '0-sfondo (appiattito)' },
    floor: { value: false, label: 'pavimento' },
    // L'orizzonte misurato sullo sfondo originale.
    horizon: { value: 0.7055, min: 0.4, max: 1, step: 0.001, label: 'orizzonte' },
    floorColor: { value: '#c1af93', label: 'colore pavimento' },
  })

  // Fonte di luce unica, espressa come direzione in cui cade l'ombra.
  // Nello sfondo originale la luce viene da destra in alto: le ombre scendono
  // verso sinistra, quindi l'angolo di default punta lì.
  const shadow = useControls('Ombre', {
    enabled: { value: true, label: 'attiva' },
    angle: { value: 214, min: 0, max: 360, step: 1, label: 'direzione (°)' },
    distance: { value: 0.068, min: 0, max: 0.2, step: 0.001, label: 'distanza' },
    // In pixel del buffer, che sta a un quarto della risoluzione a schermo:
    // il valore vale quindi quattro volte tanto sul risultato finale.
    blur: { value: 0.75, min: 0, max: 16, step: 0.05, label: 'sfocatura' },
    opacity: { value: 0.54, min: 0, max: 1, step: 0.01, label: 'opacità' },
    color: { value: '#000000', label: 'colore' },
  })

  const parallax = useControls('Parallasse', {
    enabled: { value: false, label: 'attiva' },
    strength: { value: 0.06, min: 0, max: 0.3, step: 0.005, label: 'intensità' },
    lerp: { value: 0.06, min: 0.01, max: 0.3, step: 0.01, label: 'morbidezza' },
    gyro: { value: true, label: 'giroscopio' },
  })

  const wind = useControls('Vento', {
    // I parametri sono quelli tarati, ma il vento parte spento: la scena ferma
    // è il riferimento per giudicare allineamento e composizione.
    enabled: { value: false, label: 'attiva' },
    amp: { value: 1.75, min: 0, max: 3, step: 0.05, label: 'ampiezza' },
    ampA: { value: 0.03, min: 0, max: 0.12, step: 0.001, label: 'ampiezza A' },
    ampB: { value: 0.012, min: 0, max: 0.12, step: 0.001, label: 'ampiezza B' },
    speedA: { value: 1.3, min: 0.05, max: 3, step: 0.01, label: 'frequenza A' },
    speedB: { value: 2.1, min: 0.05, max: 4, step: 0.01, label: 'frequenza B' },
    gustSpeed: { value: 0.15, min: 0.01, max: 1, step: 0.01, label: 'folata' },
  })

  const groups = useControls('Piani', groupSchema)

  useControls({
    'Esporta JSON': button(() => {
      const { parallax: p, wind: w, groups: g, scene: s, shadow: sh } = latest.current
      const out = {
        scene: s,
        shadow: sh,
        parallax: p,
        wind: w,
        // `camera` è strumentazione di regia, non fa parte della scena.
        groups: Object.fromEntries(
          Object.keys(GROUPS).map((key) => [
            key,
            { label: GROUPS[key].label, depth: g[`${key}_depth`], wind: g[`${key}_wind`] },
          ]),
        ),
      }
      const json = JSON.stringify(out, null, 2)
      navigator.clipboard?.writeText(json)
      console.log(json)
    }),
  })

  latest.current = { parallax, wind, groups, scene, shadow }

  // Traits risolti per gruppo, nella forma che consumano gli Sprite.
  const traits = Object.fromEntries(
    Object.keys(GROUPS).map((key) => [key, { depth: groups[`${key}_depth`], wind: groups[`${key}_wind`] }]),
  )

  return { viewport, camera, scene, shadow, parallax, wind, traits }
}

// Aree visibili reali (CSS px), già al netto dell'interfaccia del browser.
export const DEVICES = {
  iphone15: { w: 393, h: 659 },
  iphonese: { w: 375, h: 553 },
  pixel8: { w: 412, h: 747 },
  iphone15full: { w: 393, h: 852 },
  full: null,
}

// Il pannello invade la scena mentre si valuta la composizione: sbiadisce
// quando il puntatore è altrove, sia aperto che chiuso.
export function DioramaPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [hover, setHover] = useState(false)
  const [dragging, setDragging] = useState(false)

  // Gli slider di leva catturano il puntatore: trascinando si esce dal
  // pannello e l'hover cade, facendolo sparire proprio mentre lo si regola.
  // Il trascinamento va quindi tracciato a parte, fino al rilascio ovunque avvenga.
  useEffect(() => {
    if (!dragging) return
    const onUp = () => setDragging(false)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging])

  // Barra spaziatrice per aprire/chiudere senza cercare il pannello.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        setCollapsed((c) => !c)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="leva-wrap"
      data-active={hover || dragging}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDown={() => setDragging(true)}
    >
      <Leva collapsed={{ collapsed, onChange: setCollapsed }} titleBar={{ title: 'Agrumì · regia' }} />
    </div>
  )
}
