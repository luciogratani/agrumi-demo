import { useLayoutEffect } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

// Fondale che sostituisce `0-sfondo`.
//
// `0-sfondo` era la composizione finale appiattita: comoda per le ombre già
// cotte, ma inchioda la parallasse (ogni elemento è già al suo posto lì dentro,
// quindi muovere i piani davanti li sdoppia). Qui il muro torna a essere solo
// un foglio di carta, e il pavimento un piano tinta unita.
export default function Backdrop({ world, floor }) {
  const wall = useLoader(THREE.TextureLoader, `${import.meta.env.BASE_URL}layers/backdrop-muro.webp`)

  useLayoutEffect(() => {
    wall.colorSpace = THREE.SRGBColorSpace
    wall.minFilter = THREE.LinearFilter
    wall.generateMipmaps = false
    wall.needsUpdate = true
  }, [wall])

  // Il muro copre abbondantemente il frame: con la parallasse attiva scorre, e
  // senza margine si vedrebbe il bordo rientrare.
  const w = world.w * 1.4
  const h = world.h * 1.4

  // `horizon` è in coordinate tela (0 in alto, 1 in basso), come il manifest.
  const floorTop = (0.5 - floor.horizon) * world.h

  return (
    <group>
      <mesh renderOrder={-20} position={[0, 0, 0]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={wall} toneMapped={false} depthWrite={false} depthTest={false} />
      </mesh>

      {floor.enabled && (
        // Ancorato in alto al livello dell'orizzonte e sviluppato verso il
        // basso, così spostare l'orizzonte non scopre mai il fondo del frame.
        <mesh renderOrder={-19} position={[0, floorTop - h / 2, 0]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color={floor.color} toneMapped={false} depthWrite={false} depthTest={false} />
        </mesh>
      )}
    </group>
  )
}
