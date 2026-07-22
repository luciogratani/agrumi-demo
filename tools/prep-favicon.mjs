// Le varianti della favicon, da un master unico.
//
// `node tools/prep-favicon.mjs`. Sorgente: un PNG-24 a 512 con alpha, fuori dal
// repo come tutti i sorgenti di lavoro.
//
// Perché un tool e non tre file esportati a mano: le misure di una favicon non
// sono un gusto, sono un elenco che i browser pretendono, e rifarle a occhio
// quando il disegno cambia è il modo di ritrovarsi il gatto vecchio in una
// scheda e quello nuovo in un'altra.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = '/Users/lucio/Desktop/agrumi/favico/export/favico.png'
const OUT = path.resolve(process.cwd(), 'public')

// Il cielo della scena, lo stesso di `theme-color` e del fondo del loader.
const FONDO = '#78b2ac'

// iOS **ignora la trasparenza** nell'icona di home e compone su nero: senza un
// fondo, gli angoli attorno al disco diventerebbero neri. Quindi questa sola
// variante si appiattisce, e sul colore del sito invece che su bianco — che è
// anche il contrasto che stacca il disco limone dalla cornice.
const APPIATTITE = new Set(['apple-touch-icon', 'icon-192', 'icon-512'])

const VARIANTI = [
  { nome: 'favicon-16.png', size: 16 },
  { nome: 'favicon-32.png', size: 32 },
  { nome: 'apple-touch-icon.png', size: 180 },
  { nome: 'icon-192.png', size: 192 },
  { nome: 'icon-512.png', size: 512 },
]

// Misure dentro il .ico. Restano tre e non una perché il file viene chiesto da
// solo, senza che nessun `<link>` lo dichiari, e chi lo chiede sceglie da sé.
const ICO = [16, 32, 48]

// Sopra i 64 px si quantizza: il disegno è nero, limone e cielo, ma la grana
// della carta è rumore e il PNG lo comprime malissimo — 512 px pesavano 443 kB.
// Con 128 colori scendono a 53 e non compare una banda (controllato a occhio).
// Le misure piccole restano intatte: pesano già meno di 3 kB, non c'è niente da
// guadagnare e sono quelle dove ogni pixel conta.
const rendi = (size, appiattita) => {
  const img = sharp(SRC).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  const piatta = appiattita ? img.flatten({ background: FONDO }) : img
  return piatta.png(size > 64 ? { compressionLevel: 9, palette: true, colours: 128 } : { compressionLevel: 9 })
}

await mkdir(OUT, { recursive: true })

for (const { nome, size } of VARIANTI) {
  const piatta = APPIATTITE.has(path.basename(nome, '.png'))
  const info = await rendi(size, piatta).toFile(path.join(OUT, nome))
  console.log(`  ${nome.padEnd(22)} ${size}x${size}  ${(info.size / 1024).toFixed(1)} kB${piatta ? '  (su fondo)' : ''}`)
}

// --- Il .ico ---------------------------------------------------------------
//
// Scritto a mano invece di aggiungere una dipendenza: il formato è una
// direttoria di sei byte più un descrittore di sedici per immagine, e le
// immagini dentro possono essere PNG così come sono. Lo capiscono tutti i
// browser da IE11 in poi, e sotto quella soglia non c'è nessuno da servire.
const png = await Promise.all(ICO.map((s) => rendi(s, false).toBuffer()))

const testa = Buffer.alloc(6)
testa.writeUInt16LE(0, 0) // riservato
testa.writeUInt16LE(1, 2) // 1 = icona
testa.writeUInt16LE(ICO.length, 4)

let offset = 6 + ICO.length * 16
const voci = ICO.map((size, i) => {
  const v = Buffer.alloc(16)
  v.writeUInt8(size === 256 ? 0 : size, 0) // 0 significa 256
  v.writeUInt8(size === 256 ? 0 : size, 1)
  v.writeUInt8(0, 2) // palette: nessuna
  v.writeUInt8(0, 3) // riservato
  v.writeUInt16LE(1, 4) // piani
  v.writeUInt16LE(32, 6) // bit per pixel
  v.writeUInt32LE(png[i].length, 8)
  v.writeUInt32LE(offset, 12)
  offset += png[i].length
  return v
})

const ico = Buffer.concat([testa, ...voci, ...png])
await writeFile(path.join(OUT, 'favicon.ico'), ico)
console.log(`  ${'favicon.ico'.padEnd(22)} ${ICO.join('+')}  ${(ico.length / 1024).toFixed(1)} kB`)

// --- Manifest --------------------------------------------------------------
//
// Minimo di proposito: nome, icone e colori. **Niente `display: standalone`** —
// aprirebbe il sito senza barra del browser a chi lo aggiunge alla home, e
// quella è una decisione di prodotto, non una conseguenza di aver messo
// un'icona.
await writeFile(
  path.join(OUT, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'Agrumì',
      short_name: 'Agrumì',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: FONDO,
      background_color: FONDO,
    },
    null,
    2,
  ) + '\n',
)
console.log(`  ${'site.webmanifest'.padEnd(22)} 192+512`)
