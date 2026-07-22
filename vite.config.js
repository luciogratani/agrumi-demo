import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS solo su richiesta: `HTTPS=1 pnpm dev`.
//
// Serve unicamente per provare il giroscopio da telefono (DeviceOrientationEvent
// è esposto solo in contesto sicuro), ma il certificato è autofirmato e il
// browser marca il sito come non sicuro — fastidioso per il lavoro di tutti i
// giorni, quindi di default si resta su http.
const https = process.env.HTTPS === '1'

// Regia condivisa fra i dispositivi aperti sullo stesso server.
//
// Il pannello di regia sta sul computer — sul telefono non ci starebbe, e
// soprattutto **mentre tocchi uno slider non stai guardando la scena**: il
// pollice copre la cosa da giudicare. Quindi si tara sul computer e si guarda
// sul telefono, dal vivo, mentre si muove il valore.
//
// Il canale non è nuovo: è lo stesso WebSocket che Vite tiene aperto con ogni
// browser per il refresh automatico. Qui il server fa solo da centralino —
// riceve i valori da chi li muove e li ributta a tutti. Chi li ha mandati li
// riconosce dal proprio identificativo e li ignora.
//
// `apply: 'serve'`: è strumentazione di sviluppo e non esiste nella build.
function regiaCondivisa() {
  return {
    name: 'agrumi-regia-condivisa',
    apply: 'serve',
    configureServer(server) {
      server.ws.on('regia:cambia', (msg) => server.ws.send('regia:applica', msg))
    },
  }
}

export default defineConfig({
  plugins: [react(), regiaCondivisa(), ...(https ? [basicSsl()] : [])],
  server: { host: true, port: 5173 },
})
