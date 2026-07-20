import { useCallback, useEffect, useRef } from 'react'
import Booking from './Booking.jsx'

// Le due scene di destinazione.
//
// **La destinazione non copre il mondo, ci si appoggia sopra.** Prima era un
// rettangolo opaco a tutto schermo e copriva anche il cielo: il mondo cambiava
// tutto insieme — oggetti, fondo e materiale — ed è da lì che veniva il taglio,
// non dal fatto che ci fosse del testo. Il cielo è l'unica cosa che già non si
// muove (`exit: 0`, e non è nemmeno uno Sprite), quindi era continuità
// disponibile che stavamo buttando via.
//
// Ora la destinazione è **un foglio di carta** che sale sul cielo: stesso
// materiale del diorama, e il testo ci sta sopra invece che sulla scena, così
// resta leggibile — che è il vincolo duro, visto che il booking è un form.
//
// Due nodi e non uno: il wrapper è trasparente e a tutto schermo, ed è lui che
// trasla. Traslando direttamente la carta, che è più piccola della cornice, un
// `translateY(100%)` la sposterebbe solo della propria altezza e ne resterebbe
// una striscia visibile in fondo.
//
// **Dentro la carta non si scorre mai.** Lo scorrimento interno litigava con i
// gesti che governano gli stati del sito — lo stesso movimento del pollice
// significava due cose diverse a seconda di dove fosse arrivato il contenuto —
// quindi il contenuto si adatta alla carta, a passi, invece di sfondarla.
export default function Destinations({ actions }) {
  const booking = useRef()
  const menu = useRef()

  const close = useCallback(() => actions.current?.reset(), [actions])

  useEffect(
    () =>
      actions.current?.subscribe((p) => {
        // Attiva solo a destinazione raggiunta: fuori posizione la carta non
        // deve intercettare i gesti diretti alla scena, né finire nel percorso
        // di tabulazione o in lettura a un lettore di schermo.
        // Booking sul lato negativo: il diorama scende e la carta del booking
        // cala dall'alto — è la scena più importante sul movimento preferito.
        // Il menu sale da sotto sul lato positivo.
        applica(booking.current, p < -0.99, `translateY(${(1 + p) * -100}%)`)
        applica(menu.current, p > 0.99, `translateY(${(1 - p) * 100}%)`)
      }),
    [actions],
  )

  return (
    <>
      <div ref={menu} className="scene-panel">
        <section className="scene-card">
          <div className="bk bk--esito">
            <p className="bk-occhiello">La cucina</p>
            <h2 className="bk-titolo">Menu</h2>
            <p className="bk-nota">Segnaposto — il test è sul booking.</p>
            <button type="button" className="bk-azione" onClick={close}>
              Torna alla scena
            </button>
          </div>
        </section>
      </div>

      <div ref={booking} className="scene-panel">
        <section className="scene-card">
          <Booking onClose={close} />
        </section>
      </div>
    </>
  )
}

function applica(el, attivo, transform) {
  if (!el) return
  el.style.transform = transform
  el.style.pointerEvents = attivo ? 'auto' : 'none'
  el.setAttribute('aria-hidden', attivo ? 'false' : 'true')
  el.inert = !attivo
}
