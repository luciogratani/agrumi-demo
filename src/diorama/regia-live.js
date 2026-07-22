import { useEffect, useRef, useState } from 'react'

// Il lato browser della regia condivisa (il centralino sta in `vite.config.js`).
//
// **Perché esiste.** Fino a ieri i valori si trovavano guardando il Mac, ma il
// bersaglio è il telefono, e le due cose non coincidono: la carta è larga 460 px
// su uno e 330 sull'altro, le ombre si leggono diversamente, e il vento che sul
// monitor è evidente sul vetro piccolo vale due pixel. Portare leva sul telefono
// non risolve — anzi peggiora, perché **il pollice si mette sopra la cosa da
// giudicare**. Quindi: si tara dove c'è spazio, si guarda dove conta, e i due
// dispositivi restano allineati da soli.
//
// **Come funziona.** Chi muove uno slider spedisce lo stato intero; chi lo
// riceve lo sovrappone al proprio. Il telefono non spedisce mai, semplicemente
// perché senza pannello i suoi valori non cambiano mai da soli.
//
// Solo in sviluppo: `import.meta.hot` non esiste nella build, e senza di lui
// tutto quanto qui sotto diventa una funzione che restituisce `null`.

const HOT = import.meta.hot

// Identificativo della scheda, per non riapplicarsi i propri valori.
const IO = Math.random().toString(36).slice(2)

export function useRegiaCondivisa(stato) {
  const [remoto, setRemoto] = useState(null)

  // L'ultimo stato ricevuto, per non rispedirlo indietro: applicarlo cambia i
  // valori locali, e senza questo guardia il rimbalzo sarebbe infinito.
  const ricevuto = useRef(null)

  useEffect(() => {
    if (!HOT) return
    const applica = (msg) => {
      if (!msg || msg.da === IO) return
      ricevuto.current = msg.stato
      setRemoto(JSON.parse(msg.stato))
    }
    HOT.on('regia:applica', applica)
    return () => HOT.off?.('regia:applica', applica)
  }, [])

  // Confronto sul testo e non sull'oggetto: `useDioramaControls` ne costruisce
  // uno nuovo a ogni render, quindi un confronto per identità spedirebbe
  // sempre. Costa una serializzazione per render, e i render qui avvengono
  // quando si muove un valore, non a ogni fotogramma.
  const testo = JSON.stringify(stato)
  const primo = useRef(true)

  useEffect(() => {
    if (!HOT) return
    // Al montaggio ognuno ha i valori di default: non c'è niente da annunciare,
    // e chi parla per primo sovrascriverebbe l'altro senza motivo.
    if (primo.current) {
      primo.current = false
      return
    }
    if (testo === ricevuto.current) return
    HOT.send('regia:cambia', { da: IO, stato: testo })
  }, [testo])

  return remoto
}

// Sovrappone i valori remoti ai locali, una cartella per volta. Le cartelle
// sono oggetti piatti di numeri e interruttori, quindi basta un livello.
export function sovrapponi(locale, remoto) {
  if (!remoto) return locale
  const out = { ...locale }
  for (const [chiave, valori] of Object.entries(remoto)) {
    out[chiave] = valori && typeof valori === 'object' ? { ...out[chiave], ...valori } : valori
  }
  return out
}
