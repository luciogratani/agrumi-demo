import { useMemo, useState } from 'react'

// Il form di prenotazione. È un prototipo di interfaccia: **non manda niente a
// nessuno**, lo stato vive qui e basta.
//
// **A passi, e senza scorrimento interno.** Un form lungo dentro la carta
// costringeva a scorrere, e lo scorrimento qui dentro litiga con i gesti che
// governano gli stati del sito: lo stesso movimento del pollice voleva dire due
// cose diverse a seconda di dove fosse arrivato il contenuto. A passi la
// domanda è una alla volta, ogni schermata sta nella carta senza scorrere, e il
// gesto verticale torna a significare una cosa sola.
//
// Il vincolo di stare in una schermata non è un ripiego: su un telefono, in
// piedi fuori da un locale, una domanda per volta è comunque il modo giusto.

// Dodici giorni in griglia: entrano in tre righe senza scorrimento laterale, e
// due settimane scarse sono l'orizzonte reale di chi prenota un tavolo.
const GIORNI = 12

// Servizi separati come sul posto: a pranzo e a cena non si prenota lo stesso
// tavolo, e vedere le due fasce distinte evita una lista unica da scorrere.
const SERVIZI = [
  { nome: 'Pranzo', ore: ['12:30', '13:00', '13:30', '14:00'] },
  { nome: 'Cena', ore: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'] },
]

function prossimiGiorni(n) {
  const oggi = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(oggi)
    d.setDate(oggi.getDate() + i)
    return {
      iso: d.toISOString().slice(0, 10),
      giorno: new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(d).replace('.', ''),
      numero: d.getDate(),
      oggi: i === 0,
    }
  })
}

export default function Booking({ onClose }) {
  const giorni = useMemo(() => prossimiGiorni(GIORNI), [])

  const [passo, setPasso] = useState(0)
  const [data, setData] = useState(giorni[0].iso)
  const [ora, setOra] = useState(null)
  const [persone, setPersone] = useState(2)
  const [nome, setNome] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fatto, setFatto] = useState(false)

  const scelto = giorni.find((g) => g.iso === data)
  const quando = `${scelto.oggi ? 'oggi' : `${scelto.giorno} ${scelto.numero}`}`
  const riepilogo = `${quando} · ${ora ?? '—'} · ${persone} ${persone === 1 ? 'persona' : 'persone'}`

  if (fatto) {
    return (
      <div className="bk bk--esito">
        <p className="bk-occhiello">Ci vediamo presto</p>
        <h2 className="bk-titolo">Tavolo prenotato</h2>
        <p className="bk-riepilogo">
          {quando} alle {ora}, per {persone} {persone === 1 ? 'persona' : 'persone'}, a nome{' '}
          {nome.trim()}.
        </p>
        <p className="bk-nota">Prototipo: nessun dato è stato inviato.</p>
        <button type="button" className="bk-azione" onClick={onClose}>
          Torna alla scena
        </button>
      </div>
    )
  }

  // Ogni passo dichiara cosa mostra, quando è completo e cosa dire se non lo è.
  // Tenerli in una lista sola evita che titolo, validità ed etichetta del
  // bottone finiscano a divergere.
  const passi = [
    {
      titolo: 'Quando vieni',
      manca: null,
      corpo: (
        <div className="bk-giorni">
          {giorni.map((g) => (
            <button
              key={g.iso}
              type="button"
              className="bk-giorno"
              aria-pressed={data === g.iso}
              onClick={() => setData(g.iso)}
            >
              <span className="bk-giorno-nome">{g.oggi ? 'oggi' : g.giorno}</span>
              <span className="bk-giorno-num">{g.numero}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      titolo: 'A che ora',
      manca: ora ? null : 'Scegli un orario',
      corpo: (
        <div className="bk-servizi">
          {SERVIZI.map((s) => (
            <div key={s.nome} className="bk-servizio">
              <span className="bk-servizio-nome">{s.nome}</span>
              <div className="bk-ore">
                {s.ore.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className="bk-ora"
                    aria-pressed={ora === o}
                    onClick={() => setOra(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      titolo: 'In quanti siete',
      manca: null,
      corpo: (
        <>
          <div className="bk-persone">
            <button
              type="button"
              className="bk-passo-n"
              onClick={() => setPersone((n) => Math.max(1, n - 1))}
              disabled={persone <= 1}
              aria-label="Una persona in meno"
            >
              −
            </button>
            <span className="bk-conta" aria-live="polite">
              {persone} <small>{persone === 1 ? 'persona' : 'persone'}</small>
            </span>
            <button
              type="button"
              className="bk-passo-n"
              onClick={() => setPersone((n) => Math.min(12, n + 1))}
              disabled={persone >= 12}
              aria-label="Una persona in più"
            >
              +
            </button>
          </div>
          {persone >= 9 && (
            <p className="bk-nota">Da nove in su vi richiamiamo per sistemare i tavoli.</p>
          )}
        </>
      ),
    },
    {
      titolo: 'Chi sei',
      manca: !nome.trim() ? 'Serve un nome' : !telefono.trim() ? 'Serve un telefono' : null,
      corpo: (
        <>
          <p className="bk-recap">{riepilogo}</p>
          <label className="bk-campo">
            <span>Nome</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              placeholder="Come ti chiami"
            />
          </label>
          <label className="bk-campo">
            <span>Telefono</span>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
              placeholder="Per confermarti il tavolo"
            />
          </label>
        </>
      ),
    },
  ]

  const ultimo = passo === passi.length - 1
  const corrente = passi[passo]
  const indietro = () => (passo === 0 ? onClose() : setPasso((p) => p - 1))
  const avanti = () => (ultimo ? setFatto(true) : setPasso((p) => p + 1))

  return (
    <div className="bk">
      <header className="bk-testa">
        <button
          type="button"
          className="bk-icona"
          onClick={indietro}
          aria-label={passo === 0 ? 'Torna alla scena' : 'Torna al passo precedente'}
        >
          ←
        </button>
        <ol className="bk-avanzamento">
          {passi.map((p, i) => (
            <li key={p.titolo} data-corrente={i === passo} data-fatto={i < passo}>
              <span className="bk-nascosto">{p.titolo}</span>
            </li>
          ))}
        </ol>
        <button type="button" className="bk-icona" onClick={onClose} aria-label="Chiudi">
          ×
        </button>
      </header>

      <div className="bk-corpo">
        <p className="bk-occhiello">
          Passo {passo + 1} di {passi.length}
        </p>
        <h2 className="bk-titolo">{corrente.titolo}</h2>
        {corrente.corpo}
      </div>

      <footer className="bk-piede">
        <button type="button" className="bk-azione" disabled={Boolean(corrente.manca)} onClick={avanti}>
          {ultimo ? 'Prenota il tavolo' : 'Avanti'}
        </button>
        <p className="bk-nota bk-nota--chiusura">
          {corrente.manca ?? (ultimo ? 'Ti confermiamo per messaggio entro un’ora.' : riepilogo)}
        </p>
      </footer>
    </div>
  )
}
