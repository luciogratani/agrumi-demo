# Documentazione — Agrumì

Il lavoro si tiene qui. Tre tipi di documento, con compiti diversi:

| documento | risponde a |
|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | cosa è stato fatto, e quando |
| [`BACKLOG.md`](BACKLOG.md) | cosa c'è da fare, in che ordine e perché |
| gli altri | come funziona una parte del sito, e **perché** funziona così |

## I documenti di sistema

- [`scena-hero.md`](scena-hero.md) — il diorama: coordinate, materiali, camera,
  layer, sprite, movimenti procedurali, rig del gatto
- [`pipeline-asset.md`](pipeline-asset.md) — da Photoshop a `public/layers` +
  manifest, e come si verifica l'allineamento senza browser
- [`ombre.md`](ombre.md) — la passata d'ombra su render target
- [`transizioni-gsap.md`](transizioni-gsap.md) — i tre stati del sito, il valore
  condiviso animato da GSAP, gesti, intro
- [`loading-screen.md`](loading-screen.md) — la schermata di caricamento in
  `index.html` e il passaggio di consegne alla scena
- [`interfaccia.md`](interfaccia.md) — la carta delle destinazioni, il booking,
  la lingua visiva (colori campionati, tipografia mancante)
- [`pannello-leva.md`](pannello-leva.md) — lo strumento di regia e il giro
  «taro a occhio → esporto JSON → finisce nel codice»

## Come si tiene aggiornato

- **una cosa fatta** → una riga nel changelog, con la data e l'hash del commit;
- **una decisione non ovvia** → nel documento della sua parte, col motivo. Vale
  soprattutto per le strade sbagliate già percorse: rifarle costa tempo, e
  queste pagine esistono per quello;
- **un'idea o un rinvio** → nel backlog, non in un elenco a parte. Due elenchi
  divergono, ed è così che si perdono i pezzi;
- il concept e i vincoli di partenza stanno in [`../CLAUDE.md`](../CLAUDE.md).
