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

export default defineConfig({
  plugins: [react(), ...(https ? [basicSsl()] : [])],
  server: { host: true, port: 5173 },
})
