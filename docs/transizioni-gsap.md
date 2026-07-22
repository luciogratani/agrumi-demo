# Transizioni e sinergia con GSAP

Il sito ha tre destinazioni disposte in verticale, e si passa dall'una all'altra
facendo scorrere il diorama:

```
  -1  booking        0  hero        +1  menu
```

Il segno è la direzione in cui scorre **la scena**, non l'utente: a `-1` il
diorama è sceso e dall'alto è calato il booking. Il booking sta sul movimento a
scendere di proposito: è la destinazione più importante, e quel movimento è il più
curato in composizione.

## La regola che tiene tutto insieme

> **GSAP non scrive mai sugli oggetti three.** Anima un oggetto JS — `{ p }` — e
> `useFrame` lo legge. **Sul DOM invece scrive diretto**, e va bene.

Il motivo: ogni Sprite riscrive posizione e rotazione a ogni fotogramma dentro
`useFrame`, e `ShadowPass` possiede il ciclo di rendering. Una tween che scrivesse
su `group.position` verrebbe sovrascritta a fotogrammi alterni. È lo stesso schema
del ref di `useParallaxInput`, così di modelli mentali ne resta uno solo.

Le scene di destinazione sono DOM e non hanno un `useFrame` da cui leggere: si
iscrivono con `subscribe(fn)` e ricevono `p` a ogni fotogramma. `subscribe` chiama
subito con il valore corrente, così chi si iscrive parte già nella posizione
giusta invece di lampeggiare per un fotogramma.

Altri dettagli di `transition.js`: `overwrite: true` (due tween sulla stessa
proprietà si combatterebbero), un passo per volta (da una destinazione si torna
alla hero, non si salta all'altra), e `prefers-reduced-motion` che riduce la
durata a 0.01 s — il passaggio avviene comunque, ma è uno stacco e non un viaggio.

## `exit`, e perché non è `depth`

`depth.js` ha una tabella separata per la transizione. Sono due regie diverse e i
valori tarati non si somigliano: la parallasse è uno scarto di pochi punti
percentuali dove il rapporto fra i gruppi si legge come profondità, la transizione
è una corsa di quasi due altezze di schermo dove lo stesso rapporto diventa
**velocità di uscita dall'inquadratura**.

Il differenziale non segue la distanza dalla camera ma **l'ordine in cui le cose
devono sparire**: cielo e locale corrono più del frame e se ne vanno per primi, le
foglie davanti restano indietro e sono le ultime. È questo sfalsamento a far
leggere il movimento come un diorama che si smonta invece che come un'immagine che
scorre.

Il fondale resta a 0 — è il muro dietro, e il cielo fermo è gratis: colore di
sfondo e `Backdrop` non sono Sprite, quindi non li tocca nessuno.

## I gesti (`gestures.js`)

Stato **discreto guidato dal gesto**, non dalla posizione di scroll: il booking è
un form, e su mobile la tastiera che si apre ridimensiona il viewport e manda
fuori sincrono qualunque timeline agganciata allo scroll. Superata la soglia parte
una transizione intera.

**La direzione segue la convenzione nativa**, non la parola «su»: il dito che sale
porta il contenuto in alto e scopre ciò che sta sotto. È l'opposto di come si
descrive a voce, ed è il motivo dell'interruttore per invertirla nel pannello.

Due cose che sembrano superflue e non lo sono:

- **il blocco anti-inerzia.** Trackpad e iOS mandano eventi per quasi un secondo
  dopo che il dito si è staccato: senza guardia un gesto solo faceva due passi,
  dal menu al booking. Si riarma 240 ms dopo l'ultimo evento, non a fine
  animazione;
- **`touch-action: none` sulla cornice.** I listener sono passivi e non possono
  chiamare `preventDefault`: senza, su mobile lo swipe fa pull-to-refresh.

I gesti si spengono con orbit control o modifica perni attivi (lì trascinamento e
clic servono ad altro) e **durante l'intro**.

## L'intro (`useIntro`)

All'ingresso il diorama parte nella **posa del booking** e risale al riposo: è lo
stesso movimento del ritorno da booking a hero, giocato sullo stesso differenziale
di `exit`, con la stessa corsa ed ease — di proposito un 10% più lento, perché
all'entrata il diorama si prende un attimo in più per posarsi. Resta agganciato
alla durata della transizione, quindi il rapporto tiene se quella cambia.

Usa un valore proprio (`i`), non `p`: le destinazioni reagiscono solo a `p`,
quindi durante l'intro il pannello del booking resta nascosto e l'entrata non
rivela nulla di ciò che verrà.

Parte al **congedo del loader**, nello stesso istante — vedi
[`loading-screen.md`](loading-screen.md). Prima di allora `i` resta fermo alla posa
di partenza, così non si vede nessun salto sotto la schermata di caricamento.

## Le destinazioni (`Destinations.jsx`, `Booking.jsx`)

Il lato interfaccia sta in [`interfaccia.md`](interfaccia.md). Qui basta il
meccanismo: scorrono in senso opposto al diorama e in modo **lineare** su `p`,
così arrivano mentre la scena se ne va e condividono l'ease con lei senza doverlo
ripetere.

Due nodi e non uno: il wrapper è trasparente e a tutto schermo, ed è lui che
trasla. Traslando la carta, che è più piccola della cornice, un
`translateY(100%)` la sposterebbe solo della propria altezza e ne resterebbe una
striscia dal bordo.
