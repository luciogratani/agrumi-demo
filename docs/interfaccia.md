# Interfaccia — la carta, il booking, la lingua visiva

Il meccanismo con cui le destinazioni entrano ed escono sta in
[`transizioni-gsap.md`](transizioni-gsap.md). Qui c'è il perché di come sono
fatte.

## La destinazione non copre il mondo, ci si appoggia sopra

All'inizio era un rettangolo opaco a tutto schermo e lo stacco era netto — ma non
per via del testo: perché il mondo cambiava tutto insieme, oggetti, fondo e
materiale. Il cielo è l'unica cosa che già non si muove, quindi era continuità
disponibile che si stava buttando via.

Ora la destinazione è **un foglio di carta con un margine attorno**, il cielo
resta visibile, e qualche foglia del gruppo 5 non esce con le altre e incornicia
il foglio (`LINGER` in `depth.js`). La carta ha un `max-width`: il contenitore è a
schermo pieno e senza limite su desktop si stirerebbe per tutta la finestra, con
un'interfaccia da pollice larga mille pixel.

## Dentro la carta non si scorre mai

È stato provato: lo scorrimento interno litiga con i gesti che governano gli stati
del sito, perché lo stesso movimento del pollice significa due cose diverse a
seconda di dove è arrivato il contenuto. Esisteva una logica che negoziava (cedi
al contenuto finché ha corsa, poi naviga) ed è stata **tolta**: il gesto verticale
ha un significato solo.

Il contenuto si adatta alla carta, a passi. **Se un passo non ci sta, si divide,
non si fa scorrere.**

## Il booking (`Booking.jsx`)

Prototipo a quattro passi — giorno, ora, persone, nome — con stato locale: non
invia niente. Serviva a verificare che la carta reggesse un compito vero. Regge.

Tre fasce: testa fissa, corpo che occupa quel che resta, piede con l'azione sempre
nello stesso punto, così il pollice ritrova il bottone dove l'ha lasciato. La
barra di avanzamento non è decorazione: in un form a tappe la domanda vera è
«quanto manca». Il campo di testo è a **16 px** perché sotto quella misura iOS
zooma sul focus e sballa l'inquadratura della carta.

Il menu è ancora un segnaposto (backlog §2.1).

## I colori sono campionati dagli asset

Non affiancati a occhio: inchiostro `#113251` dal logo sull'insegna, limone
`#efb416` dai limoni, carta `#f0e2c9` dalla targa schiarita quanto basta a
leggerci sopra. Se gli asset cambiano si ricampionano invece di andare alla deriva
— bastano un istogramma sui pixel opachi di `public/layers/*.webp` e i bucket più
popolosi. Stanno tutti in `:root` dentro `styles.css`.

Due regole che tengono insieme il resto:

- **il navy non è mai superficie, solo inchiostro**, com'è nella scena. L'unica
  eccezione è il bottone d'azione, ed è proprio per questo che si vede;
- **un solo colore pieno in tutta la carta**, il limone sulla scelta fatta. Tutto
  il resto sono contorni all'inchiostro al 20%.

L'interfaccia è deliberatamente quieta: fuori c'è un diorama affollato, e più ci
si avvicina alla conferma meno deve esserci da guardare.

## Manca la tipografia

Tutto gira su `system-ui`, che non è una scelta ma l'assenza di una: niente
webfont per non aggiungere una richiesta di rete, e nel repo non ci sono file di
font. La poca personalità del testo viene da **come** è usato — maiuscoletto
spaziato a `0.16em` per occhielli ed etichette, la voce che il marchio già usa in
«SAPORI SOLARI» — non da cosa è. Scegliere un display face cambierà il carattere
della pagina più di qualunque altra cosa fatta finora: backlog §2.0.
