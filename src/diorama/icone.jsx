// Icone delle righe del booking.
//
// **Segnaposto.** Quelle definitive arriveranno in vettoriale insieme al font:
// qui il tratto è disegnato su griglia 24, tutto in `currentColor` e senza
// riempimenti, così sostituirle vorrà dire cambiare il contenuto di questi tre
// `<svg>` e nient'altro — misura, colore e posizione li decide il CSS.
//
// Niente icone in texture: sono le uniche forme dell'interfaccia che devono
// restare nitide a qualunque scala della carta, ed è esattamente ciò che un
// vettoriale fa e un WebP no.

const comune = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

export function Calendario(props) {
  return (
    <svg {...comune} {...props}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
      <path d="M7.5 14h3v3h-3z" />
    </svg>
  )
}

export function Orologio(props) {
  return (
    <svg {...comune} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.3l3.4 2" />
    </svg>
  )
}

// I due segni sui bottoncini di carta. Tratto più grosso delle icone delle
// righe e archi al posto delle rette: su una piastrella storta un segno
// geometricamente perfetto stona, e il punto di quel bottone è che sia
// giocoso. Le due gambe della croce si incurvano entrambe verso l'alto — è
// quello che le fa sembrare disegnate a mano e non tracciate.
const segno = { ...comune, strokeWidth: 3.2 }

export function Croce(props) {
  return (
    <svg {...segno} {...props}>
      <path d="M7.7 7.7Q12.9 11.3 16.3 16.3" />
      <path d="M16.3 7.7Q11.1 11.3 7.7 16.3" />
    </svg>
  )
}

export function Freccia(props) {
  return (
    <svg {...segno} {...props}>
      <path d="M15 6.7C11.6 9.5 9.4 11.2 8.6 12c.8.8 3 2.5 6.4 5.3" />
    </svg>
  )
}

export function Persone(props) {
  return (
    <svg {...comune} {...props}>
      <circle cx="9.5" cy="8.5" r="3.5" />
      <path d="M3.5 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 5.4a3.5 3.5 0 0 1 0 6.2M17.5 14.6c1.9.7 3 2.5 3 4.9" />
    </svg>
  )
}
