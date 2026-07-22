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

Stato locale, non invia niente: resta un prototipo di interfaccia. Serviva a
verificare che la carta reggesse un compito vero, e regge.

**Le tre scelte si vedono tutte insieme.** Prima era un form a quattro passi con
una barra di avanzamento; il problema di quella forma non è il numero di tocchi
ma che si vede solo la domanda corrente, e per ricontrollare una risposta si
deve tornare indietro. Ora giorno, ora e persone stanno in tre righe di carta
che sono **insieme riepilogo e via d'accesso**: dicono cosa hai scelto e si
aprono sul loro passo. La barra di avanzamento è sparita con ciò che
misurava — con tutto in vista non c'è più un «quanto manca» da dichiarare.

Il passo aperto occupa **esattamente lo spazio delle tre righe**, quindi sono
loro a definire i margini della zona di lavoro e non c'è un secondo impaginato
da tenere allineato al primo. Vale ancora, e più di prima, che dentro la carta
non si scorre: se un passo non ci sta si divide.

**I due bottoncini d'angolo** stanno su una piastrella di carta e vanno dove si
va a cercarli: chiudere a destra, tornare indietro a sinistra. Erano uno solo che
cambiava mestiere — un bersaglio sempre nello stesso punto — ma una freccia
«indietro» in alto a destra è un posto che nessuno guarda. Il ritorno compare
solo dentro un passo, perché dal riepilogo non c'è dove tornare. Ci stanno per
due misure prese sull'asset: la curva dell'angolo finisce all'8% e il fregio
comincia al 28%, quindi ai lati resta spazio libero.

Sono **storti di proposito e di un angolo diverso l'uno dall'altro**: due
piastrelle inclinate uguale sembrano montate male, due inclinate diverso
sembrano posate a mano. Per lo stesso motivo la croce e la freccia sopra sono
disegnate ad archi e non a rette. La rotazione gira anche l'ombra — è la
trappola dello specchio — ma a pochi gradi la sposta di meno di un pixel e non
vale una correzione. Non scendono sotto i 42 px nemmeno a carta stretta: sotto
quella soglia un bersaglio col pollice si sbaglia.

Il bottone giallo **non si spegne quando manca qualcosa**: porta al passo che
manca. Un bottone spento non spiega cosa lo spegne, il passo sì. Resta spento
solo sui dati personali, dove la cosa mancante è già in vista.

Il campo di testo è a **16 px** perché sotto quella misura iOS zooma sul focus e
sballa l'inquadratura della carta. Da sapere: con la tastiera aperta la carta
non si rimpicciolisce — il pannello è `position:fixed`, quindi l'altezza resta
quella del viewport di layout e la tastiera copre. È accettabile perché il passo
coi campi è l'ultimo e corto.

Il menu è ancora un segnaposto (backlog §2.1) e usa la carta CSS `.scene-card`;
il booking non ce l'ha attorno, perché la sua carta **è** un asset con bordo e
ombra propri e appoggiarla su un secondo rettangolo ne farebbe due.

## La carta arriva già impaginata

Gli asset del booking (card col fregio-limone, riga, barra d'azione) escono da un
PSD a tela piena come quelli della scena, e quella tela porta con sé una cosa che
sarebbe un peccato buttare: **le posizioni**. Righe e barra sono già impaginate a
mano. `prep-booking.mjs` le ritaglia e converte quegli offset in **frazioni della
card**, che finiscono in `booking-ui.json` — così il CSS piazza in `%` dentro la
carta e l'impaginato è quello composto in Photoshop, non una sua riedizione a
occhio. I passi fra le righe risultano 3.01% e 3.02%: il ritmo verticale era già
deciso.

Due conseguenze:

- **le tre righe sono un solo file.** Nel PSD sono lo stesso disegno duplicato
  (differenza media 1,4%): un terzo del peso e una texture sola da decodificare.
  Per rompere la ripetizione basta specchiarne una con `scaleX(-1)`, che non
  costa niente;
- **la card tiene le sue proporzioni** (`aspect-ratio`, 0.7087) invece di
  stirarsi: gli angoli e il bordo sono disegnati a mano e una scalatura non
  uniforme si vede subito.

Le ombre non sono negli asset, sono in CSS, e vanno di `drop-shadow` e non di
`box-shadow`: quest'ultima seguirebbe il rettangolo dell'elemento invece della
sagoma ritagliata, e sugli angoli irregolari si stacca. Stanno su uno
pseudo-elemento e non sull'elemento, altrimenti l'ombra cadrebbe anche sul testo
che ci sta sopra.

La luce è **la stessa della scena**, non una decisione a parte: la cartella
*Ombre carta* del pannello parte dallo stesso angolo delle ombre del diorama e
`Diorama.jsx` la converte in variabili CSS — il foglio sul cielo, i pezzi sul
foglio, il pezzo premuto. L'unica conversione è di segno, perché in three la Y
sale e in CSS scende. Tutte da un giro solo di valori: separate, a furia di
ritocchi la carta finirebbe illuminata da tre luci diverse. Poca sfocatura
(4 px): la carta è ritagliata e appoggiata, non stampata — morbida
galleggerebbe.

**Trappola dello specchio.** La riga che viene girata con `scaleX(-1)` per non
ripetere lo stesso disegno tre volte si portava dietro anche l'ombra, perché il
transform arriva dopo il filtro: si vedeva subito, una riga illuminata da destra
in mezzo a due illuminate da sinistra. Rimedio: a quella riga si dà l'ombra con
la **X già ribaltata**, così dopo lo specchio torna in riga con le altre. Vale
per ogni pezzo che verrà specchiato in futuro.

## Come la carta sta nello schermo

`width: min(460px, 100cqw, calc(100cqh * var(--bk-ratio)))`. Tre vincoli in una
riga, e **quello che conta è il terzo**: la carta è alta 1.41 volte la sua
larghezza, quindi su uno schermo corto sbatte contro l'altezza molto prima di
toccare gli altri due. È la stessa paura che aveva scartato la variante con la
targa ad arco, e qui è disinnescata da un limite invece che da un disegno più
basso.

Le unità sono quelle del **contenitore** e non della finestra: nell'anteprima da
desktop la scena vive in una cornice più piccola, e con `dvh` la carta si
misurerebbe sullo schermo vero e sborderebbe dalla cornice.

Dentro la carta il tipo è in `cqw` con un `clamp`: rimpicciolendo la carta
rimpicciolisce tutto insieme invece di sfondarla. Le misure dei pickers restano
in pixel — la carta varia poco (330–460 px) e quei valori erano già tarati.

Questo chiede al browser container query e `color-mix`: Safari 16, settembre
2022. È la soglia più alta che il sito si prende, ed è consapevole.

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
