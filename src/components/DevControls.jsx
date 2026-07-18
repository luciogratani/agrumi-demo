import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls, button } from 'leva'
import { fitCover } from '../scene/fit.js'

// Hub dei controlli di sviluppo (pannello leva).
// Va montato DENTRO al <Canvas>. Nuovi controlli si aggiungono qui,
// raggruppati per folder leva.
//
// Gruppo "Camera": OrbitControls on/off (default off) + Reset view.
export default function DevControls() {
  const { camera, size } = useThree()
  const orbitRef = useRef(null)

  const resetView = () => {
    const c = orbitRef.current
    // reset() ripristina lo stato salvato al mount (posizione/target/zoom).
    // Senza questo, l'update() interno con damping risovrascrive la camera.
    if (c) c.reset()
    // riadatta il cover nel caso il viewport sia cambiato dal mount
    camera.position.set(0, 0, 100)
    camera.up.set(0, 1, 0)
    fitCover(camera, size.width, size.height)
    if (c) {
      c.target.set(0, 0, 0)
      c.update()
    }
  }

  const { orbit } = useControls('Camera', {
    orbit: { value: false, label: 'orbit control' },
    'reset view': button(resetView),
  })

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      enabled={orbit}
      enableDamping
      dampingFactor={0.08}
      panSpeed={0.8}
      zoomSpeed={0.8}
      minZoom={0.05}
      maxZoom={50}
    />
  )
}
