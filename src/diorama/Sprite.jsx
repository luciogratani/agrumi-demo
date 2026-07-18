import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SHADOW_LAYER } from './ShadowPass.jsx'
import { createBendMaterial } from './bend'

// Geometria di un layer in coordinate mondo, dal manifest.
//
// `scale` agisce attorno al centro dell'immagine. `pivot` (opzionale, in
// coordinate tela normalizzate) è il punto attorno a cui il layer ruota: senza,
// si usa il bordo inferiore, che va bene per una foglia attaccata a un ramo ma
// non per la testa di un gatto, che deve girare attorno alla base del collo.
function computeGeom(layer, world, scale, pivot) {
  const w = layer.w * world.w * scale
  const h = layer.h * world.h * scale
  // Centro dell'immagine (origine al centro della tela, Y verso l'alto).
  const cx = (layer.x + layer.w / 2 - 0.5) * world.w
  const cy = (0.5 - (layer.y + layer.h / 2)) * world.h

  const px = pivot ? (pivot.x - 0.5) * world.w : cx
  const py = pivot ? (0.5 - pivot.y) * world.h : cy - h / 2

  // Scarto fra il perno (origine del gruppo) e il centro dell'immagine.
  return { w, h, cx, cy, px, py, localX: cx - px, localY: cy - py }
}

// I piani di un layer: quello visibile e, se proietta ombra, la sagoma che
// finisce nel buffer delle ombre.
function Planes({ geom, texture, order, shadowOffset, castsShadow, toShadowLayer, materials, segments = 1, meshRef }) {
  const args = [geom.w, geom.h, 1, segments]

  return (
    <>
      {castsShadow && (
        // Solo la sagoma piatta: la sfocatura la fa ShadowPass sul buffer,
        // dove tutte le ombre sono già unite.
        <mesh
          ref={toShadowLayer}
          position={[geom.localX + shadowOffset[0], geom.localY + shadowOffset[1], 0]}
          material={materials?.shadow}
        >
          <planeGeometry args={args} />
          {!materials && (
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
          )}
        </mesh>
      )}

      <mesh ref={meshRef} position={[geom.localX, geom.localY, 0]} renderOrder={order} material={materials?.main}>
        <planeGeometry args={args} />
        {!materials && (
          <meshBasicMaterial
            map={texture}
            transparent
            toneMapped={false}
            // L'ordine è dato da renderOrder, non dal buffer di profondità:
            // con tanti piani trasparenti sovrapposti il depth test creerebbe
            // bordi tagliati sulle sfumature di alpha.
            depthWrite={false}
            depthTest={false}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>
    </>
  )
}

// Un layer del diorama: un piano piatto, unlit, rimesso esattamente dove stava
// nel PSD partendo dalle coordinate normalizzate del manifest.
//
// Struttura a due nodi: il <group> esterno sta sul perno e porta tutte le
// trasformazioni (vento, parallasse, respiro, inseguimento); la mesh dentro è
// spostata in modo che la sua immagine cada al posto giusto.
//
// `attached` sono layer solidali (per esempio il logo stampato sull'insegna):
// stanno dentro lo stesso gruppo, quindi condividono perno e movimenti invece
// di animarsi per conto proprio.
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
  pivot,
  attached = [],
  breathe,
  track,
  idle,
  bend,
  blink,
}) {
  const group = useRef()

  const geom = useMemo(() => computeGeom(layer, world, scale, pivot), [layer, world, scale, pivot])

  // Fase fissa per layer: senza, tutti oscillerebbero all'unisono.
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])

  // Quanto lo sprite "stacca" dal piano dietro: è la stessa profondità che
  // guida la parallasse, così le due letture della scena restano coerenti.
  const lift = traits.depth
  const rad = (shadow.angle * Math.PI) / 180
  const dist = shadow.distance * lift
  const shadowOffset = [Math.cos(rad) * dist, Math.sin(rad) * dist]

  // La sagoma va sul layer dedicato: viene disegnata solo nel buffer delle
  // ombre, mai direttamente a schermo.
  const toShadowLayer = useCallback((mesh) => mesh?.layers.set(SHADOW_LAYER), [])

  // La coda ha materiali propri perché la piegatura avviene sui vertici, e
  // deve valere anche per la sua ombra: altrimenti l'ombra resterebbe dritta.
  const bendMats = useMemo(() => {
    if (!bend) return null
    const main = createBendMaterial(texture)
    const sh = createBendMaterial(texture, { shadow: true })
    return { main, shadow: sh }
  }, [bend, texture])

  useEffect(
    () => () => {
      bendMats?.main.material.dispose()
      bendMats?.shadow.material.dispose()
    },
    [bendMats],
  )

  useEffect(() => {
    if (!bendMats) return
    for (const { uniforms } of [bendMats.main, bendMats.shadow]) {
      uniforms.uPivot.value.set(-geom.localX, -geom.localY)
      uniforms.uLen.value = geom.h
    }
  }, [bendMats, geom])

  // Geometrie dei solidali, espresse rispetto al perno del padre.
  const children = useMemo(
    () =>
      attached.map((a) => {
        const g = computeGeom(a.layer, world, a.scale)
        return { ...a, geom: { ...g, localX: g.cx - geom.px, localY: g.cy - geom.py } }
      }),
    [attached, world, geom],
  )

  // Stato dell'inseguimento e del blink fra un fotogramma e l'altro.
  const state = useRef({
    turn: 0,
    idle: 0,
    idleTarget: 0,
    nextTurn: 1 + Math.random() * 3,
    nextBlink: 2 + Math.random() * 4,
    closeUntil: 0,
    again: false,
  })
  const headMesh = useRef()

  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const t = clock.elapsedTime
    const s = state.current

    let rotation = 0

    if (wind.enabled && traits.wind > 0) {
      // Folata lenta che modula tutto: "il vento respira".
      const gust = 0.6 + 0.4 * Math.sin(t * wind.gustSpeed + phase * 0.3)
      // Due seni a rapporto irrazionale: il ciclo non si ripete mai uguale.
      rotation =
        traits.wind *
        wind.amp *
        gust *
        (wind.ampA * Math.sin(t * wind.speedA + phase) + wind.ampB * Math.sin(t * wind.speedB + phase * 2))
    }

    // Idle autonomo: è il comportamento principale su telefono, dove non c'è
    // un puntatore da inseguire. Un gatto non ondeggia di continuo — sta
    // fermo a lungo, gira la testa in fretta, e torna fermo. Quindi qui non
    // c'è nessun seno: si sceglie una posa, la si raggiunge, la si tiene.
    if (idle?.enabled) {
      if (t >= s.nextTurn) {
        // Spesso rimette la testa dritta invece di scegliere un altro angolo:
        // altrimenti sembra che cerchi qualcosa senza mai trovarlo.
        s.idleTarget =
          Math.random() < 0.4 ? 0 : (Math.random() * 2 - 1) * THREE.MathUtils.degToRad(idle.maxDeg)
        s.nextTurn = t + idle.holdMin + Math.random() * (idle.holdMax - idle.holdMin)
      }
      s.idle += (s.idleTarget - s.idle) * idle.speed
      rotation += s.idle
    }

    // Inseguimento del puntatore: la zona morta è ciò che evita il tremolio
    // da servomotore, e il lerp lento toglie la reattività da videogioco.
    if (track?.enabled) {
      const px = track.pointer.x
      const over = Math.max(0, Math.abs(px) - track.deadzone) / (1 - track.deadzone)
      const target = -Math.sign(px) * over * THREE.MathUtils.degToRad(track.maxDeg)
      s.turn += (target - s.turn) * track.lerp
      rotation += s.turn
    }

    g.rotation.z = rotation

    // Parallasse: i piani vicini si spostano di più. In ortografica la Z non
    // dà profondità, quindi lo scarto è tutto su X/Y.
    if (parallax.enabled) {
      const amt = traits.depth * parallax.strength
      g.position.x = geom.px + parallax.value.current.x * amt * world.w
      g.position.y = geom.py + parallax.value.current.y * amt * world.h
    } else {
      g.position.x = geom.px
      g.position.y = geom.py
    }

    // Respiro: il perno è in basso, quindi il torace si allarga verso l'alto e
    // ai lati senza staccare il gatto dal ramo. Orizzontale più della
    // verticale: un torace si allarga, non si allunga.
    if (breathe?.enabled) {
      const b = Math.sin((t * Math.PI * 2) / breathe.period) * breathe.amp
      g.scale.set(1 + 0.008 * b, 1 + 0.005 * b, 1)
    } else {
      g.scale.set(1, 1, 1)
    }

    if (bendMats && bend) {
      for (const { uniforms } of [bendMats.main, bendMats.shadow]) {
        uniforms.uTime.value = t
        uniforms.uAmp.value = bend.enabled ? THREE.MathUtils.degToRad(bend.amp) : 0
        uniforms.uFreq.value = bend.freq
        uniforms.uLag.value = bend.lag
      }
    }

    // Blink: niente dissolvenza, uno scambio secco. Dura meno di un decimo di
    // secondo, e a volte è doppio come nei gatti veri.
    if (blink?.enabled && headMesh.current) {
      if (t >= s.nextBlink) {
        s.closeUntil = t + 0.09
        s.again = Math.random() < 0.25
        s.nextBlink = t + blink.min + Math.random() * (blink.max - blink.min)
      } else if (s.again && t > s.closeUntil + 0.12) {
        s.closeUntil = t + 0.09
        s.again = false
      }
      const closed = t < s.closeUntil
      const wanted = closed ? blink.texture : texture
      if (headMesh.current.material.map !== wanted) headMesh.current.material.map = wanted
    }

    // Solo per ispezionare il diorama con l'orbit control: l'ordine di disegno
    // resta dato da renderOrder (depthTest è off), quindi la Z non cambia nulla
    // visto di fronte.
    g.position.z = traits.depth * zSpread
  })

  return (
    <group ref={group} position={[geom.px, geom.py, 0]}>
      <Planes
        geom={geom}
        texture={texture}
        order={order}
        shadowOffset={shadowOffset}
        castsShadow={shadow.enabled && lift > 0}
        toShadowLayer={toShadowLayer}
        materials={bendMats && { main: bendMats.main.material, shadow: bendMats.shadow.material }}
        segments={bend ? 12 : 1}
        meshRef={headMesh}
      />

      {children.map((c) => (
        <Planes
          key={c.layer.slug}
          geom={c.geom}
          texture={c.texture}
          order={c.order}
          shadowOffset={shadowOffset}
          castsShadow={shadow.enabled && lift > 0 && c.castsShadow}
          toShadowLayer={toShadowLayer}
        />
      ))}
    </group>
  )
}
