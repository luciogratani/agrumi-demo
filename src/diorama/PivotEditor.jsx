import { useMemo } from 'react'
import * as THREE from 'three'

// Editor dei perni: si clicca sulla scena nel punto attorno a cui un pezzo
// deve ruotare, invece di indovinare le coordinate a numeri.
//
// Il piano invisibile davanti a tutto intercetta il clic e ne ricava la
// posizione in coordinate tela normalizzate — le stesse del manifest — così
// il valore esportato si incolla direttamente in rig.js.

function Marker({ pivot, world, active }) {
  const position = useMemo(
    () => [(pivot.x - 0.5) * world.w, (0.5 - pivot.y) * world.h, 0],
    [pivot, world],
  )
  const r = world.h * 0.012

  return (
    <group position={position} renderOrder={900}>
      <mesh renderOrder={900}>
        <ringGeometry args={[r * 0.55, r, 24]} />
        <meshBasicMaterial
          color={active ? '#ffdd33' : '#ffffff'}
          transparent
          opacity={active ? 1 : 0.5}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      {/* Puntino centrale: il cerchio da solo lascia ambiguo il centro esatto. */}
      <mesh renderOrder={901}>
        <circleGeometry args={[r * 0.18, 12]} />
        <meshBasicMaterial
          color={active ? '#ffdd33' : '#ffffff'}
          transparent
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export default function PivotEditor({ world, pivots, part, active, onSet }) {
  if (!active) return null

  return (
    <>
      {/* Trasparente ma presente: serve solo a raccogliere il clic. */}
      <mesh
        renderOrder={899}
        onPointerDown={(e) => {
          e.stopPropagation()
          onSet(part, {
            x: e.point.x / world.w + 0.5,
            y: 0.5 - e.point.y / world.h,
          })
        }}
      >
        <planeGeometry args={[world.w * 4, world.h * 4]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} depthWrite={false} />
      </mesh>

      {Object.entries(pivots).map(([slug, pivot]) => (
        <Marker key={slug} pivot={pivot} world={world} active={slug === part} />
      ))}
    </>
  )
}
