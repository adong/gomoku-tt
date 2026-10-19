/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.GMK_TITLE, // the name lives in js/title.js
  button: { top: 'var(--kh-top)' }, // index.html moves it (and the language button) to the bottom left on tall screens
  keys: [
    ['move round the board · put your stone there', '← ↑ → ↓ · Enter or Space'],
    ['undo one move', 'U'],
    ['call your brother (2 players: high five)', 'T'],
    ['new game', 'R'],
    ['pause · sound', 'P or Esc · M'],
    ['menu: LITTLE 9 × 9 · BIG 13 × 13 · CLASSIC 15 × 15', '1 · 2 · 3'],
    ['menu: Teddy or Tommy · 1 or 2 players · level', '← → · ↑ ↓ · L'],
    ['menu: undo button on or off · EXACTLY 5', 'U · F'],
  ],
  note: 'Take turns putting a stone on a point. Five in a row wins: across, down or corner to corner. Teddy has the dark blue stones 🏀, Tommy the cream ones ✌️. EXACTLY 5: six in a row doesn\'t count.',
  touch: 'Press a point to see your stone, slide to move it, let go to put it down. Tap your brother\'s face (bottom right) to call him.',
});
Kit.lang.setup({ button: { top: 'var(--kl-top)' } });
