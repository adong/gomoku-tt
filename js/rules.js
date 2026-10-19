/* TT Gomoku: the rules and the CPU. No Three.js and no page in here: the game and the headless checks
   (js/check.js, tools/check.js) run this same file.

   The board is n x n points (9, 13 or 15); point i = row * n + col, from the top left. 0 is empty, 1 a black stone
   (Teddy's, dark blue) and 2 a white one (Tommy's, cream). The players take turns putting one stone on an empty
   point, and five in a row (across, down or corner to corner) wins:
     free-style (the default): five or more in a row wins, and there are no forbidden moves;
     EXACTLY FIVE (an option): only exactly five wins; a row of six or more doesn't count, for both sides.
   A full board with no five is a draw.

   The CPU (cpuMove / decide):
     🐣 EASY    for Tommy (5). Takes a five it can see more often than not (EASY.win). Always blocks an "obvious" four
               (four stones side by side, the gap at the end), a split four (XX_XX) only sometimes, and never a three.
               Otherwise it builds its own lines, with plenty of randomness.
     🔥 NORMAL  for Teddy (8), threat-based. In order: make five; block a four; make two ways to five (an open four,
               or two fours); stop an open three (any move after which the other side can't make an open four); then
               the best move by a score that makes and blocks threes, fours and four-three / three-three forks, and
               builds lines. NORMAL.slip: how often it doesn't notice a fork the other side is setting up (so Teddy
               can win with a clever trap); it never misses a four or an open three. */
(function (root) {
  'use strict';
  const GMK = (root.GMK = root.GMK || {});

  const B = 1, W = 2; // black (Teddy) and white (Tommy)
  const other = (c) => 3 - c;
  const SIZES = [9, 13, 15];
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]]; // (columns, rows) per step: across, down and both diagonals

  const EASY = { win: 0.6, broken: 0.35, wander: 0.3, care: 0.15 };
  const NORMAL = { slip: 0.25 };

  function newGame(n = 15, opts = {}) {
    return {
      n, exact: !!opts.exact, noDraw: !!opts.noDraw, board: new Array(n * n).fill(0), turn: opts.first || B,
      moves: [], over: false, winner: 0, line: null,
    };
  }
  const clone = (st) => Object.assign({}, st, { board: st.board.slice(), moves: st.moves.slice(), line: st.line && st.line.slice() });
  const isLegal = (st, i) => !st.over && Number.isInteger(i) && i >= 0 && i < st.board.length && st.board[i] === 0;
  const isFive = (st, len) => (st.exact ? len === 5 : len >= 5);

  // the point k steps from i along direction d, or -1 off the board
  function step(st, i, d, k) {
    const n = st.n, r = ((i / n) | 0) + DIRS[d][1] * k, c = (i % n) + DIRS[d][0] * k;
    return r >= 0 && r < n && c >= 0 && c < n ? r * n + c : -1;
  }

  // How many stones of colour c in a row through point i along d, counting i itself as c. RLO and RHI are left
  // holding how many there are before and after i.
  let RLO = 0, RHI = 0;
  function runLen(st, i, c, d) {
    const n = st.n, b = st.board, dc = DIRS[d][0], dr = DIRS[d][1];
    const r0 = (i / n) | 0, c0 = i % n;
    let lo = 0, hi = 0;
    for (let r = r0 - dr, col = c0 - dc; r >= 0 && r < n && col >= 0 && col < n && b[r * n + col] === c; r -= dr, col -= dc) lo++;
    for (let r = r0 + dr, col = c0 + dc; r >= 0 && r < n && col >= 0 && col < n && b[r * n + col] === c; r += dr, col += dc) hi++;
    RLO = lo;
    RHI = hi;
    return lo + hi + 1;
  }

  // would a stone of colour c on (empty) point i make five?
  function makesFive(st, i, c) {
    for (let d = 0; d < 4; d++) if (isFive(st, runLen(st, i, c, d))) return true;
    return false;
  }

  // the five (or more) through i, as a list of points from one end to the other, or null
  function fiveLine(st, i, c) {
    for (let d = 0; d < 4; d++) {
      const len = runLen(st, i, c, d);
      if (!isFive(st, len)) continue;
      const out = [];
      for (let k = -RLO; k <= RHI; k++) out.push(step(st, i, d, k));
      return out;
    }
    return null;
  }

  // a stone of colour c next to i (any of the 8 neighbours)?
  function touches(st, i, c) {
    const n = st.n, r = (i / n) | 0, col = i % n, b = st.board;
    for (let dr = -1; dr <= 1; dr++) {
      const rr = r + dr;
      if (rr < 0 || rr >= n) continue;
      for (let dc = -1; dc <= 1; dc++) {
        const cc = col + dc;
        if ((dr || dc) && cc >= 0 && cc < n && b[rr * n + cc] === c) return true;
      }
    }
    return false;
  }

  // every empty point where colour c would make five (a five always touches one of its own stones)
  function winCells(st, c) {
    const out = [], b = st.board;
    for (let i = 0; i < b.length; i++) if (b[i] === 0 && touches(st, i, c) && makesFive(st, i, c)) out.push(i);
    return out;
  }

  // the empty points within `dist` of a stone (the only sensible moves); the middle on an empty board
  function candidates(st, dist = 2) {
    const n = st.n, b = st.board, near = new Uint8Array(n * n), out = [];
    let any = false;
    for (let i = 0; i < b.length; i++) {
      if (!b[i]) continue;
      any = true;
      const r = (i / n) | 0, c = i % n;
      for (let rr = Math.max(0, r - dist); rr <= Math.min(n - 1, r + dist); rr++) {
        for (let cc = Math.max(0, c - dist); cc <= Math.min(n - 1, c + dist); cc++) near[rr * n + cc] = 1;
      }
    }
    const mid = ((n / 2) | 0) * n + ((n / 2) | 0);
    if (!any) return [mid];
    for (let i = 0; i < b.length; i++) if (near[i] && !b[i]) out.push(i);
    if (!out.length) for (let i = 0; i < b.length; i++) if (!b[i]) out.push(i);
    return out;
  }

  // ---------------------------------------------------------------- playing

  // Put a stone for the side to move on point i. Returns what happened, or null if it can't go there.
  function play(st, i) {
    if (!isLegal(st, i)) return null;
    const c = st.turn;
    st.board[i] = c;
    st.moves.push(i);
    const ev = { cell: i, color: c, win: false, line: null, full: false };
    const line = fiveLine(st, i, c);
    if (line) {
      st.over = true;
      st.winner = c;
      st.line = ev.line = line;
      ev.win = true;
    } else if (st.moves.length >= st.board.length && !st.noDraw) {
      st.over = true;
      st.winner = 0;
      ev.full = true;
    }
    st.turn = other(c);
    return ev;
  }

  // Take the last stone back: it's that stone's side to move again. Returns the point, or -1 on an empty board.
  function undo(st) {
    if (!st.moves.length) return -1;
    const i = st.moves.pop();
    st.turn = st.board[i];
    st.board[i] = 0;
    st.over = false;
    st.winner = 0;
    st.line = null;
    return i;
  }

  // ---------------------------------------------------------------- shapes

  // With a stone of colour c already on m: how many empty points along d (within 4 of m) would make a five that
  // includes m. 2 or more is an open four: it can't be stopped.
  function winsThrough(st, m, c, d) {
    let count = 0;
    for (let k = -4; k <= 4; k++) {
      if (!k) continue;
      const e = step(st, m, d, k);
      if (e < 0 || st.board[e]) continue;
      const len = runLen(st, e, c, d);
      if (isFive(st, len) && (k < 0 ? RHI >= -k : RLO >= k)) count++;
    }
    return count;
  }

  // What a stone of colour c on empty point m makes, counting directions: fives, open fours (two ways to five in
  // one line), fours (one way) and open threes (one more stone in that line makes an open four).
  function shape(st, m, c) {
    const b = st.board;
    b[m] = c;
    let fives = 0, open4 = 0, fours = 0, threes = 0;
    for (let d = 0; d < 4; d++) {
      if (isFive(st, runLen(st, m, c, d))) {
        fives++;
        continue;
      }
      // a four needs 3 more of c's stones within 4 of m along this line, a three 2
      let mine = 0;
      for (let k = -4; k <= 4; k++) {
        const e = k ? step(st, m, d, k) : -1;
        if (e >= 0 && b[e] === c) mine++;
      }
      if (mine < 2) continue;
      const w = mine >= 3 ? winsThrough(st, m, c, d) : 0;
      if (w >= 2) open4++;
      else if (w === 1) fours++;
      else {
        for (let k = -4; k <= 4; k++) {
          const e = k ? step(st, m, d, k) : -1;
          if (e < 0 || b[e]) continue;
          b[e] = c;
          const w2 = winsThrough(st, m, c, d);
          b[e] = 0;
          if (w2 >= 2) {
            threes++;
            break;
          }
        }
      }
    }
    b[m] = 0;
    return { fives, open4, fours, threes };
  }

  // how strong a shape is: 6 five, 5 two ways to five (wins next move), 4 four-three, 3 three-three, 2 four, 1 three
  function level(s) {
    if (s.fives) return 6;
    if (s.open4 || s.fours >= 2) return 5;
    if (s.fours && s.threes) return 4;
    if (s.threes >= 2) return 3;
    if (s.fours) return 2;
    if (s.threes) return 1;
    return 0;
  }

  // Lines that could still become a five through m for colour c: every five-long stretch through m with none of the
  // other side's stones in it, scored by how many of c's stones it already has.
  const WIN_W = [1, 5, 32, 210, 1300];
  function windowScore(st, m, c) {
    const b = st.board, o = other(c);
    let score = 0;
    for (let d = 0; d < 4; d++) {
      for (let s = -4; s <= 0; s++) {
        let cnt = 0, ok = true;
        for (let k = s; k <= s + 4; k++) {
          if (!k) continue;
          const e = step(st, m, d, k);
          if (e < 0 || b[e] === o) {
            ok = false;
            break;
          }
          if (b[e] === c) cnt++;
        }
        if (ok) score += WIN_W[cnt];
      }
    }
    return score;
  }

  // ---------------------------------------------------------------- the CPU

  const ATT = [0, 900, 3000, 12000, 30000, 200000, 1e7]; // making a shape, by level
  const DEF = [0, 700, 2600, 9000, 20000, 90000, 5e6]; // taking the point where the other side would make it

  const pickOne = (list, rng) => list[Math.floor(rng() * list.length)];

  // The CPU's move for the side to move, with why: { cell, kind } where kind is win, block (a four), attack (two
  // ways to five), defend (an open three), build. level: 'easy' | 'normal'; 'hint' is Normal that never slips.
  // The checks' sabotage levels: 'blind' never looks at the other side's stones, 'weak' is Easy.
  function decide(st, lvl = 'normal', rng = Math.random) {
    if (lvl === 'easy' || lvl === 'weak') return easyMove(st, rng);
    const me = st.turn, op = other(me), blind = lvl === 'blind';
    const mine = winCells(st, me);
    if (mine.length) return { cell: pickOne(mine, rng), kind: 'win' };
    const cand = candidates(st);
    if (!cand.length) return { cell: -1, kind: 'none' };
    const slip = lvl === 'normal' && rng() < NORMAL.slip; // this turn it doesn't see forks coming
    const info = cand.map((m) => {
      const a = level(shape(st, m, me)), d = blind ? 0 : level(shape(st, m, op));
      const n2 = (st.n - 1) / 2, r = (m / st.n) | 0, c = m % st.n;
      const centre = (st.n - Math.max(Math.abs(r - n2), Math.abs(c - n2))) * 3;
      const defW = slip && d <= 4 ? 0.25 : 1;
      const v = ATT[a] + DEF[d] * defW + windowScore(st, m, me) + (blind ? 0 : 0.8 * windowScore(st, m, op)) + centre;
      return { m, a, d, v: v * (1 + 0.03 * rng()) };
    });
    const best = (list) => list.reduce((x, y) => (y.v > x.v ? y : x)).m;
    if (!blind) {
      const theirs = winCells(st, op);
      if (theirs.length) {
        const set = info.filter((x) => theirs.includes(x.m));
        return { cell: set.length ? best(set) : theirs[0], kind: 'block' };
      }
    }
    const win2 = info.filter((x) => x.a === 5);
    if (win2.length) return { cell: best(win2), kind: 'attack' };
    // the other side can make an open four next: stop it, unless we have a four-three that wins first
    const danger = blind ? [] : info.filter((x) => x.d === 5).map((x) => x.m);
    if (danger.length) {
      for (const x of info.filter((y) => y.a === 4).sort((p, q) => q.v - p.v)) {
        if (fourThreeWins(st, x.m, me)) return { cell: x.m, kind: 'attack' };
      }
      const safe = info.filter((x) => stops(st, x.m, me, danger));
      if (safe.length) return { cell: best(safe), kind: 'defend' };
    }
    return { cell: best(info), kind: 'build' };
  }

  // after colour c plays m, can the other side still make two ways to five at any of `danger`?
  function stops(st, m, c, danger) {
    const op = other(c);
    st.board[m] = c;
    let ok = true;
    for (const e of danger) {
      if (e !== m && level(shape(st, e, op)) >= 5) {
        ok = false;
        break;
      }
    }
    st.board[m] = 0;
    return ok;
  }

  // c's four-three at m: the four forces the block, and the block doesn't give the other side a four of its own
  function fourThreeWins(st, m, c) {
    st.board[m] = c;
    const forced = winCells(st, c);
    let ok = forced.length === 1 && level(shape(st, forced[0], other(c))) < 2;
    if (ok) {
      st.board[forced[0]] = other(c);
      ok = candidates(st).some((e) => level(shape(st, e, c)) >= 5);
      st.board[forced[0]] = 0;
    }
    st.board[m] = 0;
    return ok;
  }

  // a four with the gap at one end (four stones side by side): the one Easy always sees
  function obviousFour(st, e, c) {
    for (let d = 0; d < 4; d++) {
      const len = runLen(st, e, c, d);
      if (isFive(st, len) && (RLO === 0 || RHI === 0)) return true;
    }
    return false;
  }

  function easyMove(st, rng) {
    const me = st.turn, op = other(me);
    const mine = winCells(st, me);
    if (mine.length && rng() < EASY.win) return { cell: pickOne(mine, rng), kind: 'win' };
    const theirs = winCells(st, op);
    if (theirs.length) {
      const obvious = theirs.filter((e) => obviousFour(st, e, op));
      if (obvious.length) return { cell: pickOne(obvious, rng), kind: 'block' };
      if (rng() < EASY.broken) return { cell: pickOne(theirs, rng), kind: 'block' };
    }
    const near = candidates(st, 1);
    if (!near.length) return { cell: -1, kind: 'none' };
    if (rng() < EASY.wander) return { cell: pickOne(near, rng), kind: 'build' };
    // its own lines, roughly, with lots of noise and only a glance at yours
    let cell = -1, top = -1;
    for (const m of candidates(st)) {
      const v = (windowScore(st, m, me) + EASY.care * windowScore(st, m, op)) * (0.4 + rng());
      if (v > top) {
        top = v;
        cell = m;
      }
    }
    return { cell, kind: 'build' };
  }

  const cpuMove = (st, lvl, rng) => (st.over ? -1 : decide(st, lvl, rng).cell);

  // Your brother's tip for the side to move: the five, else the block of the CPU's four, else Normal's best move
  // (which stops an open three when there is one). { cell, kind: 'win' | 'block' | 'here' }
  function hint(st, rng = Math.random) {
    if (st.over) return null;
    const d = decide(st, 'hint', rng);
    if (d.cell < 0) return null;
    return { cell: d.cell, kind: d.kind === 'win' ? 'win' : d.kind === 'block' || d.kind === 'defend' ? 'block' : 'here' };
  }

  // the other side's open-four points: where colour c could make two ways to five next move
  const threes = (st, c) => candidates(st).filter((m) => level(shape(st, m, c)) >= 5);

  // How dangerous colour c is right now: 'four' (it can make five next move), 'three' (an open four), or null.
  function threat(st, c) {
    if (winCells(st, c).length) return 'four';
    return threes(st, c).length ? 'three' : null;
  }

  // What the side to move's stone on i does, for the cheers: win, block (a four or an open three), super (a fork:
  // two ways to five, four-three or three-three), four, three, or null.
  function judge(st, i) {
    const c = st.turn, op = other(c);
    if (!isLegal(st, i)) return null;
    if (makesFive(st, i, c)) return 'win';
    if (winCells(st, op).includes(i)) return 'block';
    const lv = level(shape(st, i, c));
    if (lv >= 3) return 'super';
    const before = threes(st, op);
    if (before.length && stops(st, i, c, before)) return 'block';
    return lv === 2 ? 'four' : lv === 1 ? 'three' : null;
  }

  GMK.rules = {
    B, W, other, SIZES, EASY, NORMAL, newGame, clone, isLegal, play, undo, winCells, candidates, makesFive, fiveLine,
    shape, level, windowScore, decide, cpuMove, hint, threat, threes, judge, obviousFour,
  };
})(typeof window !== 'undefined' ? window : globalThis);
