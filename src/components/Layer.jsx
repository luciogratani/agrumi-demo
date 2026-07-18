import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Un prop di carta posizionato: unlit, matte, trasparenza corretta.
// x,y,z in unità mondo; height in unità mondo.
// La larghezza è derivata dall'aspect della texture stessa (niente hardcode).
// rot in gradi (rotazione sul piano, asse Z).
export default function Layer({ url, x, y, z, height, rot = 0, renderOrder = 0 }) {
  const tex = useTexture(url)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true

  const img = tex.image
  const aspect = img ? img.width / img.height : 1
  const width = height * aspect

  return (
    <mesh position={[x, y, z]} rotation={[0, 0, (rot * Math.PI) / 180]} renderOrder={renderOrder}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={tex}
        transparent
        toneMapped={false}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
