// Prepara gli asset della schermata di caricamento e il muro di carta.
//
// Gli sprite restano a **tela piena 1080x1920**, al contrario di quelli del
// diorama che vengono ritagliati al bounding box. Qui il ritaglio non
// converrebbe: sono cinque immagini, l'alfa vuota costa pochissimo in WebP, e
// a tela piena si sovrappongono in CSS con una regola sola (`inset: 0`) invece
// che con cinque posizioni da tenere in sincrono con un manifest.
//
// Il muro invece è condiviso: stesso file per il fondo del loader (in CSS) e
// per il fondale della scena R3F, così la dissolvenza fra i due non ha niente
// da accordare. Vedi Backdrop.jsx.

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SRC = '/Users/lucio/Desktop/agrumi/scena 3d/loading-screen/asset'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Il muro è il primo file che arriva e il più pesante: la grana è rumore ad
// alta frequenza e vale quasi tutto il peso. 810 è il compromesso scelto —
// ingrandita la fibra regge, e 640 (~86 kB) resta l'alternativa se pesa.
const MURO_W = 810

// Gli sprite si vedono al più a scala 1:1 su un telefono ad alta densità.
const SPRITE_W = 1080

// Gatto e ramo sono due file distinti perché il gatto respira e il ramo no: a
// immagine unica il respiro avrebbe mosso anche foglie e limoni. Restano a tela
// piena come gli altri, quindi si rimettono in registro da soli.
const SPRITE = [
  ['logo', 'loading-screen-demo_0000_logo.png'],
  ['ramo', 'loading-screen-demo_0004_ramo.png'],
  ['gatto', 'loading-screen-demo_0004_soggetto+ombre.png'],
  ['bolla-1', 'loading-screen-demo_0003_bolla-1.png'],
  ['bolla-2', 'loading-screen-demo_0002_bolla-2.png'],
  ['bolla-3', 'loading-screen-demo_0001_bolla-3.png'],
]

// La barra è l'eccezione alla tela piena, per due motivi diversi.
//
// Il binario crema è statico e ha l'ombra cotta dentro, quindi *potrebbe* stare
// con gli altri — ma l'export del PSD lo mette più grande e più in basso della
// composizione di riferimento (`loading-screen-demo.jpg`), e a tela piena la
// sua posizione non è negoziabile. Ritagliato al bounding box invece diventa un
// riquadro che il CSS piazza dove vuole: è così che si ottiene la barra più
// piccola e più vicina al gatto del riferimento.
const BINARIO = 'loading-screen-demo_0002_loading-bar-layer-0.png'

// Il riempimento giallo è l'unico pezzo che cambia forma, quindi non può essere
// uno sprite: va ritagliato e usato come `background-image` di un elemento che
// allarga.
const RIEMPIMENTO = 'loading-screen-demo_0001_loading-bar-texture-layer-1.png'

// Dove va la barra, misurato sul riferimento (banda chiara nella metà bassa
// della demo, che è esattamente la carta crema del binario). Sono frazioni
// della tela 1080x1920. Il resto della geometria si deriva da qui: spostare la
// barra vuol dire toccare questi tre numeri e rilanciare lo script.
const RIF = { left: 234 / 1080, top: 1405 / 1920, w: 613 / 1080 }

// Binario e riempimento si vedono a schermo molto più piccoli della tela, ma su
// un telefono ad alta densità un CSS pixel ne vale 2-3: si esportano al doppio
// della misura di destinazione.
const DENSITA = 2

const kB = (n) => `${(n / 1024).toFixed(1)} kB`

// Quanto il riempimento giallo è incassato dentro il binario, in frazione
// dell'altezza del binario. Non è una stima: viene dal riferimento
// `loading-screen/text.jpg`, dove il giallo misura il 75% dell'altezza del
// crema — cioè 12.5% di margine per lato. La carta crema resta visibile
// tutt'attorno, il giallo non copre il binario.
const INCASSO = 0.125

// Rettangolo dei pixel non trasparenti. Serve a ritagliare il riempimento e,
// soprattutto, a ricavarne le percentuali per il CSS: quei numeri posizionano
// la barra sulla tela e trascriverli a mano è il modo sicuro di sbagliarli.
//
// `soglia` distingue la carta dall'ombra: il binario ha l'ombra cotta dentro,
// che in alfa arriva al massimo a ~68/255. Cercando i pixel **pieni** si
// ottiene il rettangolo della sola carta.
async function bbox(sharp, file, soglia = 8) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > soglia) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, tela: { w: info.width, h: info.height } }
}

async function main() {
  await mkdir(join(ROOT, 'public/loader'), { recursive: true })
  await mkdir(join(ROOT, 'public/layers'), { recursive: true })

  const muro = join(ROOT, 'public/layers/muro-carta.webp')
  const info = await sharp(join(SRC, 'loading-screen-demo_0006_background-flat.png'))
    .resize({ width: MURO_W })
    .webp({ quality: 76 })
    .toFile(muro)
  console.log(`muro-carta.webp  ${info.width}x${info.height}  ${kB(info.size)}`)

  let tot = info.size
  for (const [nome, file] of SPRITE) {
    const out = join(ROOT, `public/loader/${nome}.webp`)
    const i = await sharp(join(SRC, file))
      .resize({ width: SPRITE_W })
      .webp({ quality: 82, alphaQuality: 100 })
      .toFile(out)
    console.log(`${`${nome}.webp`.padEnd(16)} ${i.width}x${i.height}  ${kB(i.size)}`)
    tot += i.size
  }

  // Il binario si misura due volte sullo stesso file: con la soglia alta esce
  // la sola carta crema (l'ombra cotta arriva a ~68/255 e non conta), con
  // quella bassa esce carta **più** ombra, che è quello che va ritagliato — se
  // si tagliasse sulla carta l'ombra resterebbe fuori dallo sprite.
  const carta = await bbox(sharp, join(SRC, BINARIO), 250)
  const pieno = await bbox(sharp, join(SRC, BINARIO), 8)

  // Il riferimento dice quanto dev'essere larga la carta; tutto il resto segue
  // in proporzione, ombra compresa.
  const scala = (RIF.w * carta.tela.w) / carta.w

  const binario = join(ROOT, 'public/loader/barra-binario.webp')
  const ib = await sharp(join(SRC, BINARIO))
    .extract({ left: pieno.x, top: pieno.y, width: pieno.w, height: pieno.h })
    .resize({ width: Math.round(pieno.w * scala * DENSITA) })
    .webp({ quality: 82, alphaQuality: 100 })
    .toFile(binario)
  console.log(`${'barra-binario.webp'.padEnd(16)} ${ib.width}x${ib.height}  ${kB(ib.size)}`)
  tot += ib.size

  // Il giallo è incassato dentro la carta di INCASSO per lato.
  const m = Math.round(carta.h * INCASSO)
  const giallo = { x: carta.x + m, y: carta.y + m, w: carta.w - m * 2, h: carta.h - m * 2 }

  // La texture è "abbondante" e ha le punte tonde nella sua alfa, ma la forma
  // ora la dà il `border-radius` in CSS: qui serve solo la grana. Si prende
  // quindi la parte centrale, lontano dalle punte, e si porta alla misura del
  // giallo — così `background-size: auto 100%` copre la barra piena esatta.
  const t = await bbox(sharp, join(SRC, RIEMPIMENTO))
  const out = join(ROOT, 'public/loader/barra-riempimento.webp')
  const i = await sharp(join(SRC, RIEMPIMENTO))
    .extract({ left: t.x + t.h, top: t.y, width: t.w - t.h * 2, height: t.h })
    .resize({
      width: Math.round(giallo.w * scala * DENSITA),
      height: Math.round(giallo.h * scala * DENSITA),
      fit: 'fill',
    })
    .webp({ quality: 82, alphaQuality: 100 })
    .toFile(out)
  console.log(`${'barra-riempimento.webp'.padEnd(16)} ${i.width}x${i.height}  ${kB(i.size)}`)
  tot += i.size

  // Le percentuali per il CSS. Il riquadro `.loader-barra` è lo **sprite
  // intero** (carta + ombra) sulla tela; il riempimento si esprime invece in
  // percentuale di quel riquadro, perché è lì dentro che sta.
  const pc = (n) => `${(n * 100).toFixed(4)}%`
  const sx = (px) => (RIF.left * carta.tela.w + (px - carta.x) * scala) / carta.tela.w
  const sy = (px) => (RIF.top * carta.tela.h + (px - carta.y) * scala) / carta.tela.h

  const riq = { left: sx(pieno.x), top: sy(pieno.y), w: (pieno.w * scala) / carta.tela.w, h: (pieno.h * scala) / carta.tela.h }

  console.log(`\ncarta del binario: ${carta.w}x${carta.h} a ${carta.x},${carta.y}`)
  console.log(`sprite con ombra:  ${pieno.w}x${pieno.h} a ${pieno.x},${pieno.y}`)
  console.log(`scala verso il riferimento: ${scala.toFixed(4)}x  (carta ${Math.round(carta.w * scala)}px sulla tela)`)
  console.log(`incasso del giallo: ${m}px per lato (${(INCASSO * 100).toFixed(1)}% dell'altezza)`)

  console.log('\n.loader-barra — riquadro dello sprite, in % della tela:')
  console.log(`  left:   ${pc(riq.left)}`)
  console.log(`  top:    ${pc(riq.top)}`)
  console.log(`  width:  ${pc(riq.w)}`)
  console.log(`  height: ${pc(riq.h)}`)

  console.log('\n.loader-barra-riempimento — in % del riquadro qui sopra:')
  console.log(`  left:      ${pc((giallo.x - pieno.x) / pieno.w)}`)
  console.log(`  top:       ${pc((giallo.y - pieno.y) / pieno.h)}`)
  console.log(`  height:    ${pc(giallo.h / pieno.h)}`)
  console.log(`  max-width: ${pc(giallo.w / pieno.w)}   (= barra piena)`)
  console.log(`  min-width: ${pc(giallo.h / pieno.w)}   (= un pallino)`)

  console.log(`\ntotale schermata di caricamento: ${kB(tot)}`)
}

main()
