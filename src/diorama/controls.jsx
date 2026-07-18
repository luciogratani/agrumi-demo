import { useEffect, useRef, useState } from 'react'
import { Leva, useControls, folder, button } from 'leva'
import { GROUPS } from './depth'
import { CAT } from './rig'

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

export function useDioramaControls(resetView, rig) {
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

  // Editor dei perni: con la modalità attiva si clicca sulla scena nel punto
  // di rotazione del pezzo selezionato, invece di indovinare le coordinate.
  const cat = useControls('Rig gatto', {
    editPivots: { value: false, label: 'modifica perni' },
    part: {
      value: CAT.head,
      options: { testa: CAT.head, coda: CAT.tail },
      label: 'pezzo',
    },
    // Respiro: l'unica cosa continua di un gatto fermo. Ampiezze minime, il
    // torace si allarga più di quanto si alzi.
    breathe: { value: true, label: 'respiro' },
    breatheAmp: { value: 1.3, min: 0, max: 4, step: 0.05, label: 'ampiezza respiro' },
    breathePeriod: { value: 4.7, min: 1, max: 10, step: 0.1, label: 'periodo (s)' },

    // Idle della testa: il comportamento principale su telefono, dove non
    // c'è un puntatore. Tiene la posa a lungo e la cambia in fretta.
    idle: { value: true, label: 'testa idle' },
    idleMaxDeg: { value: 8.5, min: 0, max: 15, step: 0.5, label: 'idle · rotazione max (°)' },
    idleHoldMin: { value: 2.5, min: 0.5, max: 15, step: 0.1, label: 'idle · pausa min (s)' },
    idleHoldMax: { value: 3.8, min: 0.5, max: 30, step: 0.1, label: 'idle · pausa max (s)' },
    idleSpeed: { value: 0.02, min: 0.01, max: 0.4, step: 0.005, label: 'idle · rapidità' },

    // Testa: la zona morta evita il tremolio da servomotore quando il dito
    // si muove di poco, il lerp basso toglie la reattività da videogioco.
    track: { value: false, label: 'testa segue puntatore' },
    trackMaxDeg: { value: 4, min: 0, max: 15, step: 0.5, label: 'rotazione max (°)' },
    trackDeadzone: { value: 0.15, min: 0, max: 0.6, step: 0.01, label: 'zona morta' },
    trackLerp: { value: 0.8, min: 0.005, max: 1, step: 0.005, label: 'rapidità' },

    // Coda: l'angolo cresce verso la punta e il ritardo lungo la coda
    // trasforma l'oscillazione in un'onda.
    tail: { value: true, label: 'coda' },
    tailAmp: { value: 9, min: 0, max: 30, step: 0.5, label: 'ampiezza coda (°)' },
    tailFreq: { value: 1.45, min: 0.05, max: 4, step: 0.05, label: 'frequenza coda' },
    tailLag: { value: 1.0, min: 0, max: 8, step: 0.1, label: 'ritardo punta' },

    // Blink: scambio secco, intervalli irregolari, ogni tanto doppio.
    blink: { value: true, label: 'blink' },
    blinkMin: { value: 3, min: 0.5, max: 15, step: 0.1, label: 'intervallo min (s)' },
    blinkMax: { value: 6, min: 0.5, max: 25, step: 0.1, label: 'intervallo max (s)' },
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
    angle: { value: 217, min: 0, max: 360, step: 1, label: 'direzione (°)' },
    distance: { value: 0.066, min: 0, max: 0.2, step: 0.001, label: 'distanza' },
    // Risoluzione del buffer in cui le ombre vengono disegnate e sfocate.
    // Un quarto è quella usata finora: costa un sedicesimo dei pixel e la
    // riduzione stessa fa parte della sfocatura. Le altre servono a confronto.
    resolution: {
      value: 0.5,
      options: { 'Piena': 1, 'Metà': 0.5, 'Un quarto': 0.25 },
      label: 'risoluzione',
    },
    // In pixel a schermo, non del buffer: cambiando risoluzione la sfocatura
    // resta la stessa e si confronta solo la qualità, non l'entità.
    blur: { value: 12.5, min: 0, max: 64, step: 0.5, label: 'sfocatura (px)' },
    // Ogni passata allarga il raggio senza aggiungere campioni. A risoluzione
    // piena serve alzarle, perché con pochi campioni su un raggio ampio
    // ricompare la struttura del kernel.
    iterations: { value: 1, min: 1, max: 4, step: 1, label: 'passate' },
    opacity: { value: 0.55, min: 0, max: 1, step: 0.01, label: 'opacità' },
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
    amp: { value: 0.85, min: 0, max: 3, step: 0.05, label: 'ampiezza' },
    ampA: { value: 0.03, min: 0, max: 0.12, step: 0.001, label: 'ampiezza A' },
    ampB: { value: 0.012, min: 0, max: 0.12, step: 0.001, label: 'ampiezza B' },
    speedA: { value: 1.3, min: 0.05, max: 3, step: 0.01, label: 'frequenza A' },
    speedB: { value: 2.1, min: 0.05, max: 4, step: 0.01, label: 'frequenza B' },
    gustSpeed: { value: 0.15, min: 0.01, max: 1, step: 0.01, label: 'folata' },
  })

  const groups = useControls('Piani', groupSchema)

  useControls({
    'Esporta JSON': button(() => {
      const { parallax: p, wind: w, groups: g, scene: s, shadow: sh, cat: c } = latest.current
      const out = {
        pivots: rig?.current?.pivots,
        cat: c,
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

  latest.current = { parallax, wind, groups, scene, shadow, cat }

  // Traits risolti per gruppo, nella forma che consumano gli Sprite.
  const traits = Object.fromEntries(
    Object.keys(GROUPS).map((key) => [key, { depth: groups[`${key}_depth`], wind: groups[`${key}_wind`] }]),
  )

  return { viewport, cat, camera, scene, shadow, parallax, wind, traits }
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
      <Leva
        collapsed={{ collapsed, onChange: setCollapsed }}
        titleBar={{ title: 'Agrumì · regia' }}
        // Doppio della larghezza di default (280/160): con etichette lunghe
        // come «idle · rotazione max» quella standard le tronca.
        theme={{ sizes: { rootWidth: '560px', controlWidth: '320px' } }}
      />
    </div>
  )
}
