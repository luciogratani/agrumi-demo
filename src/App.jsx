import React, { Suspense, useEffect, useState } from 'react'

// Le scene stanno su route dedicate, la home è vuota.
const HeroScene = React.lazy(() => import('./components/HeroScene.jsx')) // #/diorama — 5 piani
const Diorama = React.lazy(() => import('./diorama/Diorama.jsx')) // #/diorama2 — 26 layer

function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    const onChange = () => setRoute(window.location.hash.slice(1) || '/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export default function App() {
  const route = useHashRoute()

  // Solo `#/diorama2` sa dire quando ha davvero disegnato. Sulla home vuota e
  // sulla scena vecchia nessuno congederebbe la schermata di caricamento, che
  // resterebbe lì per sempre: qui la si congeda a montaggio avvenuto.
  useEffect(() => {
    if (route !== '/diorama2') window.__loader?.done()
  }, [route])

  const Scene = { '/diorama': HeroScene, '/diorama2': Diorama }[route]
  if (!Scene) return null

  return (
    <Suspense fallback={null}>
      <Scene />
    </Suspense>
  )
}
