# Pipeline degli asset

Da Photoshop alla scena. `tools/prep-layers.mjs` legge i PNG esportati dal PSD
(`scena 3d/layer da gen 1 - 3`, fuori dal repo) e produce `public/layers/*.webp`
più `src/diorama/manifest.json`.

```
node tools/prep-layers.mjs      # asset + manifest
node tools/check-manifest.mjs   # verifica allineamento
```

## Perché non si tiene la tela piena

Gli export sono **tutti a tela piena 3584×4800** e quasi interamente vuoti:
~69 MB di VRAM per layer, ~1.8 GB in totale. Insostenibile.

Lo script ritaglia ciascuno al suo **bounding box alpha** e salva nel manifest la
posizione **normalizzata sulla tela originale**. Il file diventa piccolo ma sa
dov'era: l'allineamento di Photoshop resta esatto al pixel, senza riposizionare
niente a mano. 24 MB di PNG → 0.7 MB di WebP.

Lo script gestisce anche i livelli da saltare (`SKIP`, per il gatto intero
sostituito dai suoi pezzi), il fondale di carta preso da `sfondo nuovo`, e gli
asset di interfaccia (il limone della CTA, WebP più fallback PNG, ritagliato al
bounding box perché il riquadro del bottone coincida col limone).

## L'ordine Z viene dal PSD

Dal **numero messo a mano nei nomi dei livelli** (`0` sfondo, `1` albero, … `5`
foglie davanti, `3.1.0`…`3.1.3` per i pezzi del gatto), non dall'ordine dei file.
A parità di numero decide l'indice dell'exporter, **al contrario**: Photoshop
numera dall'alto dello stack, quindi indice più alto = più indietro.

Due trappole già pagate:

- **il prefisso del nome file lo decide Photoshop e cambia a ogni sessione**
  (`hero_…` è diventato `composite_demo_step_3_…`). Non ci si fa affidamento: si
  cerca la catena di indici, l'unica parte con forma fissa;
- **gli indici vanno confrontati come lista di numeri, non concatenati.** Il `3`
  di `step_3` finiva nella catena e la cifra risultante sforava la precisione
  degli interi, mandando in pattume l'ordinamento. Sintomo: il logo dietro
  l'insegna.

## Verificare senza browser

`node tools/check-manifest.mjs` ricompone gli sprite su tela piena usando **solo**
gli offset del manifest e salva un PNG. È il modo di controllare l'allineamento
quando non c'è un browser headless, ed è servito ogni volta che gli asset sono
cambiati.

## Trappole

- le texture stanno in `public/`, il manifest in `src/`: Vite avverte se si
  importa JSON da `public/`;
- `manifest.json` è **generato**, non si modifica a mano;
- cambiare i numeri dei livelli in Photoshop cambia la scena. Nessun ordinamento
  nel codice va «corretto» senza sapere questo.
