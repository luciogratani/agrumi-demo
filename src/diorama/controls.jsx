import { useEffect, useRef, useState } from 'react'
import { Leva, useControls, folder, button } from 'leva'
import { GROUPS } from './depth'
import { CAT } from './rig'
import { useRegiaCondivisa, sovrapponi } from './regia-live'

// Pannello di regia. Tutto ciò che si tara a occhio passa da qui, e il bottone
// "Esporta JSON" copia lo stato corrente negli appunti così com'è da
// reincollare in depth.js — niente trascrizione a mano dei valori.

// Le cartelle partono chiuse: aperte tutte insieme il pannello è più alto
// dello schermo e si lavora scorrendo. Si apre quella che serve.
const SHUT = { collapsed: true }

// Schema Leva per le profondità/vento dei singoli gruppi, generato da GROUPS
// così aggiungere un gruppo non richiede di toccare il pannello.
const groupSchema = Object.fromEntries(
  Object.entries(GROUPS).map(([key, g]) => [
    key,
    folder(
      {
        [`${key}_depth`]: { value: g.depth, min: 0, max: 1, step: 0.01, label: 'profondità' },
        [`${key}_wind`]: { value: g.wind, min: 0, max: 2, step: 0.01, label: 'vento' },
        [`${key}_exit`]: { value: g.exit, min: 0, max: 2, step: 0.01, label: 'corsa uscita' },
      },
      { collapsed: true, label: g.label },
    ),
  ]),
)

export function useDioramaControls(resetView, rig, transitionActions, introActions) {
  // I valori correnti, per il bottone di export: leggerli dallo state di React
  // dentro la callback darebbe una closure vecchia.
  const latest = useRef({})

  // A schermo pieno di default. La cornice-telefono resta come anteprima da
  // desktop — utile per controllare la composizione su un'area stretta senza
  // prendere in mano il telefono — ma non è più il modo normale di guardare.
  const viewport = useControls('Viewport', {
    device: {
      value: 'full',
      options: {
        'iPhone 15 · 393×659': 'iphone15',
        'iPhone SE · 375×553': 'iphonese',
        'Pixel 8 · 412×747': 'pixel8',
        'iPhone 15 a schermo intero · 393×852': 'iphone15full',
        'Finestra intera': 'full',
      },
      label: 'dispositivo',
    },
  }, SHUT)

  // Editor dei perni: con la modalità attiva si clicca sulla scena nel punto
  // di rotazione del pezzo selezionato, invece di indovinare le coordinate.
  // Non è solo roba da gatto: anche il tronchetto ruota attorno al suo innesto
  // sul tronco, e ora che ha un figlio appeso (3-2-sx) il perno gli serve per
  // non staccarsi col vento. Clic sull'innesto, poi «Esporta JSON» → PIVOTS.
  const perni = useControls('Perni', {
    editPivots: { value: false, label: 'modifica perni' },
    part: {
      value: CAT.head,
      options: {
        'gatto · testa': CAT.head,
        'gatto · coda': CAT.tail,
        tronchetto: '2-tronchetto-alto-sx',
      },
      label: 'pezzo',
    },
  }, SHUT)

  const cat = useControls('Rig gatto', {
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
  }, SHUT)

  const camera = useControls('Camera', {
    orbit: { value: false, label: 'orbit control' },
    // A z=0 tutti gli sprite sono complanari e orbitare mostrerebbe solo un
    // piano piatto: questo li distanzia in profondità per ispezionare il
    // diorama di lato. In ortografica la Z non altera l'inquadratura
    // frontale, quindi si può alzare senza falsare la composizione.
    zSpread: { value: 0, min: 0, max: 2, step: 0.01, label: 'separazione Z' },
    'Reset vista': button(() => resetView?.current?.()),
  }, SHUT)

  // `0-sfondo` è la composizione finale appiattita: utile come riferimento,
  // ma da spento lascia libera la parallasse. Al suo posto muro + pavimento.
  const scene = useControls('Sfondo', {
    showFlat: { value: false, label: '0-sfondo (appiattito)' },
    floor: { value: false, label: 'pavimento' },
    // L'orizzonte misurato sullo sfondo originale.
    horizon: { value: 0.7055, min: 0.4, max: 1, step: 0.001, label: 'orizzonte' },
    floorColor: { value: '#c1af93', label: 'colore pavimento' },
  }, SHUT)

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
  }, SHUT)

  // Le ombre della carta del booking. Non passano dal buffer del diorama: la
  // carta sta nel DOM, quindi le disegna il CSS con `drop-shadow`. Restano però
  // la stessa luce di tutto il resto — da destra in alto — e si tarano a occhio
  // di qui come ogni altro valore, invece di essere scritte a mano nel foglio
  // di stile. L'angolo parte uguale a quello delle ombre della scena.
  const paper = useControls('Ombre carta', {
    angle: { value: 233, min: 0, max: 360, step: 1, label: 'direzione (°)' },
    distance: { value: 14.5, min: 0, max: 60, step: 0.5, label: 'distanza (px)' },
    // Poca: la carta è ritagliata, non stampata, e un'ombra morbida la
    // farebbe galleggiare invece che appoggiare.
    blur: { value: 4, min: 0, max: 80, step: 1, label: 'sfocatura (px)' },
    opacity: { value: 0.4, min: 0, max: 1, step: 0.01, label: 'opacità' },
    // Righe e barra sono appoggiate **sul** foglio, non sul fondo: stessa luce,
    // ma molto più vicine, quindi ombra corta e netta. Una frazione sola invece
    // di una seconda terna di valori da tenere in accordo con la prima.
    pieces: { value: 0.4, min: 0, max: 1, step: 0.01, label: 'pezzi · frazione' },
    // Premendo, il pezzo si schiaccia contro il foglio.
    pressed: { value: 0.4, min: 0, max: 1, step: 0.01, label: 'premuto · frazione' },
    color: { value: '#000000', label: 'colore' },
  }, SHUT)

  const parallax = useControls('Parallasse', {
    enabled: { value: false, label: 'attiva' },
    strength: { value: 0.06, min: 0, max: 0.3, step: 0.005, label: 'intensità' },
    lerp: { value: 0.06, min: 0.01, max: 0.3, step: 0.01, label: 'morbidezza' },
    gyro: { value: true, label: 'giroscopio' },
  }, SHUT)

  const wind = useControls('Vento', {
    // Il vento parte acceso: l'allineamento dei piani è ormai fissato, quindi
    // la scena da giudicare è quella viva. Si spegne dal pannello quando serve
    // di nuovo il fermo immagine per la composizione.
    enabled: { value: true, label: 'attiva' },
    amp: { value: 1.2, min: 0, max: 3, step: 0.05, label: 'ampiezza' },
    ampA: { value: 0.03, min: 0, max: 0.12, step: 0.001, label: 'ampiezza A' },
    ampB: { value: 0.012, min: 0, max: 0.12, step: 0.001, label: 'ampiezza B' },
    speedA: { value: 1.3, min: 0.05, max: 3, step: 0.01, label: 'frequenza A' },
    speedB: { value: 2.1, min: 0.05, max: 4, step: 0.01, label: 'frequenza B' },
    gustSpeed: { value: 0.15, min: 0.01, max: 1, step: 0.01, label: 'folata' },
  }, SHUT)

  // Passaggio fra le tre scene del sito. I bottoni chiamano attraverso un ref
  // perché l'animazione ha bisogno di durata ed ease definite qui: leggerla
  // direttamente creerebbe un ciclo fra pannello e hook.
  const transition = useControls('Transizione', {
    // In altezze di schermo, moltiplicata per la `corsa uscita` del gruppo:
    // ben oltre 1 perché i gruppi lenti (0.65) devono comunque uscire tutti.
    strength: { value: 2.31, min: 0, max: 3, step: 0.01, label: 'corsa (schermi)' },
    duration: { value: 2, min: 0.2, max: 3, step: 0.05, label: 'durata (s)' },
    // `inOut` perché il diorama parte fermo e arriva fermo: un `out` secco
    // sembra che qualcuno l'abbia spinto, non che stia scorrendo.
    ease: {
      value: 'expo.inOut',
      options: {
        'power2.inOut (morbido)': 'power2.inOut',
        'power3.inOut': 'power3.inOut',
        'power4.inOut (deciso)': 'power4.inOut',
        'expo.inOut (scatto)': 'expo.inOut',
        'circ.inOut': 'circ.inOut',
        'back.inOut (rimbalzo)': 'back.inOut(1.1)',
        'none (lineare)': 'none',
      },
      label: 'ease',
    },
    // Quanto cielo resta visibile attorno alla carta della destinazione. È il
    // parametro che decide se il passaggio è uno stacco o una continuità: a 0
    // la carta copre tutto e si torna al taglio netto di prima.
    inset: { value: 22, min: 0, max: 80, step: 1, label: 'margine carta (px)' },
    // Foglie e limoni che restano appesi in alto a incorniciare la carta.
    linger: { value: true, label: 'cornice (elementi che restano)' },
    lingerExit: { value: 0.1, min: 0, max: 0.5, step: 0.01, label: 'cornice · corsa' },
    // I gesti sono il modo vero di giudicare la transizione, ma i bottoni
    // restano: servono a rivedere lo stesso passaggio molte volte di fila
    // mentre si tarano corsa e durata, cosa che a mano è scomoda.
    gestures: { value: true, label: 'gesti (wheel/swipe)' },
    // La convenzione nativa dice che il dito che sale scopre ciò che sta
    // sotto. È l'opposto di come si descrive a parole, quindi si prova.
    invert: { value: false, label: 'inverti direzione' },
    threshold: { value: 48, min: 10, max: 200, step: 1, label: 'soglia gesto (px)' },
    'Ripristina (hero)': button(() => transitionActions?.current?.reset()),
    'Scendi (booking)': button(() => transitionActions?.current?.go(-1)),
    'Sali (menu)': button(() => transitionActions?.current?.go(1)),
  }, SHUT)

  // Entrata della hero al caricamento: ripete il ritorno da booking a hero, ma
  // come intro. Riusa corsa, durata ed ease della transizione (è «lo stesso
  // movimento»), quindi qui restano solo l'interruttore e da dove parte: `da`
  // = -1 è la posa piena del booking, verso 0 un'entrata più corta.
  const intro = useControls('Intro', {
    enabled: { value: true, label: 'attiva' },
    from: { value: -1, min: -1, max: 0, step: 0.01, label: 'da (posa)' },
    'Rigioca intro': button(() => introActions?.current?.play()),
  }, SHUT)

  const groups = useControls('Piani', groupSchema, SHUT)

  useControls({
    'Esporta JSON': button(() => {
      const { parallax: p, wind: w, groups: g, scene: s, shadow: sh, cat: c, transition: tr, paper: pa } = latest.current
      const out = {
        pivots: rig?.current?.pivots,
        cat: c,
        scene: s,
        shadow: sh,
        paper: pa,
        parallax: p,
        wind: w,
        transition: tr,
        // `camera` è strumentazione di regia, non fa parte della scena.
        groups: Object.fromEntries(
          Object.keys(GROUPS).map((key) => [
            key,
            {
              label: GROUPS[key].label,
              depth: g[`${key}_depth`],
              wind: g[`${key}_wind`],
              exit: g[`${key}_exit`],
            },
          ]),
        ),
      }
      const json = JSON.stringify(out, null, 2)
      navigator.clipboard?.writeText(json)
      console.log(json)
    }),
  })

  // Ciò che viaggia fra i dispositivi: i valori **della scena**. Restano fuori
  // camera, perni e anteprima, che sono strumenti di regia — l'orbit control o
  // la cornice-telefono non hanno senso sul telefono vero, e sincronizzarli
  // vorrebbe dire farsi ruotare la camera sotto gli occhi mentre si guarda.
  const scena = { cat, scene, shadow, paper, parallax, wind, transition, intro, groups }
  const remoto = useRegiaCondivisa(scena)
  const vivo = sovrapponi(scena, remoto)

  latest.current = vivo

  // Traits risolti per gruppo, nella forma che consumano gli Sprite.
  const traits = Object.fromEntries(
    Object.keys(GROUPS).map((key) => [
      key,
      {
        depth: vivo.groups[`${key}_depth`],
        wind: vivo.groups[`${key}_wind`],
        exit: vivo.groups[`${key}_exit`],
      },
    ]),
  )

  return { viewport, perni, camera, traits, ...vivo }
}

// Aree visibili reali (CSS px), già al netto dell'interfaccia del browser.
export const DEVICES = {
  iphone15: { w: 393, h: 659 },
  iphonese: { w: 375, h: 553 },
  pixel8: { w: 412, h: 747 },
  iphone15full: { w: 393, h: 852 },
  full: null,
}

// Il pannello si chiama con **`L`** e parte nascosto: la scena ora occupa tutto
// lo schermo e contiene interfacce vere, quindi la regia è uno strumento che si
// tira fuori quando serve, non una presenza fissa in un angolo.
//
// Su telefono non c'è tastiera e quindi non compare mai — che è il
// comportamento voluto: lì si guarda il sito, non lo si regola.
export function DioramaPanel() {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'l' && e.key !== 'L') return
      // `Cmd+L`/`Ctrl+L` è la barra degli indirizzi, non roba nostra.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // La scena contiene campi di testo veri: scrivere «l» nel nome non deve
      // far comparire il pannello.
      const t = e.target
      if (t?.isContentEditable || /^(input|textarea|select)$/i.test(t?.tagName ?? '')) return
      e.preventDefault()
      setOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="leva-wrap">
      <Leva
        hidden={!open}
        collapsed={{ collapsed, onChange: setCollapsed }}
        titleBar={{ title: 'Agrumì · regia — L per chiudere' }}
        // Doppio della larghezza di default (280/160): con etichette lunghe
        // come «idle · rotazione max» quella standard le tronca.
        theme={{ sizes: { rootWidth: '560px', controlWidth: '320px' } }}
      />
    </div>
  )
}
