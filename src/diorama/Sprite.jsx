import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createShadowMaterial } from './shadowMaterial'

// Un layer del diorama: un piano piatto, unlit, rimesso esattamente dove stava
// nel PSD partendo dalle coordinate normalizzate del manifest.
//
// Struttura a due nodi: il <group> esterno sta sul *pivot* (base dello sprite,
// dove un ramo si attacca al tronco) e ruota col vento; la mesh dentro è
// spostata in modo che la sua immagine cada al posto giusto. Ruotare attorno al
// centro dell'immagine farebbe scivolare le foglie invece di farle ondeggiare.
export default function Sprite({ layer, texture, traits, world, order, parallax, wind, zSpread, shadow, scale }) {
  const pivot = useRef()

  const geom = useMemo(() => {
    // La scala agisce attorno al centro dello sprite: il centro resta fermo,
    // il pivot segue il nuovo bordo inferiore così il vento continua a
    // ruotarlo dalla base.
    const w = layer.w * world.w * scale
    const h = layer.h * world.h * scale
    // Centro dell'immagine in coordinate mondo (origine al centro della tela, Y in su).
    const cx = (layer.x + layer.w / 2 - 0.5) * world.w
    const cy = (0.5 - (layer.y + layer.h / 2)) * world.h
    // Pivot al bordo inferiore dell'immagine.
    const py = cy - h / 2
    return { w, h, cx, py, offsetY: h / 2 }
  }, [layer, world, scale])

  // Fase fissa per layer: senza, tutti oscillerebbero all'unisono.
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])

  const shadowMat = useMemo(() => createShadowMaterial(texture), [texture])
  useEffect(() => () => shadowMat.dispose(), [shadowMat])

  // Quanto lo sprite "stacca" dal piano dietro: è la stessa profondità che
  // guida la parallasse, così le due letture della scena restano coerenti.
  const lift = traits.depth
  const rad = (shadow.angle * Math.PI) / 180
  const dist = shadow.distance * lift
  const shadowPos = [Math.cos(rad) * dist, geom.offsetY + Math.sin(rad) * dist, 0]

  // Il piano dell'ombra deborda oltre lo sprite per lasciare spazio alla
  // sfocatura: l'anello più esterno arriva a 3.2 raggi, più un margine.
  const blurR = shadow.blur * (0.4 + 0.6 * lift)
  const pad = blurR * 4

  useEffect(() => {
    shadowMat.uniforms.uColor.value.set(shadow.color)
    shadowMat.uniforms.uOpacity.value = shadow.opacity
    // Il raggio è in unità mondo ma va usato in UV: diviso per le dimensioni
    // dello sprite, altrimenti gli sprite piccoli risulterebbero molto più
    // sfocati di quelli grandi.
    shadowMat.uniforms.uBlur.value.set(blurR / geom.w, blurR / geom.h)
    shadowMat.uniforms.uExpand.value.set((geom.w + 2 * pad) / geom.w, (geom.h + 2 * pad) / geom.h)
    // Sceglie un livello mip pari al raggio in pixel: è la sfocatura vera,
    // i campioni servono solo a smussarne la struttura.
    const px = (blurR / geom.w) * (layer.px?.w ?? 512)
    shadowMat.uniforms.uLod.value = Math.max(0, Math.log2(1 + px))
  }, [shadowMat, shadow, blurR, pad, geom, layer])

  useFrame(({ clock }) => {
    const g = pivot.current
    if (!g) return
    const t = clock.elapsedTime

    if (wind.enabled && traits.wind > 0) {
      // Folata lenta che modula tutto: "il vento respira".
      const gust = 0.6 + 0.4 * Math.sin(t * wind.gustSpeed + phase * 0.3)
      // Due seni a rapporto irrazionale: il ciclo non si ripete mai uguale.
      g.rotation.z =
        traits.wind *
        wind.amp *
        gust *
        (wind.ampA * Math.sin(t * wind.speedA + phase) + wind.ampB * Math.sin(t * wind.speedB + phase * 2))
    } else {
      g.rotation.z = 0
    }

    // Parallasse: i piani vicini si spostano di più. In ortografica la Z non
    // dà profondità, quindi lo scarto è tutto su X/Y.
    if (parallax.enabled) {
      const amt = traits.depth * parallax.strength
      g.position.x = geom.cx + parallax.value.current.x * amt * world.w
      g.position.y = geom.py + parallax.value.current.y * amt * world.h
    } else {
      g.position.x = geom.cx
      g.position.y = geom.py
    }

    // Solo per ispezionare il diorama con l'orbit control: l'ordine di disegno
    // resta dato da renderOrder (depthTest è off), quindi la Z non cambia nulla
    // visto di fronte.
    g.position.z = traits.depth * zSpread
  })

  return (
    <group ref={pivot} position={[geom.cx, geom.py, 0]}>
      {shadow.enabled && lift > 0 && (
        // Disegnata appena prima dello sprite: cade sul piano dietro, non su
        // tutto il fondale, così ogni layer ombreggia solo ciò che lo precede.
        <mesh position={shadowPos} renderOrder={order - 0.5} material={shadowMat}>
          <planeGeometry args={[geom.w + 2 * pad, geom.h + 2 * pad]} />
        </mesh>
      )}

      <mesh position={[0, geom.offsetY, 0]} renderOrder={order}>
        <planeGeometry args={[geom.w, geom.h]} />
        <meshBasicMaterial
          map={texture}
          transparent
          toneMapped={false}
          // L'ordine è dato da renderOrder, non dal buffer di profondità:
          // con 26 piani trasparenti sovrapposti il depth test creerebbe
          // bordi tagliati sulle sfumature di alpha.
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
