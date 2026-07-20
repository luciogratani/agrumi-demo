import { useLayoutEffect } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Proporzioni della carta: è la stessa immagine che il loader mette come fondo
// in CSS, e va inquadrata identica di qua e di là.
export const MURO = { src: 'layers/muro-carta.webp', aspect: 1080 / 1920 }

// Zoom che inquadra la tela in "cover". Sta qui e non in Diorama perché lo
// usano in due — la camera e il muro — e devono usare esattamente lo stesso,
// altrimenti il fondo non combacia più con quello del loader.
export function coverZoom(size, world) {
  return Math.max(size.width / world.w, size.height / world.h)
}

// Fondale che sostituisce `0-sfondo`.
//
// `0-sfondo` era la composizione finale appiattita: comoda per le ombre già
// cotte, ma inchioda la parallasse (ogni elemento è già al suo posto lì dentro,
// quindi muovere i piani davanti li sdoppia). Qui il muro torna a essere solo
// un foglio di carta, e il pavimento un piano tinta unita.
export default function Backdrop({ world, floor }) {
  const wall = useLoader(THREE.TextureLoader, `${import.meta.env.BASE_URL}${MURO.src}`)
  const size = useThree((s) => s.size)

  useLayoutEffect(() => {
    wall.colorSpace = THREE.SRGBColorSpace
    wall.minFilter = THREE.LinearFilter
    wall.generateMipmaps = false
    wall.needsUpdate = true
  }, [wall])

  // Il muro copre il viewport, non il mondo 3:4: è la stessa carta che il
  // loader stende in CSS con `object-fit: cover`, e per non far saltare la
  // dissolvenza fra i due deve cadere agli stessi pixel. Lo zoom si ricalcola
  // qui con la formula della camera invece di leggerlo da `camera.zoom`, che
  // al primo render è ancora quello del fotogramma prima.
  //
  // Niente margine di sicurezza, per la stessa ragione: sarebbe uno scarto.
  // Con l'orbit control acceso si arriva a vedere oltre il bordo — è un
  // attrezzo da sviluppo, e comunque l'orbit sposta già tutto il resto.
  const zoom = coverZoom(size, world)
  const vw = size.width / zoom
  const vh = size.height / zoom
  const h = Math.max(vh, vw / MURO.aspect)
  const w = h * MURO.aspect

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
