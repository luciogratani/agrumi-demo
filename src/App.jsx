import React, { Suspense } from 'react'

// La hero è il sito: sta sulla home, non più dietro una route. Resta caricata
// pigramente perché la schermata di caricamento in index.html dipinga prima che
// arrivi il chunk della scena — ed è la scena stessa a congedarla, quando ha
// davvero disegnato (`window.__loader.done()` in Diorama.jsx).
const Diorama = React.lazy(() => import('./diorama/Diorama.jsx'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Diorama />
    </Suspense>
  )
}
