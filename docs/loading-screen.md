# Schermata di caricamento

Sta in **`index.html`**, non in React. Il bundle pesa qualche centinaio di kB e va
scaricato, parsato ed eseguito prima che React possa disegnare: un loader scritto
in React non copre il tratto peggiore dell'attesa, perché non può comparire prima
di sé stesso. Da `index.html` invece dipinge al primo fotogramma.

Per la stessa ragione **lo stile è inline** e non in `styles.css`: un foglio
collegato è un altro giro di rete prima del primo paint.

## Il fondo arriva a due tempi

1. il **turchese pieno** `#78b2ac`, che è la media della carta: è nel documento,
   non aspetta niente, e lo schermo non è mai bianco;
2. la **carta vera** (`/layers/muro-carta.webp`), in dissolvenza quando è
   decodificata. Siccome il colore sotto è già quello giusto, quello che si vede
   comparire è solo la grana.

`muro-carta.webp` è lo **stesso file** che la scena usa come fondale
(`Backdrop.jsx`), inquadrato con lo stesso cover: fra loader e scena il fondo non
cambia di un pixel. Gli sprite del loader (ramo, gatto, logo, bolle, barra) sono a
tela piena 1080×1920 e già allineati fra loro, come quelli della scena.

## La barra

Finché non c'è il precaricamento vero, la barra **non dichiara nessun numero**: si
avvicina al 90% e lì rallenta all'infinito, senza mai promettere di essere
arrivata. `window.__loader.progress(v)` è il gancio per quando il numero vero
esisterà — allora cambia la sorgente, non la barra (backlog §1.2).

## Il congedo

`window.__loader.done()` lo chiama **la scena**, non React, e non al montaggio: lo
chiama `Diorama.jsx` quando ha davvero disegnato. Nello stesso istante parte
l'intro — il diorama sta già nella posa del booking sotto la schermata, che
sfumando scopre la risalita ([`transizioni-gsap.md`](transizioni-gsap.md)).

Tre dettagli che sembrano di troppo e non lo sono:

- **durata minima 1200 ms.** A texture in cache la scena è pronta in pochi
  millisecondi, e uno splash che lampeggia è peggio di nessuno splash. E comunque
  il gatto che dorme vuole il tempo di essere guardato, altrimenti tanto vale non
  disegnarlo;
- **la barra chiude prima di uscire.** Uscire mentre è a metà è il modo più
  semplice di far sembrare rotto tutto;
- **rimozione anche senza `transitionend`.** A scheda in background quell'evento
  non scatta mai, e resterebbe un pannello invisibile a intercettare i clic:
  c'è un `setTimeout` di sicurezza. La costante `FADE` deve combaciare con la
  `transition` CSS lì sopra.
