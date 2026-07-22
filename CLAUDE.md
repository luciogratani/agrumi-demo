# Agrumì — hero diorama 2.5D

Webapp di prenotazione per **Agrumì**, un locale con forte identità visiva. La
hero è un **diorama papercraft 2.5D**: piani di carta ritagliata sfalsati in Z,
camera **ortografica**, vento procedurale, un gatto nero che reagisce all'utente.
Il sito ha tre stati in verticale — menu · hero · booking — e ci si passa
scorrendo il diorama.

Stack: Vite + React + `@react-three/fiber` + `@react-three/drei` + GSAP, pnpm.
La hero sta sulla home; il codice in `src/diorama/`.

## Priorità, in quest'ordine

1. **Mobile-first** — il target è lo smartphone, composizione verticale 9:16.
2. **Performance** — poche draw call, materiali unlit, texture leggere. Il
   collo di bottiglia è la **VRAM**, non la rete.
3. **UX semplice** — il booking è la cosa importante, la scena lo accompagna.
4. **Personalità visiva** — papercraft artigianale, palette calda mediterranea.

## Vincoli duri

- **Niente luci dinamiche, ombre runtime PBR o materiali illuminati.** Tutto
  unlit: le ombre di contatto sono cotte nelle texture, quelle proiettate sono
  una passata a parte (`docs/ombre.md`).
- **Niente clip di animazione bakate**: vento, gatto e transizioni sono
  procedurali in `useFrame` o tween GSAP su un numero.
- **Niente testo dentro le texture** e **niente CTA come mesh**: sono HTML/SVG
  sopra il canvas.
- **GSAP non scrive mai sugli oggetti three**, solo su un valore che `useFrame`
  legge. Sul DOM scrive diretto.
- **La scena non si monta in Blender**: per piani piatti si itera in codice.

## Come si lavora

- **La documentazione sta in [`docs/`](docs/)** ed è il sistema di lavoro:
  [changelog](docs/CHANGELOG.md), [backlog](docs/BACKLOG.md) e un documento per
  parte del sito. Una cosa fatta → una riga nel changelog; una decisione non
  ovvia → nel documento della sua parte, **col motivo**; un rinvio → nel backlog.
  L'indice e le regole: [`docs/README.md`](docs/README.md).
- **I valori si trovano col pannello leva**, non a mano: si tara a occhio, si
  preme *Esporta JSON*, si incolla in chat e da lì finisce nel codice
  ([`docs/pannello-leva.md`](docs/pannello-leva.md)).
- **Il dev server, gli screenshot e la verifica visiva sono dell'utente.** Claude
  non li avvia né li ispeziona di propria iniziativa.

## Dove guardare

| | |
|---|---|
| come funziona la scena | [`docs/scena-hero.md`](docs/scena-hero.md) |
| da PSD a WebP + manifest | [`docs/pipeline-asset.md`](docs/pipeline-asset.md) |
| transizioni, gesti, intro | [`docs/transizioni-gsap.md`](docs/transizioni-gsap.md) |
| schermata di caricamento | [`docs/loading-screen.md`](docs/loading-screen.md) |
| carta, booking, colori | [`docs/interfaccia.md`](docs/interfaccia.md) |
