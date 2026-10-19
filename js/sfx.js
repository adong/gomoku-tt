/* TT Gomoku: the game's own sounds, built on Kit.sound.tone / hiss (all synthesised, no files).
   GMK.sfx.kit(name, ...args) plays a kit effect; the rest are ours. Every call is a silent no-op until
   Kit.sound.init() has run from the first tap. */
(function () {
  'use strict';
  const GMK = (window.GMK = window.GMK || {});
  const S = Kit.sound;
  const tone = (o) => S.tone(o);
  const hiss = (o) => S.hiss(o);

  const sfx = {
    kit(name, ...args) {
      if (S[name]) S[name](...args);
    },
    // a stone lands on the wood: a sharp clack, a little higher for black
    place(color) {
      const f = color === 1 ? 1500 : 1300;
      tone({ type: 'triangle', f, to: f * 0.55, dur: 0.05, vol: 0.18 });
      tone({ type: 'sine', f: 380, to: 260, dur: 0.09, vol: 0.12 });
      hiss({ filter: 'bandpass', f: 3200, q: 1.4, dur: 0.04, vol: 0.12 });
    },
    // a stone taken back: a quick whoop up
    undo() {
      hiss({ f: 900, to: 3600, dur: 0.22, vol: 0.06, q: 1.2 });
      tone({ type: 'triangle', f: 330, to: 880, dur: 0.22, vol: 0.07 });
    },
    // the cursor or the point under the mouse moves
    tick() { tone({ type: 'square', f: 1200, dur: 0.025, vol: 0.02, lp: 3000 }); },
    // can't go there
    nope() {
      tone({ f: 220, dur: 0.08, vol: 0.08 });
      tone({ f: 180, dur: 0.1, vol: 0.08, at: 0.09 });
    },
    // the CPU is thinking: robot blips for Bolt, a hum for Bruno
    think(robot) {
      if (robot) [880, 1320, 990].forEach((f, i) => tone({ type: 'square', f, dur: 0.05, vol: 0.03, at: i * 0.09, lp: 2500 }));
      else tone({ type: 'triangle', f: 196, to: 247, dur: 0.35, vol: 0.06 });
    },
    // a good move: a little rising chime
    nice() { [784, 988, 1319].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.06, dur: 0.18, vol: 0.1 })); },
    // a four: two quick high notes
    four() { [1047, 1397].forEach((f, i) => tone({ type: 'square', f, at: i * 0.08, dur: 0.1, vol: 0.05, lp: 3500 })); },
    // a block: a cheerful bonk
    block() {
      S.punch();
      tone({ type: 'triangle', f: 660, to: 990, dur: 0.16, vol: 0.1, at: 0.04 });
    },
    // the CPU has a four or an open three against you: a soft "uh-oh, call your brother"
    warn() {
      tone({ type: 'triangle', f: 660, dur: 0.1, vol: 0.07 });
      tone({ type: 'triangle', f: 523, dur: 0.16, vol: 0.07, at: 0.12 });
    },
    // five in a row
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f, at: i * 0.11, dur: 0.16, vol: 0.05, lp: 3000 }));
      [523, 659, 784].forEach((f) => tone({ type: 'triangle', f: f * 2, at: 0.46, dur: 0.6, vol: 0.08 }));
      hiss({ filter: 'highpass', f: 6000, at: 0.46, dur: 0.5, vol: 0.06 });
      [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f, at: 0.9 + i * 0.09, dur: 0.3, vol: 0.08 }));
    },
    // the CPU won: a soft wah-wah, never harsh
    lose() {
      [392, 370, 349, 311].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.22, dur: i === 3 ? 0.5 : 0.22, vol: 0.09 }));
    },
    draw() {
      tone({ type: 'triangle', f: 523, dur: 0.14, vol: 0.09 });
      tone({ type: 'triangle', f: 523, dur: 0.22, vol: 0.09, at: 0.16 });
    },
    // your brother pops in (and out)
    pop() {
      tone({ f: 300, to: 900, dur: 0.12, vol: 0.1 });
      hiss({ f: 2000, to: 6000, dur: 0.15, vol: 0.05 });
    },
    // the high five: a clap
    clap() {
      hiss({ filter: 'bandpass', f: 1500, q: 0.8, dur: 0.09, vol: 0.22 });
      hiss({ filter: 'highpass', f: 3000, dur: 0.05, vol: 0.1, at: 0.01 });
    },
  };

  GMK.sfx = sfx;
})();
