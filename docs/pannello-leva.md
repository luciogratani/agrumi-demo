# Il pannello di regia (leva)

`controls.jsx`. È lo strumento di lavoro principale: praticamente ogni valore
della scena è stato trovato lì, non scritto a mano.

## Il giro

1. si tarano i parametri **a occhio**, con la scena viva davanti;
2. si preme **Esporta JSON** — copia tutto negli appunti e lo stampa in console;
3. si incolla il risultato in chat, e da lì finisce nel codice.

**Mai trascrivere valori a mano**: il round-trip via JSON esiste per non
sbagliarli.

## Cartelle

| | |
|---|---|
| **Viewport** | anteprima in una cornice grande quanto l'area **davvero visibile** su telefono. Non è il default: da quando il sito è a schermo pieno la scena si guarda intera, e la cornice serve a controllare la composizione su un'area stretta senza prendere in mano il telefono |
| **Rig gatto** | perni, respiro, idle, inseguimento, coda, blink |
| **Camera** | orbit control, separazione Z, reset vista |
| **Sfondo** | composito appiattito, pavimento, orizzonte |
| **Ombre** | direzione, distanza, risoluzione, sfocatura, passate, opacità, colore |
| **Parallasse** | intensità, morbidezza, giroscopio |
| **Vento** | ampiezza, le due frequenze, folata |
| **Transizione** | corsa, durata, ease, gesti, inversione, intro, e i tre passaggi a bottone |
| **Piani** | profondità, vento e corsa d'uscita per gruppo |

I bottoni della transizione restano accanto ai gesti di proposito: servono a
rivedere lo stesso passaggio molte volte mentre si tarano corsa e durata, cosa
scomoda a swipe.

## Tarare sul computer, guardare sul telefono

`pnpm dev` e si apre lo stesso indirizzo di rete su entrambi (il server ascolta
già su tutta la rete locale, `host: true`). Si muove uno slider sul computer e
**il telefono cambia nello stesso istante**, senza ricaricare.

Non è un pannello per il telefono, ed è voluto. Il problema non è che leva stia
stretto su uno schermo piccolo: è che **mentre tocchi uno slider il pollice sta
sopra la cosa che devi giudicare**. Anche un pannello mobile perfetto avrebbe
quel difetto. Così invece si tara dove c'è spazio e si guarda dove conta — che è
il telefono, visto che è lì che il sito verrà usato, e i due schermi non si
somigliano: la carta è larga 460 px su uno e 330 sull'altro, e il vento che sul
monitor è evidente sul vetro piccolo vale due pixel.

Il canale non è nuovo: è lo stesso WebSocket che Vite tiene aperto con ogni
browser per il refresh automatico. Il centralino sta in `vite.config.js` e
rimbalza i valori a tutti; il lato browser è `regia-live.js`. Chi li ha spediti
li riconosce e li ignora, e il telefono non spedisce mai — senza pannello i suoi
valori non cambiano da soli.

**Non viaggiano camera, perni e anteprima.** Sono strumenti di regia, non valori
della scena: l'orbit control sincronizzato vorrebbe dire farsi ruotare la camera
sotto gli occhi mentre si guarda, e la cornice-telefono su un telefono vero è un
controsenso.

Tutto questo esiste **solo in sviluppo**: `import.meta.hot` non c'è nella build
e il codice sparisce insieme a lui (verificato sul bundle).

## Editor dei perni

Con **modifica perni** attivo si clicca sulla scena nel punto di rotazione del
pezzo selezionato: il perno appare in giallo, gli altri in bianco, e l'export li
include. Piazzarli a numeri sarebbe frustrante. Vale per ogni layer, non solo per
il gatto.

## Comportamento

Si chiama con **`L`** e parte nascosto. Prima era sempre presente e sbiadiva
quando il puntatore era altrove, per non falsare il giudizio sulla composizione;
da quando la scena occupa tutto lo schermo e contiene interfacce vere, la regia è
uno strumento che si tira fuori quando serve.

Due esclusioni necessarie nella scorciatoia: `Cmd`/`Ctrl+L` è la barra degli
indirizzi, e la pressione va ignorata dentro i campi di testo — scrivere «Lucio»
nel nome della prenotazione farebbe altrimenti comparire il pannello. Su telefono
non c'è tastiera, quindi non compare mai: è il comportamento voluto.

Un dettaglio non ovvio: l'opacità tiene conto anche del **trascinamento**. Gli
slider di leva catturano il puntatore, quindi trascinando si esce dal pannello e
il solo `:hover` cadrebbe, facendolo sparire proprio mentre lo si sta regolando.
