import { useState } from 'react'

// CTA della hero.
//
// Sta nel DOM sopra il canvas, non dentro il diorama: il testo resta
// vettoriale a qualsiasi densità, è un <button> vero (tastiera, lettori di
// schermo, focus) e cambiare la scritta non richiede di riesportare niente.
//
// Sceglie di NON somigliare alla scena. Il diorama è un mondo di carta
// materico e affollato: un bottone anch'esso di carta diventerebbe un altro
// oggetto del collage e smetterebbe di leggersi come qualcosa da toccare.
// Piatto, stampato e preciso, appartiene invece a un piano diverso —
// l'interfaccia sopra il mondo.
//
// Il navy viene dall'insegna, dove però compare solo come inchiostro: è
// l'unico colore della tavolozza che la scena non usa come superficie, quindi
// non lo si confonde con la scenografia. Essendo anche il valore più scuro,
// resta leggibile sia sul turchese del muro sia sul crema del terreno.
export default function Cta({ label = 'PRENOTA UN TAVOLO', onClick }) {
  const [pressed, setPressed] = useState(false)

  return (
    <div className="cta-wrap">
      <button
        type="button"
        className="cta"
        data-pressed={pressed}
        onPointerDown={() => setPressed(true)}
        // Il rilascio va intercettato anche fuori dal bottone: trascinando via
        // il dito resterebbe premuto per sempre.
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onClick={onClick}
      >
        {label}
      </button>
    </div>
  )
}
