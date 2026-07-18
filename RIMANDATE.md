# Rimandate

Cose valutate, volute, ma spostate più avanti per tenere la priorità su mobile.
Non sono idee scartate: sono decise, manca solo il momento.

## Ottimizzazione del peso (misurata, non fatta)

Numeri rilevati sul manifest attuale: 29 sprite, 7.2 MP, **27.4 MB di VRAM**
(36.4 con i mipmap accesi). I file scaricati sono solo 800 kB — il problema non
è la rete, è la memoria GPU, ed è lì che si gioca la resa su telefono.

Interventi in ordine di resa:

1. **`0-sfondo` da solo pesa 10.6 MB, il 39% del totale** — ed è la
   composizione appiattita, che sta nascosta e serve solo come riferimento di
   confronto. Va caricata solo in sviluppo (`import.meta.env.DEV`) o su
   richiesta: è il guadagno più grosso e costa una riga.
2. **Mipmap.** Costano il 33% e servono poco: gli sprite si vedono quasi a
   scala 1:1, quindi la minificazione è minima. Da rivalutare spegnendoli.
3. **KTX2/Basis.** I WebP si comprimono bene in rete ma sulla GPU tornano RGBA
   grezzi; KTX2 resta compresso anche in memoria. È l'ottimizzazione che pesa
   di più, ma ha senso solo su texture definitive.
4. **`TARGET_W`.** 1440 è ben calibrato sul DPR limitato a 2 (un iPhone SE
   arriva a ~1270 px di tela). Non toccarlo senza rimisurare.

## Interazione da desktop

- **Testa che insegue il puntatore.** Implementata e funzionante. Su mobile
  l'idle autonomo è il comportamento principale; questo resta un di più per
  chi arriva da desktop.
- **Sguardo verso la CTA.** Il gatto che ogni tanto guarda il pulsante di
  prenotazione, come indicazione implicita. Da fare insieme alla CTA vera.

## Rig più fine

Dal CLAUDE.md, non ancora fatto: orecchie separate (scatto rapido e raro, un
orecchio solo), occhi e pupille separati dalla testa per muovere lo sguardo
senza ruotare tutta la testa. Servono asset nuovi.

## Ombre

- **Bande di profondità.** Oggi tutte le ombre condividono un raggio di
  sfocatura. Un oggetto più staccato dal muro dovrebbe proiettare un'ombra più
  morbida: si ottiene con due o tre buffer invece di uno.
- **Scelta della risoluzione.** Piena / metà / un quarto sono esposte per
  confronto: quando la decisione è presa, le altre si possono togliere.

## Estetica

- **Contorno di carta deliberato.** Il PNG-8 dava un alone bianco accidentale,
  ora risolto col PNG-24. Se quel look serve, si rifà apposta: contorno color
  crema, con spessore e irregolarità regolabili, invece che come residuo
  tecnico.
