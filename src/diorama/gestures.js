import { useEffect } from 'react'

// Wheel e swipe verticale sulla scena, mappati sui passi della transizione.
//
// **La direzione segue la convenzione nativa**, non la parola «su»: il dito
// che sale porta il contenuto in alto e scopre ciò che sta sotto — quindi
// swipe verso l'alto (e rotellina verso il basso) fanno salire il diorama e
// arrivare al menu; swipe verso il basso fa scendere il diorama e calare il
// booking dall'alto. È l'opposto di quello che verrebbe da dire a parole, ed è
// il motivo per cui c'è comunque un interruttore per invertirlo: è una cosa da
// giudicare col pollice, non a tavolino.
//
// Il gesto è discreto, non continuo: supera la soglia e parte una transizione
// intera. Trascinare il diorama a metà strada sarebbe più ricco, ma va deciso
// dopo aver visto se il movimento in sé funziona.
export function useSceneGestures(ref, { enabled, invert, threshold, introPlaying }, actions) {
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return

    // Il blocco esiste per l'inerzia: su trackpad e su iOS gli eventi
    // continuano ad arrivare per quasi un secondo dopo che il dito si è
    // staccato, e senza questo un gesto solo farebbe scattare due passi.
    let locked = false
    let accum = 0
    let rest = null

    // Niente convivenza da negoziare con lo scorrimento: dentro le destinazioni
    // non si scorre (il contenuto sta a passi), quindi il gesto verticale
    // significa sempre e solo navigazione fra gli stati del sito.
    const fire = (dir) => {
      const t = actions.current
      // Durante l'intro i gesti restano fermi: l'entrata non è interrompibile, e
      // sommarle una transizione darebbe due movimenti sovrapposti. Come `busy`,
      // il ref si legge al volo — quando l'intro finisce il gesto dopo passa.
      if (!t || locked || t.busy.current || introPlaying?.current) return
      locked = true
      accum = 0
      t.go(invert ? -dir : dir)
    }

    // Si riarma quando gli eventi si fermano: è la fine del gesto, non la fine
    // dell'animazione (che ha già la sua guardia in `busy`).
    const scheduleRearm = () => {
      clearTimeout(rest)
      rest = setTimeout(() => {
        locked = false
        accum = 0
      }, 240)
    }

    const onWheel = (e) => {
      // L'accumulo serve a trattare allo stesso modo il trackpad, che manda
      // tanti delta minuscoli, e la rotellina, che ne manda pochi da 100.
      if (!locked) {
        accum += e.deltaY
        if (Math.abs(accum) > threshold) fire(Math.sign(accum))
      }
      scheduleRearm()
    }

    let startY = null
    const onTouchStart = (e) => {
      startY = e.touches[0].clientY
      accum = 0
    }
    const onTouchMove = (e) => {
      if (startY == null || locked) return
      // Positivo quando il dito sale.
      accum = startY - e.touches[0].clientY
      if (Math.abs(accum) > threshold) fire(Math.sign(accum))
    }
    const onTouchEnd = () => {
      startY = null
      scheduleRearm()
    }

    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      clearTimeout(rest)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [ref, enabled, invert, threshold, introPlaying, actions])
}
