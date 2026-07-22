# Ombre

`ShadowPass.jsx`. Le sagome finiscono su un **layer dedicato di three.js**,
vengono disegnate in un render target, sfocate una volta sola con una gaussiana
separabile e composte fra il fondale e gli sprite.

## Perché così, e non sfocando ogni ombra per conto suo

È stato provato e non regge: per un raggio ampio servono centinaia di campioni per
pixel, e le scorciatoie peggiorano le cose. Il tentativo coi mipmap produceva
**rettangoli pieni** — a raggio alto il livello mip collassa all'alpha medio della
sagoma e riempie uniformemente il quad.

La versione attuale invece:

- è una sfocatura vera, nessun artefatto per quanto si alzi il raggio;
- unisce le ombre **col massimo** nel buffer prima della composizione, quindi due
  sagome sovrapposte danno una sola ombra e l'opacità agisce sul risultato come su
  un pezzo unico;
- tiene il buffer a risoluzione ridotta, e la riduzione stessa fa parte della
  sfocatura.

La sfocatura è espressa in **pixel a schermo**, non del buffer: cambiando
risoluzione cambia la qualità, non l'entità. Le passate ripetute dividono il
raggio per la radice del loro numero, quindi levigano senza allargare.

## Trappole

- **lo sfondo della scena va tolto per la durata della passata**
  (`scene.background = null` e ripristino): three lo disegnerebbe anche nel
  buffer, riempiendolo di opaco e coprendo tutto lo schermo d'ombra;
- `ShadowPass` gira a **priorità 1** in `useFrame`, il che disattiva il rendering
  automatico di R3F: **il ciclo di disegno lo gestisce lui**. Se un giorno la
  scena non appare più, è il primo posto dove guardare.
