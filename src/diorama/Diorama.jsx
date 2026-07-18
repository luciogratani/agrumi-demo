import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import manifest from './manifest.json'
import { castsShadow, FOLLOWS, groupKeyFor, isHidden, scaleFor } from './depth'
import { useDioramaControls, DioramaPanel, DEVICES } from './controls.jsx'
import Sprite, { computeGeom } from './Sprite.jsx'
import Backdrop from './Backdrop.jsx'
import ShadowPass from './ShadowPass.jsx'
import PivotEditor from './PivotEditor.jsx'
import { CAT, PIVOTS, pivotFor } from './rig'

// Mondo in unità normalizzate: altezza tela = 1, larghezza = aspect del PSD.
const WORLD = { w: manifest.canvas.aspect, h: 1 }

// Inquadra la tela in "cover": riempie sempre il viewport, ritagliando il lato
// che avanza. Su 9:16 il PSD (3:4) viene tagliato ai fianchi, non lascia bordi.
function CameraRig({ orbit, resetView }) {
  const cam = useRef()
  const controls = useRef()
  const { size } = useThree()

  const applyCover = useCallback(() => {
    if (!cam.current) return
    cam.current.zoom = Math.max(size.width / WORLD.w, size.height / WORLD.h)
    cam.current.updateProjectionMatrix()
  }, [size])

  // Il cover-fit si riapplica sul resize solo a orbit spento: altrimenti
  // sovrascriverebbe lo zoom scelto a mano dall'utente.
  useLayoutEffect(() => {
    if (!orbit) applyCover()
  }, [applyCover, orbit])

  // Riporta la camera esattamente com'era al mount.
  useEffect(() => {
    resetView.current = () => {
      const c = cam.current
      if (!c) return
      c.position.set(0, 0, 10)
      c.up.set(0, 1, 0)
      c.rotation.set(0, 0, 0)
      applyCover()
      if (controls.current) {
        controls.current.target.set(0, 0, 0)
        controls.current.update()
      }
    }
  }, [applyCover, resetView])

  return (
    <>
      <OrthographicCamera ref={cam} makeDefault position={[0, 0, 10]} near={-100} far={100} />
      <OrbitControls ref={controls} enabled={orbit} makeDefault />
    </>
  )
}

function Layers({ parallax, wind, traits, zSpread, scene, shadow, cat }) {
  // Puntatore normalizzato sul canvas, gia' mantenuto aggiornato da R3F.
  // Vale solo mentre il puntatore e' sulla scena: il gatto guarda chi lo
  // guarda, e smette quando ci si allontana.
  const pointer = useThree((s) => s.pointer)
  const urls = manifest.layers.map((l) => `${import.meta.env.BASE_URL}${l.src}`)
  const textures = useLoader(THREE.TextureLoader, urls)

  useLayoutEffect(() => {
    for (const t of textures) {
      t.colorSpace = THREE.SRGBColorSpace
      // I mip costano ~33% di memoria in più ma tolgono l'aliasing agli sprite
      // rimpiccioliti, che a questa densità di foglie si nota.
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.magFilter = THREE.LinearFilter
      t.generateMipmaps = true
      t.needsUpdate = true
    }
  }, [textures])

  // I layer solidali diventano figli nell'albero della scena, non voci a sé:
  // così ereditano vento, parallasse e profondità del padre e restano
  // ancorati, ma conservano perno e animazioni proprie.
  const kids = new Map()
  manifest.layers.forEach((layer, i) => {
    const parent = FOLLOWS[layer.slug]
    if (!parent) return
    kids.set(parent, [...(kids.get(parent) ?? []), { layer, index: i }])
  })

  // La testa a occhi chiusi ha lo stesso bounding box della testa aperta,
  // quindi il blink è uno scambio di texture sulla stessa mesh, non un layer
  // in più da sovrapporre.
  const blinkTexture = textures[manifest.layers.findIndex((l) => l.slug === CAT.blink)]

  const render = (layer, i, parentPivot) => {
    if (isHidden(layer)) return null

    // `0-sfondo` è la composizione appiattita: si mostra solo come riferimento
    // e non proietta ombra (le sue sono già cotte dentro).
    if (layer.slug === '0-sfondo' && !scene.showFlat) return null

    const geom = computeGeom(layer, WORLD, scaleFor(layer), pivotFor(layer))

    return (
      <Sprite
        key={layer.slug}
        layer={layer}
        texture={textures[i]}
        traits={traits[groupKeyFor(layer)]}
        world={WORLD}
        order={i}
        parallax={parallax}
        wind={wind}
        zSpread={zSpread}
        shadow={castsShadow(layer) ? shadow : { ...shadow, enabled: false }}
        scale={scaleFor(layer)}
        pivot={pivotFor(layer.slug)}
        parentPivot={parentPivot}
        breathe={layer.slug === CAT.body ? cat.breathe : undefined}
        track={layer.slug === CAT.head ? { ...cat.track, pointer } : undefined}
        idle={layer.slug === CAT.head ? cat.idle : undefined}
        bend={layer.slug === CAT.tail ? cat.tail : undefined}
        blink={layer.slug === CAT.head ? { ...cat.blink, texture: blinkTexture } : undefined}
      >
        {(kids.get(layer.slug) ?? []).map((k) => render(k.layer, k.index, geom))}
      </Sprite>
    )
  }

  return manifest.layers.map((layer, i) => (FOLLOWS[layer.slug] ? null : render(layer, i)))
}

// Puntatore su desktop, giroscopio su mobile. Il valore è normalizzato in
// [-1, 1] e inseguito con un lerp, così la parallasse non scatta mai.
function useParallaxInput({ enabled, lerp, gyro }) {
  const value = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!enabled) {
      // Da spento si torna al riposo, altrimenti la scena resterebbe
      // congelata nell'ultimo scarto invece che allineata.
      value.current.x = value.current.y = 0
      target.current.x = target.current.y = 0
      return
    }

    const onPointer = (e) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1
      target.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    const onOrient = (e) => {
      if (e.gamma == null || e.beta == null) return
      target.current.x = THREE.MathUtils.clamp(e.gamma / 30, -1, 1)
      target.current.y = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1)
    }

    window.addEventListener('pointermove', onPointer)

    // Da iOS 13 il giroscopio richiede un permesso esplicito, concedibile solo
    // durante un gesto dell'utente: si aggancia al primo tocco e poi si stacca.
    let onFirstTouch
    if (gyro) {
      const needsPermission = typeof DeviceOrientationEvent?.requestPermission === 'function'
      if (needsPermission) {
        onFirstTouch = async () => {
          try {
            if ((await DeviceOrientationEvent.requestPermission()) === 'granted') {
              window.addEventListener('deviceorientation', onOrient)
            }
          } catch {
            // Permesso negato o contesto non sicuro: resta la parallasse da puntatore.
          }
        }
        window.addEventListener('touchend', onFirstTouch, { once: true })
      } else {
        window.addEventListener('deviceorientation', onOrient)
      }
    }

    let raf
    const tick = () => {
      value.current.x += (target.current.x - value.current.x) * lerp
      value.current.y += (target.current.y - value.current.y) * lerp
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('deviceorientation', onOrient)
      if (onFirstTouch) window.removeEventListener('touchend', onFirstTouch)
      cancelAnimationFrame(raf)
    }
  }, [enabled, lerp, gyro])

  return value
}

export default function Diorama() {
  const resetView = useRef(null)

  // I perni si modificano cliccando sulla scena; il ref serve al bottone di
  // export del pannello, che legge lo stato corrente al momento del clic.
  const [pivots, setPivots] = useState(PIVOTS)
  const rig = useRef({ pivots })
  rig.current.pivots = pivots

  const { viewport, cat, camera, scene, shadow, parallax, wind, traits } =
    useDioramaControls(resetView, rig)
  const value = useParallaxInput(parallax)

  const device = DEVICES[viewport.device]

  return (
    <>
      {/* Leva sta fuori dalla cornice: resta raggiungibile senza coprire la scena. */}
      <DioramaPanel />

      <div className="diorama-stage">
        <div
          className="diorama-frame"
          data-full={!device}
          // Dimensioni reali in CSS px; il CSS le rimpicciolisce solo se non
          // ci stanno nella finestra, mantenendo le proporzioni.
          style={device ? { '--vw': `${device.w}px`, '--vh': `${device.h}px` } : undefined}
        >
          <Canvas
            className="diorama-canvas"
            // Su mobile il DPR pieno non ripaga: la scena è piatta e matte.
            dpr={[1, 2]}
            gl={{ antialias: false, alpha: false }}
            flat
          >
            <color attach="background" args={['#7fcdc8']} />
            <CameraRig orbit={camera.orbit} resetView={resetView} />
            <Suspense fallback={null}>
              <ShadowPass shadow={shadow} world={WORLD} />
              <Backdrop
                world={WORLD}
                floor={{ enabled: scene.floor, horizon: scene.horizon, color: scene.floorColor }}
              />
              <Layers
                parallax={{ ...parallax, value }}
                wind={wind}
                traits={traits}
                zSpread={camera.zSpread}
                scene={scene}
                shadow={shadow}
                cat={{
                  breathe: {
                    enabled: cat.breathe,
                    amp: cat.breatheAmp,
                    period: cat.breathePeriod,
                  },
                  idle: {
                    enabled: cat.idle,
                    maxDeg: cat.idleMaxDeg,
                    holdMin: cat.idleHoldMin,
                    holdMax: cat.idleHoldMax,
                    speed: cat.idleSpeed,
                  },
                  track: {
                    enabled: cat.track,
                    maxDeg: cat.trackMaxDeg,
                    deadzone: cat.trackDeadzone,
                    lerp: cat.trackLerp,
                  },
                  tail: {
                    enabled: cat.tail,
                    amp: cat.tailAmp,
                    freq: cat.tailFreq,
                    lag: cat.tailLag,
                  },
                  blink: {
                    enabled: cat.blink,
                    min: cat.blinkMin,
                    max: cat.blinkMax,
                  },
                }}
              />
              <PivotEditor
                world={WORLD}
                pivots={pivots}
                part={cat.part}
                active={cat.editPivots}
                onSet={(slug, pivot) => setPivots((p) => ({ ...p, [slug]: pivot }))}
              />
            </Suspense>
          </Canvas>
        </div>
      </div>
    </>
  )
}
