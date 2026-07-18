import { useEffect, useMemo, useRef } from 'react'
import { useControls, button } from 'leva'

// Editor di placement live (pannello leva, DOM — sta FUORI dal Canvas).
// Selezioni un elemento e ne regoli u/v/s/rot/z a schermo; "copia JSON"
// mette negli appunti i valori aggiornati da reincollare in elements.js.
//
// I controlli si creano UNA VOLTA sola. Al cambio elemento carico i suoi
// valori negli slider con set() (flag `applying` per non patchare durante
// il caricamento). Gli edit reali degli slider patchano l'elemento selezionato.
//
// props: els, patch(name, changes), selected, setSelected
export default function PlacementEditor({ els, patch, selected, setSelected }) {
  const names = useMemo(() => els.map((e) => e.name), [els])
  const elsRef = useRef(els)
  elsRef.current = els
  const selRef = useRef(selected)
  selRef.current = selected
  const applying = useRef(true) // true al mount: non patchare i default iniziali

  const first = els.find((e) => e.name === selected) || els[0]

  const [{ u, v, s, rot, z }, set] = useControls('Placement', () => ({
    element: {
      value: selected,
      options: names,
      onChange: (val) => setSelected(val),
    },
    u: { value: first.u, min: 0, max: 1, step: 0.002 },
    v: { value: first.v, min: 0, max: 1, step: 0.002 },
    s: { value: first.s, min: 0.01, max: 1.5, step: 0.002 },
    rot: { value: first.rot || 0, min: -180, max: 180, step: 0.5 },
    z: { value: first.z, min: 0, max: 6, step: 0.05 },
    'copia JSON': button(() => copyJSON(elsRef.current)),
  }))

  // al cambio elemento: carica i suoi valori negli slider, senza patchare
  useEffect(() => {
    const c = elsRef.current.find((e) => e.name === selected)
    if (!c) return
    applying.current = true
    set({ u: c.u, v: c.v, s: c.s, rot: c.rot || 0, z: c.z })
    const id = requestAnimationFrame(() => {
      applying.current = false
    })
    return () => cancelAnimationFrame(id)
  }, [selected, set])

  // edit degli slider -> patcha l'elemento selezionato (salvo durante il load)
  useEffect(() => {
    if (applying.current) return
    patch(selRef.current, { u, v, s, rot, z })
  }, [u, v, s, rot, z, patch])

  return null
}

function copyJSON(els) {
  const rows = els
    .map((e) => {
      const rot = e.rot ? `, rot: ${round(e.rot)}` : ''
      return `  { name: '${e.name}', u: ${round(e.u)}, v: ${round(e.v)}, s: ${round(e.s)}${rot}, z: ${round(e.z)} },`
    })
    .join('\n')
  const text = `// placement aggiornato\n[\n${rows}\n]`
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {})
  // eslint-disable-next-line no-console
  console.log(text)
}

const round = (n) => Math.round(n * 1000) / 1000
