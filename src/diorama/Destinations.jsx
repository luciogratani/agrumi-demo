import { useEffect, useRef } from 'react'

// Le due scene di destinazione, per ora **segnaposto**: servono a giudicare
// l'arrivo, non a essere il booking o il menu.
//
// Finché il diorama usciva verso il vuoto si poteva valutare solo la partenza,
// mentre sono durata ed ease a dipendere da cosa c'è dall'altra parte: due
// secondi verso il nulla e due secondi verso una pagina piena non si leggono
// allo stesso modo.
//
// Sono DOM sopra il canvas, come la CTA e per lo stesso motivo: testo nitido a
// qualsiasi densità e, quando saranno reali, form e menu veri — accessibili,
// selezionabili, senza niente da riesportare.
//
// Scorrono in senso opposto al diorama e in modo lineare rispetto a `p`:
// arrivano esattamente mentre la scena se ne va. GSAP le muove tramite
// `subscribe`, quindi condividono l'ease con la scena senza doverlo ripetere.
export default function Destinations({ actions }) {
  const booking = useRef()
  const menu = useRef()

  useEffect(
    () =>
      actions.current?.subscribe((p) => {
        // Booking sta sotto: fuori dal frame a p=0, in posizione a p=1.
        if (booking.current) {
          booking.current.style.transform = `translateY(${(1 - p) * 100}%)`
          // Fuori posizione non deve intercettare i gesti destinati alla scena.
          booking.current.style.pointerEvents = p > 0.99 ? 'auto' : 'none'
        }
        // Menu sta sopra: fuori dal frame a p=0, in posizione a p=-1.
        if (menu.current) {
          menu.current.style.transform = `translateY(${(1 + p) * -100}%)`
          menu.current.style.pointerEvents = p < -0.99 ? 'auto' : 'none'
        }
      }),
    [actions],
  )

  return (
    <>
      <section ref={menu} className="scene-panel" data-scene="menu" aria-hidden="true">
        <h2>Menu</h2>
        <p>Segnaposto — scorri verso l’alto per tornare alla hero.</p>
      </section>

      <section ref={booking} className="scene-panel" data-scene="booking" aria-hidden="true">
        <h2>Prenota</h2>
        <p>Segnaposto — scorri verso il basso per tornare alla hero.</p>
      </section>
    </>
  )
}
