/* TT Gomoku: the headless checks, on the same rules and CPU the game plays with (js/rules.js). No page needed:
   game.check() runs them in the browser and `node tools/check.js` in a terminal.

   legal     every move either CPU level picks is on an empty point of the board, while the game is on.
   blocks    🔥 NORMAL always takes its own five, and otherwise always blocks a four (an open four too: it plays one
             of the two ends, even though the other end still wins). And it always stops an open three when one
             move can, unless it makes two ways to five of its own. Checked at every one of its moves in the games
             below, and on made-up boards with an open four or an open three in every direction, on every size.
   ends      every game ends, with a five or a full board (a draw), by move n x n.
   strength  🔥 NORMAL beats 🐣 EASY most of the time, on every board size and with both rules (at least STRONG).
   hint      your brother's tip takes your five when there is one, and otherwise blocks the CPU's four.
   Sabotage, to prove the checks can fail:
     { sabotage: 'blind' }   NORMAL never looks at the other side's stones -> fours and threes go unblocked
     { sabotage: 'nodraw' }  a full board isn't the end -> the game is stuck with nowhere to play
     { sabotage: 'weak' }    NORMAL plays like EASY -> it no longer beats EASY most of the time */
(function (root) {
  'use strict';
  const GMK = (root.GMK = root.GMK || {});
  const R = GMK.rules;
  const { B, W, other } = R;
  const STRONG = 0.8;

  // a small seeded random-number generator, so a run can be repeated
  function rngFrom(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pickOne = (list, rng) => (list.length ? list[Math.floor(rng() * list.length)] : -1);

  // build: the best of its own lines by the window score, with noise; care is how much it minds yours
  function build(st, rng, care, noise) {
    let cell = -1, top = -1;
    for (const m of R.candidates(st)) {
      const v = (R.windowScore(st, m, st.turn) + care * R.windowScore(st, m, other(st.turn))) * (1 - noise + 2 * noise * rng());
      if (v > top) {
        top = v;
        cell = m;
      }
    }
    return cell;
  }

  // the test bots: each returns a point for the side to move
  const BOTS = {
    random: (st, rng) => pickOne(R.candidates(st, 1), rng),
    easy: (st, rng) => R.cpuMove(st, 'easy', rng),
    normal: (st, rng) => R.cpuMove(st, 'normal', rng),
    // like an 8-year-old: sees its own five, usually blocks a four, stops an open three half the time
    kid: (st, rng) => {
      const mine = R.winCells(st, st.turn);
      if (mine.length && rng() < 0.9) return pickOne(mine, rng);
      const theirs = R.winCells(st, other(st.turn));
      if (theirs.length && rng() < 0.85) return pickOne(theirs, rng);
      if (rng() < 0.5) {
        const t = R.threes(st, other(st.turn));
        if (t.length) return pickOne(t, rng);
      }
      if (rng() < 0.1) return pickOne(R.candidates(st, 1), rng);
      return build(st, rng, 0.5, 0.4);
    },
    // like a 5-year-old: puts stones in a row, sometimes spots a five, now and then blocks four in a row
    little: (st, rng) => {
      const mine = R.winCells(st, st.turn);
      if (mine.length && rng() < 0.7) return pickOne(mine, rng);
      const theirs = R.winCells(st, other(st.turn)).filter((e) => R.obviousFour(st, e, other(st.turn)));
      if (theirs.length && rng() < 0.4) return pickOne(theirs, rng);
      if (rng() < 0.3) return pickOne(R.candidates(st, 1), rng);
      return build(st, rng, 0.1, 0.6);
    },
    // careful: never misses a five, a four or an open three, otherwise builds
    careful: (st, rng) => {
      const mine = R.winCells(st, st.turn);
      if (mine.length) return mine[0];
      const theirs = R.winCells(st, other(st.turn));
      if (theirs.length) return pickOne(theirs, rng);
      const t = R.threes(st, other(st.turn));
      if (t.length) return pickOne(t, rng);
      return build(st, rng, 0.8, 0.2);
    },
  };

  // after Normal (colour c) played: does the other side still have an open-four point, and did Normal answer?
  function answeredThree(after, c) {
    if (R.winCells(after, c).length >= 2) return true; // two ways to five of its own
    if (R.winCells(after, c).length === 1) return true; // a four: the other side has to block it first
    return R.threes(after, other(c)).length === 0;
  }
  // can one move of colour c stop all the other side's open-four points?
  // (a stone can only take the other side's points away, never make new ones, so only those points need a look)
  function threeStoppable(st, c) {
    const op = other(c), danger = R.threes(st, op);
    if (!danger.length) return false;
    return R.candidates(st).some((m) => {
      st.board[m] = c;
      const ok = danger.every((e) => e === m || R.level(R.shape(st, e, op)) < 5);
      st.board[m] = 0;
      return ok;
    });
  }

  // One game between two bots. `normal` names the bots whose moves are checked by the blocks rule (and `sabotage`
  // changes what Normal and the rules do). Returns the result and what the checks saw.
  function playGame(black, white, n, exact, first, rng, opts = {}) {
    const st = R.newGame(n, { exact, first, noDraw: opts.sabotage === 'nodraw' });
    const r = { winner: 0, moves: 0, ended: false, illegal: 0, cpuMoves: 0, blockTests: 0, blockMiss: 0, threeTests: 0, threeMiss: 0, hintTests: 0, hintMiss: 0, examples: [] };
    const bots = { [B]: black, [W]: white };
    for (let guard = 0; guard < n * n + 20 && !st.over; guard++) {
      let name = bots[st.turn];
      const isNormal = name === 'normal';
      if (isNormal && opts.sabotage === 'blind') name = 'blind';
      if (isNormal && opts.sabotage === 'weak') name = 'weak';
      const c = st.turn;
      const mine = isNormal ? R.winCells(st, c) : null, theirs = isNormal ? R.winCells(st, other(c)) : null;
      const three = isNormal && !mine.length && !theirs.length && opts.threes && threeStoppable(st, c);
      // your brother's tip, for the kid's side
      if (opts.hints && !isNormal && name !== 'easy') {
        const h = R.hint(st, rng);
        const myFive = R.winCells(st, c), cpuFive = R.winCells(st, other(c));
        if (myFive.length || cpuFive.length) {
          r.hintTests++;
          const ok = h && (myFive.length ? R.makesFive(st, h.cell, c) && h.kind === 'win' : cpuFive.includes(h.cell) && h.kind === 'block');
          if (!ok) r.hintMiss++;
        }
      }
      const i = BOTS[name] ? BOTS[name](st, rng) : R.cpuMove(st, name, rng);
      if (i < 0 && !st.board.includes(0)) break; // nowhere to play and not over: stuck (the nodraw sabotage)
      if (name === 'easy' || name === 'normal' || name === 'blind' || name === 'weak') {
        r.cpuMoves++;
        if (!R.isLegal(st, i)) {
          r.illegal++;
          if (r.examples.length < 3) r.examples.push({ illegal: i, board: st.board.join('') });
          break;
        }
      }
      if (isNormal && (mine.length || theirs.length)) {
        r.blockTests++;
        const ok = mine.length ? R.makesFive(st, i, c) : theirs.includes(i);
        if (!ok) {
          r.blockMiss++;
          if (r.examples.length < 3) r.examples.push({ missed: mine.length ? 'its own five' : 'a four', n, board: st.board.join(''), played: i, wanted: mine.length ? mine : theirs });
        }
      }
      R.play(st, i);
      if (three) {
        r.threeTests++;
        if (!answeredThree(st, c)) {
          r.threeMiss++;
          if (r.examples.length < 3) r.examples.push({ missed: 'an open three', n, board: st.board.join(''), played: i });
        }
      }
    }
    r.moves = st.moves.length;
    r.ended = st.over;
    r.winner = st.winner;
    return r;
  }

  // Made-up boards: a few random stones, then an open four (or an open three) for the other side, in a random
  // direction and place. Normal must block the four / stop the three.
  function madeUp(kind, n, exact, rng, sabotage) {
    const lvl = sabotage === 'blind' ? 'blind' : sabotage === 'weak' ? 'weak' : 'normal';
    for (let tries = 0; tries < 200; tries++) {
      const me = rng() < 0.5 ? B : W, op = other(me);
      const st = R.newGame(n, { exact, first: me });
      const len = kind === 'four' ? 4 : 3;
      const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
      const [dc, dr] = dirs[Math.floor(rng() * 4)];
      const r0 = Math.floor(rng() * n), c0 = Math.floor(rng() * n);
      const pts = [];
      for (let k = -2; k < len + 2; k++) {
        const r = r0 + dr * k, c = c0 + dc * k;
        if (r < 0 || r >= n || c < 0 || c >= n) break;
        pts.push(r * n + c);
      }
      if (pts.length < len + 4) continue;
      pts.slice(2, 2 + len).forEach((i) => (st.board[i] = op));
      // some scattered stones, kept off that line, the same number for both sides
      const extra = Math.floor(rng() * 7);
      for (let k = 0; k < extra * 2; k++) {
        const i = Math.floor(rng() * n * n);
        if (!st.board[i] && !pts.includes(i)) st.board[i] = k % 2 ? op : me;
      }
      st.moves = st.board.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
      // what this board must be: no fives anywhere, the CPU has no four, and the shape is really there
      if (st.board.some((v, i) => v && R.fiveLine(st, i, v))) continue;
      if (R.winCells(st, me).length) continue;
      const fours = R.winCells(st, op);
      if (kind === 'four' && fours.length < 2) continue;
      if (kind === 'three' && (fours.length || !threeStoppable(st, me))) continue;
      if (kind === 'three' && R.candidates(st).some((m) => R.level(R.shape(st, m, me)) >= 2)) continue; // no four of its own to make first
      const i = R.cpuMove(st, lvl, rng);
      const before = st.board.join('');
      let ok;
      if (kind === 'four') ok = fours.includes(i);
      else {
        R.play(st, i);
        ok = answeredThree(st, me);
      }
      return { ok, board: before, played: i, n };
    }
    return null;
  }

  function check(opts = {}) {
    const rng = rngFrom(opts.seed !== undefined ? opts.seed : 20261018);
    const games = opts.games || 24; // per pairing, size and rule
    const sab = opts.sabotage;
    const out = { ok: true, sabotage: sab || null, legal: {}, blocks: {}, ends: {}, strength: {}, hint: {}, failures: [] };
    const tally = { games: 0, ended: 0, longest: 0, draws: 0, cpuMoves: 0, illegal: 0, blockTests: 0, blockMiss: 0, threeTests: 0, threeMiss: 0, hintTests: 0, hintMiss: 0 };
    const examples = [];
    const add = (r) => {
      tally.games++;
      if (r.ended) tally.ended++;
      if (r.ended && !r.winner) tally.draws++;
      tally.longest = Math.max(tally.longest, r.moves);
      for (const k of ['cpuMoves', 'illegal', 'blockTests', 'blockMiss', 'threeTests', 'threeMiss', 'hintTests', 'hintMiss']) tally[k] += r[k];
      if (r.examples.length && examples.length < 4) examples.push(...r.examples);
    };
    const PAIRS = [['normal', 'easy'], ['normal', 'kid'], ['normal', 'careful'], ['easy', 'little'], ['easy', 'random'], ['kid', 'little']];
    for (const n of R.SIZES) {
      for (const exact of [false, true]) {
        const key = `${n}x${n}${exact ? ' exact' : ''}`;
        let nWins = 0, eWins = 0, draws = 0;
        for (const [a, b] of PAIRS) {
          const count = a === 'normal' && b === 'easy' ? games * 2 : Math.ceil(games / 2);
          for (let g = 0; g < count; g++) {
            // swap colours every other game, and who goes first every game
            const [black, white] = g % 2 ? [b, a] : [a, b];
            const first = (g >> 1) % 2 ? W : B;
            const r = playGame(black, white, n, exact, first, rng, { sabotage: sab, threes: a === 'normal', hints: a === 'normal' && b === 'kid' });
            add(r);
            if (a === 'normal' && b === 'easy') {
              const normalColour = black === 'normal' ? B : W;
              if (r.winner === normalColour) nWins++;
              else if (r.winner) eWins++;
              else draws++;
            }
          }
        }
        const tot = nWins + eWins + draws;
        out.strength[key] = { games: tot, normalWins: nWins, easyWins: eWins, draws, rate: +(nWins / tot).toFixed(3) };
      }
    }
    // the made-up boards
    const made = { four: { tests: 0, miss: 0 }, three: { tests: 0, miss: 0 } };
    const madeEach = opts.madeUp || 40;
    for (const kind of ['four', 'three']) {
      for (const n of R.SIZES) {
        for (const exact of [false, true]) {
          for (let k = 0; k < madeEach; k++) {
            const r = madeUp(kind, n, exact, rng, sab);
            if (!r) continue;
            made[kind].tests++;
            if (!r.ok) {
              made[kind].miss++;
              if (examples.length < 6) examples.push({ madeUp: kind, n, board: r.board, played: r.played });
            }
          }
        }
      }
    }
    out.legal = { cpuMoves: tally.cpuMoves, illegal: tally.illegal };
    out.blocks = {
      inGames: { tests: tally.blockTests, missed: tally.blockMiss },
      openThreesInGames: { tests: tally.threeTests, missed: tally.threeMiss },
      madeUpFours: made.four, madeUpThrees: made.three,
    };
    out.ends = { games: tally.games, ended: tally.ended, draws: tally.draws, longest: tally.longest };
    out.hint = { tests: tally.hintTests, missed: tally.hintMiss };
    const all = Object.values(out.strength).reduce((s, x) => ({ g: s.g + x.games, w: s.w + x.normalWins }), { g: 0, w: 0 });
    out.strength.overall = { games: all.g, rate: +(all.w / all.g).toFixed(3), needed: STRONG };
    const fail = (why) => {
      out.ok = false;
      out.failures.push(why);
    };
    if (tally.illegal) fail(`legal: ${tally.illegal} illegal CPU moves`);
    if (tally.blockMiss) fail(`blocks: Normal missed ${tally.blockMiss} of ${tally.blockTests} fives / fours in games`);
    if (tally.threeMiss) fail(`blocks: Normal left ${tally.threeMiss} of ${tally.threeTests} open threes in games`);
    if (made.four.miss) fail(`blocks: Normal missed ${made.four.miss} of ${made.four.tests} made-up open fours`);
    if (made.three.miss) fail(`blocks: Normal left ${made.three.miss} of ${made.three.tests} made-up open threes`);
    if (!made.four.tests || !made.three.tests || !tally.blockTests) fail('blocks: nothing was tested');
    if (tally.ended < tally.games) fail(`ends: ${tally.games - tally.ended} of ${tally.games} games never ended`);
    if (tally.longest > R.SIZES[R.SIZES.length - 1] ** 2) fail(`ends: a game ran to ${tally.longest} moves`);
    if (all.w / all.g < STRONG) fail(`strength: Normal beat Easy in ${((100 * all.w) / all.g).toFixed(0)}% of games (needs ${STRONG * 100}%)`);
    if (tally.hintMiss) fail(`hint: missed ${tally.hintMiss} of ${tally.hintTests}`);
    if (!tally.hintTests) fail('hint: nothing was tested');
    if (examples.length) out.examples = examples;
    return out;
  }

  // Win rates of the kids' test bots against both levels: how EASY and NORMAL were tuned. Not a pass or fail check.
  function rates(games = 100, sizes = R.SIZES) {
    const rng = rngFrom(7);
    const out = {};
    for (const bot of ['little', 'kid', 'careful', 'random']) {
      for (const lvl of ['easy', 'normal']) {
        for (const n of sizes) {
          let w = 0, l = 0, d = 0;
          for (let g = 0; g < games; g++) {
            const [black, white] = g % 2 ? [lvl, bot] : [bot, lvl];
            const r = playGame(black, white, n, false, (g >> 1) % 2 ? W : B, rng);
            const botColour = black === bot ? B : W;
            if (r.winner === botColour) w++;
            else if (r.winner) l++;
            else d++;
          }
          out[`${bot} vs ${lvl} ${n}x${n}`] = `${Math.round((100 * w) / games)}% won, ${Math.round((100 * l) / games)}% lost, ${d} draws`;
        }
      }
    }
    return out;
  }

  GMK.check = check;
  GMK.rates = rates;
  GMK.bots = BOTS;
  GMK.playGame = playGame;
})(typeof window !== 'undefined' ? window : globalThis);
