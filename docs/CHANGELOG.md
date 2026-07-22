# Changelog

Cosa è cambiato, dal più recente. Una riga per cosa fatta, con l'hash del
commit. Il perché sta nei documenti di sistema, non qui.

## 2026-07-22

- La hero passa **sulla home**: cancellate la prima scena a 5 piani
  (`src/components/`, `src/scene/`) e la route `#/diorama`, e con loro il router
  a hash. I PNG di quella scena escono da `public/` (24 MB che finivano nella
  build) e restano in `asset-lavoro/scena-vecchia/`, da cui `prep-layers.mjs`
  prende ancora il limone della CTA. `a48f2a0`
- La documentazione si sposta in `docs/`: changelog, backlog e un documento per
  parte del sito, al posto di `ROADMAP.md` e `SCENA-3D.md`.

## 2026-07-21

- **Intro della hero**: all'ingresso il diorama risale dalla posa del booking,
  rigiocando lo stesso movimento del ritorno. Parte al congedo del loader.
  `94fe54e`
- I gesti restano bloccati finché l'intro è in corso. `9c05d77`
- Menu e booking invertiti sull'asse: il **booking scende dall'alto**, che è il
  movimento più curato in composizione. `41ddf9a`
- Regia dei piani: corsa d'uscita del locale e vento del cielo. `659b6c9`
- Foglie e limoni imparentati ai rami, editor dei perni esteso a ogni layer,
  ordine delle nuvole corretto. `7e6c675`

## 2026-07-20

- **Schermata di caricamento** scritta in `index.html` (non in React, così
  dipinge prima del bundle), con il fondo di carta condiviso con la scena.
  `662b9e9`

## 2026-07-19

- Destinazioni **su carta** sopra il cielo, booking a quattro passi, sito a
  schermo pieno. `b1eb386`
- **Transizione fra scene**: driver GSAP su valore condiviso, gesti wheel/swipe,
  destinazioni segnaposto. `a56bdc4`
- Prima CTA della hero (poi rimossa) e documento di handoff della scena.
  `c47371e`
- Gatto ancorato al ramo: oscilla con lui invece di restare sospeso. `8c5042b`

## 2026-07-18

- **Rig del gatto**: perni espliciti, respiro, idle autonomo della testa, coda
  piegata sui vertici, blink a scambio di texture. `c4a044b`
- Asset PNG-24 con i pezzi del gatto, pipeline generalizzata, ombre a
  risoluzione scelta. `20b6eec`
- **Ombre su buffer**, layer solidali e valori di regia tarati. `b8df347`
- **Prima versione del diorama 2.5D**: pipeline dei layer PSD, scena R3F,
  pannello di regia. `48d3da5`
