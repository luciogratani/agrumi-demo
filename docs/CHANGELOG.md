# Changelog

Cosa è cambiato, dal più recente. Una riga per cosa fatta, con l'hash del
commit. Il perché sta nei documenti di sistema, non qui.

## 2026-07-22

- **Booking su carta vera**: foglio, tre righe e barra gialla sono sagome
  ritagliate, impaginate dal manifest. Le tre scelte si vedono tutte insieme al
  posto dei quattro passi con barra di avanzamento, e ogni riga si apre sul suo
  passo nella stessa zona. Icone segnaposto in `icone.jsx`, in attesa dei
  vettoriali e del font.
- **Bottoncini d'angolo** su piastrella di carta: chiudere a destra, tornare
  indietro a sinistra, storti di un angolo diverso l'uno dall'altro, con croce e
  freccia disegnate ad archi. `prep-booking.mjs` impara i «pezzi sciolti», quelli
  generati fuori dalla tela della card.
- Cartella **Ombre carta** nel pannello: le ombre del booking non sono negli
  asset, si tarano a occhio e arrivano al CSS come variabili, dallo stesso
  angolo di luce della scena. Valori tarati a pannello (224°, 14.5, 4 px, 40%)
  già a default. La riga specchiata riceve l'ombra con la X ribaltata, che
  altrimenti `scaleX(-1)` le faceva cadere dal lato sbagliato.
- `tools/prep-booking.mjs` converte gli export del PSD (37 MB) in
  `public/ui/booking/` (155 kB) e ne salva l'impaginato in `booking-ui.json`, in
  frazioni della card. Le tre righe sono un solo file.
- Il repo va su GitHub, pubblico, e i **sorgenti di lavoro escono da git**: i
  PNG della prima scena stanno ora in `../asset-lavoro/`, accanto al repo come
  già i PSD. Erano 24 MB su 25, cioè sedici volte il sito. Tolti anche dalla
  storia, perché su un repo pubblico un file cancellato in un commit resta
  scaricabile da tutti quelli prima.
- La hero passa **sulla home**: cancellate la prima scena a 5 piani
  (`src/components/`, `src/scene/`) e la route `#/diorama`, e con loro il router
  a hash. I PNG di quella scena escono da `public/`: 24 MB che finivano nella
  build. `prep-layers.mjs` ne prende ancora il limone della CTA. `a48f2a0`
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
