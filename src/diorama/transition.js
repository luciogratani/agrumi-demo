import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'

// La transizione fra le scene del sito, come singolo valore condiviso.
//
//   -1  booking        0  hero        +1  menu
//
// Il segno è la direzione in cui scorre *la scena*, non l'utente: a -1 il
// diorama è sceso e dall'alto è calato il booking, a +1 è salito e sotto è
// rimasto il menu. Il booking sta sul movimento a scendere di proposito: è la
// destinazione più importante, e quel movimento è il più curato in composizione.
//
// **GSAP anima questo oggetto JS, non gli oggetti three.** Ogni Sprite
// riscrive posizione e rotazione a ogni fotogramma dentro `useFrame`, e
// `ShadowPass` possiede il ciclo di rendering: una tween che scrivesse
// direttamente su `group.position` verrebbe sovrascritta a fotogrammi alterni.
// Qui GSAP muove un numero, `useFrame` lo legge. È lo stesso schema del ref di
// `useParallaxInput`, così di modelli mentali ne resta uno solo.
//
// Lo stato è volutamente discreto e guidato dal gesto, non dalla posizione di
// scroll: il booking è un form, e su mobile la tastiera che si apre ridimensiona
// il viewport mandando fuori sincrono qualunque timeline agganciata allo scroll.
export function useSceneTransition({ duration, ease }) {
  const value = useRef({ p: 0 })
  const state = useRef(0)
  // Transizione in corso: i gesti la interrogano per non accavallarsi.
  const busy = useRef(false)

  // I parametri del pannello cambiano a ogni tweak: la tween li legge quando
  // parte, invece di ricostruire l'API a ogni render.
  const cfg = useRef({ duration, ease })
  cfg.current = { duration, ease }

  const api = useMemo(() => {
    // Le scene di destinazione sono DOM, non three: non hanno un `useFrame` da
    // cui leggere. Si iscrivono qui e ricevono `p` a ogni fotogramma della
    // tween. Scrivere sul DOM da GSAP non ha le controindicazioni che ha
    // scrivere sugli oggetti three — lì nessuno sovrascrive.
    const listeners = new Set()
    const notify = () => {
      for (const fn of listeners) fn(value.current.p)
    }

    // Chi ha chiesto meno movimento non deve vedere mezzo diorama attraversargli
    // lo schermo: il passaggio avviene comunque, ma è uno stacco e non un viaggio.
    const ridotto = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const tweenTo = (next) => {
      if (next === state.current) return
      state.current = next
      busy.current = true
      gsap.to(value.current, {
        p: next,
        duration: ridotto() ? 0.01 : cfg.current.duration,
        ease: cfg.current.ease,
        // Un secondo comando durante la transizione riparte da dov'è, senza
        // accodarsi: due tween sulla stessa proprietà si combatterebbero.
        overwrite: true,
        onUpdate: notify,
        onComplete: () => {
          busy.current = false
          notify()
        },
      })
    }

    return {
      // Un passo per volta: da una destinazione si torna alla hero, non si
      // salta direttamente all'altra.
      go: (dir) => tweenTo(Math.max(-1, Math.min(1, state.current + dir))),
      reset: () => tweenTo(0),
      state,
      busy,
      // Restituisce la funzione per disiscriversi, e chiama subito con il
      // valore corrente così chi si iscrive parte già nella posizione giusta.
      subscribe: (fn) => {
        listeners.add(fn)
        fn(value.current.p)
        return () => listeners.delete(fn)
      },
    }
  }, [])

  useEffect(() => {
    const target = value.current
    return () => gsap.killTweensOf(target)
  }, [])

  return { value, api }
}
