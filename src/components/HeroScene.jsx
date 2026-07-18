import { Suspense, useLayoutEffect, useState, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { Leva } from 'leva'
import Layer from './Layer.jsx'
import DevControls from './DevControls.jsx'
import PlacementEditor from './PlacementEditor.jsx'
import { ELEMENTS } from '../scene/elements.js'
import { place, fitCover } from '../scene/fit.js'

// Mantiene l'inquadratura cover al mount e a ogni resize del viewport.
function CoverRig() {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    fitCover(camera, size.width, size.height)
  }, [camera, size])
  return null
}

export default function HeroScene() {
  // ELEMENTS è editabile a runtime via PlacementEditor (dev).
  const [els, setEls] = useState(ELEMENTS)
  const [selected, setSelected] = useState(ELEMENTS[0].name)

  const patch = useCallback((name, changes) => {
    setEls((prev) => prev.map((e) => (e.name === name ? { ...e, ...changes } : e)))
  }, [])

  return (
    <div className="hero-root">
      <Leva />
      <PlacementEditor els={els} patch={patch} selected={selected} setSelected={setSelected} />
      <div className="phone-frame">
        <Canvas
          className="hero-canvas"
          flat
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={['#ffffff']} />
          <OrthographicCamera makeDefault position={[0, 0, 100]} near={0.1} far={1000} />
          <CoverRig />
          <DevControls />
          <Suspense fallback={null}>
            {els.map((el, i) => {
              const p = place(el)
              return (
                <Layer
                  key={el.name}
                  url={el.url}
                  x={p.x}
                  y={p.y}
                  z={el.z}
                  height={p.height}
                  rot={el.rot || 0}
                  // ordine di disegno dallo z (painter's order, depthWrite:false);
                  // +i come tie-break stabile per elementi allo stesso z
                  renderOrder={el.z * 1000 + i}
                />
              )
            })}
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
