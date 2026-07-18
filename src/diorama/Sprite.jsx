import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SHADOW_LAYER } from './ShadowPass.jsx'

// Geometria di un layer in coordinate mondo, dal manifest.
// `scale` agisce attorno al centro: il centro resta fermo e il pivot segue il
// nuovo bordo inferiore, così il vento continua a ruotare lo sprite dalla base.
function computeGeom(layer, world, scale) {
  const w = layer.w * world.w * scale
  const h = layer.h * world.h * scale
  // Centro dell'immagine (origine al centro della tela, Y verso l'alto).
  const cx = (layer.x + layer.w / 2 - 0.5) * world.w
  const cy = (0.5 - (layer.y + layer.h / 2)) * world.h
  return { w, h, cx, cy, py: cy - h / 2, offsetY: h / 2 }
}

// Piano di un layer, disegnato a schermo e (se proietta ombra) anche nel
// buffer delle ombre.
function Planes({ geom, texture, order, shadowPos, castsShadow, toShadowLayer }) {
  return (
    <>
      {castsShadow && (
        // Solo la sagoma piatta: la sfocatura la fa ShadowPass sul buffer,
        // dove tutte le ombre sono già unite.
        <mesh ref={toShadowLayer} position={shadowPos}>
          <planeGeometry args={[geom.w, geom.h]} />
          <meshBasicMaterial
            map={texture}
            transparent
            toneMapped={false}
            depthWrite={false}
            depthTest={false}
            // L'unione va fatta col massimo, non con la somma: due sagome
            // sovrapposte devono dare una sola ombra, non una più scura.
            blending={THREE.CustomBlending}
            blendEquation={THREE.MaxEquation}
            blendSrc={THREE.OneFactor}
            blendDst={THREE.OneFactor}
          />
        </mesh>
      )}

      <mesh position={[geom.localX ?? 0, geom.localY ?? geom.offsetY, 0]} renderOrder={order}>
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
    </>
  )
}

// Un layer del diorama: un piano piatto, unlit, rimesso esattamente dove stava
// nel PSD partendo dalle coordinate normalizzate del manifest.
//
// Struttura a due nodi: il <group> esterno sta sul *pivot* (base dello sprite,
// dove un ramo si attacca al tronco) e ruota col vento; la mesh dentro è
// spostata in modo che la sua immagine cada al posto giusto. Ruotare attorno al
// centro dell'immagine farebbe scivolare le foglie invece di farle ondeggiare.
//
// `attached` sono layer solidali (per esempio il logo stampato sull'insegna):
// stanno dentro lo stesso gruppo, quindi condividono pivot, rotazione e
// parallasse invece di oscillare per conto proprio.
export default function Sprite({
  layer,
  texture,
  traits,
  world,
  order,
  parallax,
  wind,
  zSpread,
  shadow,
  scale,
  attached = [],
}) {
  const pivot = useRef()

  const geom = useMemo(() => computeGeom(layer, world, scale), [layer, world, scale])

  // Fase fissa per layer: senza, tutti oscillerebbero all'unisono.
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])

  // Quanto lo sprite "stacca" dal piano dietro: è la stessa profondità che
  // guida la parallasse, così le due letture della scena restano coerenti.
  const lift = traits.depth
  const rad = (shadow.angle * Math.PI) / 180
  const dist = shadow.distance * lift
  const shadowDx = Math.cos(rad) * dist
  const shadowDy = Math.sin(rad) * dist

  // La sagoma va sul layer dedicato: viene disegnata solo nel buffer delle
  // ombre, mai direttamente a schermo.
  const toShadowLayer = useCallback((mesh) => mesh?.layers.set(SHADOW_LAYER), [])

  // Geometrie dei solidali, espresse rispetto al pivot del padre.
  const children = useMemo(
    () =>
      attached.map((a) => {
        const g = computeGeom(a.layer, world, a.scale)
        return { ...a, geom: { ...g, localX: g.cx - geom.cx, localY: g.cy - geom.py } }
      }),
    [attached, world, geom],
  )

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
      <Planes
        geom={geom}
        texture={texture}
        order={order}
        shadowPos={[shadowDx, geom.offsetY + shadowDy, 0]}
        castsShadow={shadow.enabled && lift > 0}
        toShadowLayer={toShadowLayer}
      />

      {children.map((c) => (
        <Planes
          key={c.layer.slug}
          geom={c.geom}
          texture={c.texture}
          order={c.order}
          shadowPos={[c.geom.localX + shadowDx, c.geom.localY + shadowDy, 0]}
          castsShadow={shadow.enabled && lift > 0 && c.castsShadow}
          toShadowLayer={toShadowLayer}
        />
      ))}
    </group>
  )
}
