# Agrumì — Hero Diorama 2.5D (React Three Fiber)

## Cosa stiamo costruendo

La schermata **hero** di una webapp di prenotazione per **Agrumì**, un locale con
forte identità visiva. La hero è un **diorama papercraft 2.5D**: piani di carta
ritagliata sovrapposti in profondità (paper-cutout / pop-up book), con un **gatto
nero** come mascotte che reagisce all'utente, micro-movimenti di vento sugli elementi
e una CTA a forma di limone.

**Non** è una scena 3D esplorabile: è un diorama a piani piatti visto con **camera
ortografica**. La profondità nasce dallo sfasamento dei piani sull'asse Z + parallasse.

Il **booking vero e proprio è separato** (HTML/React standard): la scena hero è
principalmente decorativa e deve accompagnare l'utente verso la prenotazione, non
ostacolarla.

## Priorità assolute (in quest'ordine)

1. **Mobile-first** — il target primario è lo smartphone, composizione verticale 9:16.
2. **Performance / caricamento rapido** — poche draw call, geometrie leggere, materiali
   unlit, texture ottimizzate.
3. **UX semplice**.
4. **Forte personalità visiva** (papercraft artigianale, palette calda mediterranea).

## Gli asset (nella cartella allegata)

Gli asset sono **PNG con canale alpha già pulito** (sfondo rimosso). Sono stati
esportati tutti dallo **stesso artboard/canvas alle stesse dimensioni e allineamento**,
quindi **si sovrappongono perfetti senza riallineamento manuale**: vanno solo caricati
su piani della stessa dimensione, centrati.

La scena è composta da **5 piani di profondità + il gatto separato**. Dal fondo al
davanti (Z crescente verso la camera):

| # | Layer | Contenuto |
|---|-------|-----------|
| 1 | `backdrop` | Cielo turchese + nuvole + uccelli (riempie tutto il frame) |
| 2 | `tree_back` | Tronco, rami, foglie e limoni **dietro** il gatto |
| — | `cat` | **Gatto nero** (asset separato, si incastra tra tree_back e tree_front) |
| 3 | `tree_front` | Foglie e limoni che passano **davanti** a tronco/gatto |
| 4 | `shop` | Insegna (vuota), tendina, facciata con vetrine illuminate, dehors |
| 5 | `foreground` | Terreno, foglie cadute, fiori |

Note importanti sugli asset:
- **I testi NON sono negli asset.** "agrumì", "SAPORI SOLARI" e la scritta della CTA
  vengono aggiunti separatamente (font vettoriale). Se servono come overlay nella hero,
  vanno come testo HTML/SVG sopra la scena, **non** dentro le texture.
- **La CTA "limone PRENOTA" è UI, non fa parte della scena 3D.** Va realizzata come
  elemento **HTML/SVG** sopra il canvas, coerente con lo stile ma esterna al diorama.
- Le ombre di contatto sono **già cotte dentro i render** (tranne che sul backdrop, dove
  la parallasse è più visibile e l'ombra conta meno). Quindi **niente luci dinamiche**
  in scena: materiali unlit.

## Architettura tecnica target

- **Stack:** React Three Fiber + `@react-three/drei`. La hero può vivere come componente
  standalone montabile nell'app React del booking.
- **Camera:** **ortografica** (`OrthographicCamera` da drei). Niente prospettiva.
- **Ogni layer = un `PlaneGeometry`** con `meshBasicMaterial` (**unlit**, `transparent:
  true`, `toneMapped: false`, `depthWrite: false` per la trasparenza corretta). È carta
  opaca matte: nessuno specular, nessuna luce.
- **Impilamento in Z:** i 5 piani + gatto distanziati sull'asse Z. Le distanze si tarano
  a occhio in tempo reale (vedi milestone 2).
- **Texture:** in fase di prototipo va bene PNG diretto (`useTexture`). Per la build di
  produzione, comprimere in **KTX2/Basis** con `gltf-transform` o `toktx` (più leggere
  in memoria GPU, non solo in download) — è l'ottimizzazione mobile che pesa di più.
  Impostare `colorSpace = THREE.SRGBColorSpace` sulle texture di colore.

## Ordine di sviluppo (milestone)

**Milestone 1 — scaffold + piani impilati (statico).**
Progetto R3F che carica i 5 PNG su 5 piani ortografici impilati in Z, centrati, con la
scena inquadrata verticale 9:16. Obiettivo: vedere il diorama ricomposto, fermo, corretto.
Il gatto per ora può essere un sesto piano statico tra tree_back e tree_front.

**Milestone 2 — parallasse.**
I piani traslano/inclinano leggermente in base all'input:
- **mobile:** giroscopio (`DeviceOrientationEvent`, con fallback e richiesta permesso su
  iOS) — o in mancanza, parallasse su drag/scroll.
- **desktop:** posizione del mouse.
L'entità dello spostamento è **proporzionale alla profondità** del piano (i piani vicini
si muovono di più). Applicare un `lerp`/smoothing così il movimento è morbido, mai scattoso.

**Milestone 3 — vento procedurale.**
Micro-movimenti "vento invisibile" su rami/foglie/limoni. Con gli asset a piani
assemblati, ogni piano ondeggia **come foglio intero** (oscillazione/scala leggerissima).
Implementazione in `useFrame`, **procedurale, non clip bakate**:
- somma di 2-3 seni a frequenze diverse (rapporti irrazionali, così non si ripete mai);
- **fase casuale per piano** (assegnata una volta), così non oscillano all'unisono;
- una **folata globale lenta** che modula l'ampiezza ("il vento respira").
- Ampiezze **minuscole** (rotazioni di ~1-2°, in radianti ~0.02-0.04). Mai invasivo.

```jsx
useFrame(({ clock }) => {
  const t = clock.elapsedTime
  const gust = 0.6 + 0.4 * Math.sin(t * 0.15)          // vento che respira
  treeFront.rotation.z = gust * (
    0.03  * Math.sin(t * 0.8 + phaseA) +
    0.012 * Math.sin(t * 1.9 + phaseA * 2)
  )
  // ...stesso schema con fasi diverse su tree_back, foreground, ecc.
})
```

**Milestone 4 — gatto reattivo.**
Il gatto è il personaggio principale: deve reagire al dito/puntatore.
- **Idle procedurale:** respiro (scala leggerissima), coda che ciondola piano.
- **Interazione:** testa/occhi/coda che **tracciano il puntatore** (lerp verso il target,
  rotazioni **clampate** entro pochi gradi), sguardo che va verso la CTA. Deve restare
  discreto e **mai cartoonesco**.
- Il tracking va calcolato **a runtime** (dipende da dov'è il dito ora): non è bakabile.

> Nota rig gatto: per il proto il gatto può essere **un piano unico**. Per le
> micro-animazioni fini (blink, movimento testa senza scoprire buchi) andrà **splittato
> in pezzi separati** (orecchie, occhi, pupille, testa+collo, corpo, coda) come sotto-piani
> parentati, con il collo che continua sotto il corpo e la coda staccata dalla base.
> Gestirlo come **gerarchia di layer parentati**, non come scheletro/ossa.

## Fuori scope / da NON fare

- **Niente luci dinamiche, niente ombre runtime, niente materiali PBR.** Tutto unlit,
  matte. Le ombre sono nelle texture.
- **Niente clip di animazione bakate** per vento/gatto: tutto procedurale in `useFrame`.
  (Le interazioni non sono bakabili per definizione.)
- **Niente CTA come mesh 3D:** è HTML/SVG sopra il canvas.
- **Niente testo dentro le texture:** overlay HTML/SVG.
- **Non montare la scena in Blender:** per un diorama a piani piatti Blender non serve;
  si itera molto più in fretta in codice. (Blender rientrerebbe solo se in futuro si
  passasse agli asset object-oriented per il vento ramo-per-ramo.)

## Criteri di "fatto bene"

- Carica veloce e gira fluido su uno **smartphone reale** (non solo desktop).
- La parallasse dà profondità credibile senza far muovere le cose in modo meccanico.
- Il vento è percepibile ma **discreto**, non si ripete visibilmente.
- Il gatto reagisce in modo vivo ma sobrio, mantiene il carattere "felino curioso,
  mai Disney".
- Draw call basse, bundle contenuto.

---

### Setup suggerito
Vite + React + `@react-three/fiber` + `@react-three/drei`. Struttura consigliata: un
componente `<HeroScene>` con dentro `<OrthographicCamera>`, i layer come componenti
`<Layer texture depth />`, il `<Cat />`, e gli hook per parallasse e vento. I file PNG
in `public/assets/` (o `src/assets/` importati), nominati come i layer sopra.

Chiedimi pure di partire dalla Milestone 1 e costruire lo scaffold.
