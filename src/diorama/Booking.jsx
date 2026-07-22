import { useMemo, useState } from 'react'
import ui from './booking-ui.json'
import { Calendario, Croce, Freccia, Orologio, Persone } from './icone.jsx'

// Il form di prenotazione. È ancora un prototipo di interfaccia: **non manda
// niente a nessuno**, lo stato vive qui e basta.
//
// **La carta è un asset, non un rettangolo CSS.** Il foglio, le tre righe e la
// barra d'azione sono sagome di carta ritagliate come quelle del diorama, e la
// loro impaginazione arriva da `booking-ui.json`: nel PSD erano già al loro
// posto, quindi qui non si ridecide niente, si legge. Ogni riquadro è espresso
// in frazioni della card, così l'impaginato regge a qualunque larghezza.
//
// **Le tre scelte si vedono tutte insieme**, e non una per volta come nella
// versione a passi. In un form a tappe si vede solo la domanda corrente e per
// ricontrollare una risposta bisogna tornare indietro; qui le righe sono
// insieme riepilogo e via d'accesso — dicono cosa hai scelto e si aprono sul
// loro passo. La regola vecchia però resta e vale ancora: **dentro la carta non
// si scorre mai**, quindi un passo per volta occupa la stessa zona, quella
// delle righe, e se un giorno non ci stesse si divide invece di far scorrere.

// Dodici giorni in griglia: entrano in tre righe senza scorrimento laterale, e
// due settimane scarse sono l'orizzonte reale di chi prenota un tavolo.
const GIORNI = 12

// Servizi separati come sul posto: a pranzo e a cena non si prenota lo stesso
// tavolo, e vedere le due fasce distinte evita una lista unica da scorrere.
const SERVIZI = [
  { nome: 'Pranzo', ore: ['12:30', '13:00', '13:30', '14:00'] },
  { nome: 'Cena', ore: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'] },
]

const MAX_PERSONE = 12

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

// Le immagini stanno in `public/`, il manifest in `src/`: qui si rimettono
// insieme, rispettando la base di Vite come per le texture della scena.
const url = (src) => `url(${import.meta.env.BASE_URL}${src})`

// Riquadro in percentuale della card. L'altezza non viene dal manifest ma dal
// rapporto dell'immagine: così il disegno non si stira mai, qualunque cosa
// succeda alla larghezza.
const riquadro = (b, px) => ({
  left: `${b.x * 100}%`,
  top: `${b.y * 100}%`,
  width: `${b.w * 100}%`,
  aspectRatio: `${px.w} / ${px.h}`,
})

// Le tre righe del PSD sono lo stesso disegno duplicato e a schermo sono un
// file solo: l'altezza la detta il suo rapporto, non i pochi pixel di
// differenza fra i tre livelli esportati.
const ALTEZZA_RIGA =
  ui.righe[0].w * (ui.file.riga.px.h / ui.file.riga.px.w) * ui.card.aspect

// La zona di lavoro: da dove comincia la prima riga a dove finisce l'ultima.
// È lo spazio che un passo aperto occupa al posto del riepilogo — le righe
// stesse definiscono i suoi margini, quindi non c'è un secondo impaginato da
// tenere allineato al primo.
const ZONA = {
  left: `${ui.righe[0].x * 100}%`,
  width: `${ui.righe[0].w * 100}%`,
  top: `${ui.righe[0].y * 100}%`,
  height: `${(ui.righe.at(-1).y + ALTEZZA_RIGA - ui.righe[0].y) * 100}%`,
}

const STILE_CARTA = {
  '--bk-ratio': ui.card.aspect,
  '--bk-foglio': url(ui.file.card.src),
  '--bk-riga': url(ui.file.riga.src),
  '--bk-barra': url(ui.file.azione.src),
  '--bk-bottoncino': url(ui.file.bottoncino.src),
}

// La piastrella dei due bottoncini d'angolo: la posizione la decide il CSS —
// non viene dalla tela della card — ma il rapporto resta quello dell'immagine,
// così non si stira.
const STILE_TASTO = {
  aspectRatio: `${ui.file.bottoncino.px.w} / ${ui.file.bottoncino.px.h}`,
}

export default function Booking({ onClose }) {
  const giorni = useMemo(() => prossimiGiorni(GIORNI), [])

  const [vista, setVista] = useState('riepilogo')
  const [data, setData] = useState(giorni[0].iso)
  const [ora, setOra] = useState(null)
  const [persone, setPersone] = useState(2)
  const [nome, setNome] = useState('')
  const [telefono, setTelefono] = useState('')

  const scelto = giorni.find((g) => g.iso === data) ?? giorni[0]
  const quando = scelto.oggi ? 'oggi' : `${scelto.giorno} ${scelto.numero}`
  const gente = `${persone} ${persone === 1 ? 'persona' : 'persone'}`

  const righe = [
    { chiave: 'giorno', Icona: Calendario, etichetta: 'Quando', valore: quando },
    { chiave: 'ora', Icona: Orologio, etichetta: 'A che ora', valore: ora },
    { chiave: 'persone', Icona: Persone, etichetta: 'In quanti', valore: gente },
  ]

  // Cosa manca per prenotare, in ordine di richiesta. Serve a due cose: sapere
  // se si può concludere, e sapere **dove mandare** chi preme il bottone senza
  // aver finito — che è meglio di un bottone spento senza spiegazione.
  const manca = !ora ? 'ora' : !nome.trim() || !telefono.trim() ? 'dati' : null

  const azione = {
    // Dal riepilogo il bottone conclude; se qualcosa manca porta lì invece di
    // spegnersi senza spiegazione — la spiegazione è il passo stesso.
    riepilogo: { testo: 'Prenota il tavolo', fai: () => setVista(manca ?? 'esito') },
    giorno: { testo: 'Fatto', fai: () => setVista('riepilogo') },
    ora: { testo: 'Fatto', fai: () => setVista('riepilogo') },
    persone: { testo: 'Fatto', fai: () => setVista('riepilogo') },
    dati: {
      testo: 'Prenota il tavolo',
      spento: Boolean(manca),
      fai: () => setVista('esito'),
    },
    esito: { testo: 'Torna alla scena', fai: onClose },
  }[vista]

  // I due bottoncini d'angolo stanno dove ci si aspetta di trovarli: chiudere a
  // destra, tornare indietro a sinistra. Erano uno solo che cambiava mestiere,
  // ma una freccia «indietro» in alto a destra è un posto che nessuno guarda.
  // Il ritorno esiste solo dentro un passo — dal riepilogo non c'è dove tornare.
  const dentroUnPasso = vista !== 'riepilogo' && vista !== 'esito'

  return (
    <div className="bk-carta" style={STILE_CARTA}>
      <div className="bk-foglio" />

      {dentroUnPasso && (
        <button
          type="button"
          className="bk-tasto bk-indietro"
          style={STILE_TASTO}
          onClick={() => setVista('riepilogo')}
          aria-label="Torna al riepilogo"
        >
          <Freccia />
        </button>
      )}

      <button
        type="button"
        className="bk-tasto bk-chiudi"
        style={STILE_TASTO}
        onClick={onClose}
        aria-label="Chiudi la prenotazione"
      >
        <Croce />
      </button>

      {vista === 'riepilogo' ? (
        righe.map((r, i) => (
          <button
            key={r.chiave}
            type="button"
            className="bk-riga"
            style={riquadro(ui.righe[i], ui.file.riga.px)}
            // Le righe sono lo stesso disegno tre volte: specchiarne una rompe
            // la ripetizione senza un secondo file.
            data-specchiata={i === 1}
            data-vuota={!r.valore}
            onClick={() => setVista(r.chiave)}
          >
            <span className="bk-riga-corpo">
              <r.Icona className="bk-riga-icona" />
              <span className="bk-riga-testi">
                <span className="bk-riga-etichetta">{r.etichetta}</span>
                <span className="bk-riga-valore">{r.valore ?? 'da scegliere'}</span>
              </span>
            </span>
          </button>
        ))
      ) : (
        <div className="bk-zona" style={ZONA} key={vista}>
          {vista === 'giorno' && (
            <>
              <h2 className="bk-titolo">Quando vieni</h2>
              <div className="bk-giorni">
                {giorni.map((g) => (
                  <button
                    key={g.iso}
                    type="button"
                    className="bk-giorno"
                    aria-pressed={data === g.iso}
                    onClick={() => {
                      setData(g.iso)
                      setVista('riepilogo')
                    }}
                  >
                    <span className="bk-giorno-nome">{g.oggi ? 'oggi' : g.giorno}</span>
                    <span className="bk-giorno-num">{g.numero}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {vista === 'ora' && (
            <>
              <h2 className="bk-titolo">A che ora</h2>
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
                          onClick={() => {
                            setOra(o)
                            setVista('riepilogo')
                          }}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {vista === 'persone' && (
            <>
              <h2 className="bk-titolo">In quanti siete</h2>
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
                  onClick={() => setPersone((n) => Math.min(MAX_PERSONE, n + 1))}
                  disabled={persone >= MAX_PERSONE}
                  aria-label="Una persona in più"
                >
                  +
                </button>
              </div>
              {persone >= 9 && (
                <p className="bk-nota">Da nove in su vi richiamiamo per sistemare i tavoli.</p>
              )}
            </>
          )}

          {vista === 'dati' && (
            <>
              <h2 className="bk-titolo">Chi sei</h2>
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
              <p className="bk-nota">
                {quando} · {ora} · {gente}
              </p>
            </>
          )}

          {vista === 'esito' && (
            <div className="bk-esito">
              <p className="bk-occhiello">Ci vediamo presto</p>
              <h2 className="bk-titolo">Tavolo prenotato</h2>
              <p className="bk-riepilogo">
                {quando} alle {ora}, per {gente}, a nome {nome.trim()}.
              </p>
              <p className="bk-nota">Prototipo: nessun dato è stato inviato.</p>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className="bk-azione"
        style={riquadro(ui.azione, ui.file.azione.px)}
        disabled={azione.spento}
        onClick={azione.fai}
      >
        {/* Il filo disegnato nella barra sta al 47% e il rametto sotto: il
            testo vive nella metà alta, non al centro del bottone. */}
        <span className="bk-azione-testo">{azione.testo}</span>
      </button>
    </div>
  )
}
