/* TT Gomoku: the menu, the games, the HUD, input and the main loop.
   Screens: home (pick the board, 1 or 2 players, who you are, the level, undo on or off, EXACTLY 5), play, game
   over, pause. Each game is one game of five in a row, and the score keeps running from game to game for the same
   two players (until the page is closed). Who goes first swaps every game; you (or Teddy, in 2 players) start.
   In 1 player you're Teddy (black) or Tommy (white) against a CPU friend: 🐣 EASY is Bruno the bear, 🔥 NORMAL is
   Bolt the robot. Your brother isn't the CPU: he's the one you call for help (js/buddy.js).
   window.game is a test hook: see the README. */
(function () {
  'use strict';
  const GMK = window.GMK;
  const R = GMK.rules;
  const ST = GMK.stage;
  const S = Kit.sound;
  const { B, W } = R;
  const $ = (id) => document.getElementById(id);
  const { rand } = Kit.gfx;

  const KEY = 'gomokuTT.v1';
  const CPU = { easy: 'bruno', normal: 'bolt' };

  const prefs = Object.assign({ players: 1, who: 'teddy', level: 'easy', size: 9, exact: false, undo: true }, load());
  const G = {
    state: 'boot', players: 1, level: 'easy', size: 9, exact: false, undo: true, sides: null, game: null, starter: B,
    cpuT: -1, waitT: -1, turnId: 0, endT: -1, endEv: null, panelT: -1, cursor: -1, hover: -1, press: null, held: false,
    last: 0, auto: false, autoLevel: 'normal', demo: null, lockT: 0, nudge: false, scores: {}, key: '', undos: 0, games: 0,
  };
  const actors = [GMK.makeActor(), GMK.makeActor()];
  const badges = [];
  let ui = null, flyers = null, bursts = null, spots = null, art = null;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch (e) { /* private mode */ }
  }

  // ---------------------------------------------------------------- who's at the board

  const nameOf = (id) => Kit.roster.get(id).name;
  const colourOf = (id) => (id === 'tommy' ? W : B);
  // sides[0] is on the left (you, or Teddy in 2 players), sides[1] on the right
  function makeSides(players, who) {
    if (players === 2) return [{ id: 'teddy', color: B, human: true }, { id: 'tommy', color: W, human: true }];
    const mine = colourOf(who);
    return [{ id: who, color: mine, human: true }, { id: CPU[G.level], color: R.other(mine), human: false }];
  }
  const sideOf = (color) => G.sides.find((s) => s.color === color);
  const current = () => (G.game ? sideOf(G.game.turn) : null);
  const kid = () => G.sides[0];
  const score = () => (G.scores[G.key] = G.scores[G.key] || { [B]: 0, [W]: 0 });

  function setActors() {
    G.sides.forEach((s, k) => {
      const a = actors[k];
      if (!a.entry || a.entry.id !== s.id) a.set(s.id, 1);
      s.actor = a;
      a.visible = true;
      setBadge(k, s.color);
    });
    GMK.buddy.setFor(kid().id);
  }

  // the stone that bobs over the head of whoever's turn it is
  function stoneTexture(color) {
    const [c, g] = Kit.gfx.makeCanvas(128, 128);
    const grad = g.createRadialGradient(46, 40, 6, 64, 64, 60);
    grad.addColorStop(0, color === B ? '#5a7fe0' : '#ffffff');
    grad.addColorStop(0.6, ST.COL[color]);
    grad.addColorStop(1, color === B ? '#0f1f4d' : '#e3cfa2');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(64, 64, 56, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 7;
    g.strokeStyle = '#14121f';
    g.stroke();
    g.font = `52px ${Kit.gfx.EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ST.EMBLEM[color], 64, 68);
    return Kit.gfx.toTexture(c);
  }
  const stoneTex = {};
  function setBadge(k, color) {
    if (!badges[k]) {
      badges[k] = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true }));
      badges[k].renderOrder = 23;
      badges[k].scale.setScalar(0.62);
      ST.scene.add(badges[k]);
    }
    stoneTex[color] = stoneTex[color] || stoneTexture(color);
    badges[k].material.map = stoneTex[color];
    badges[k].material.needsUpdate = true;
  }

  // ---------------------------------------------------------------- layout

  // Where everyone stands, for this screen shape. Wide: the two players either side of the board. Tall: behind it.
  function makeSpots(wide) {
    const H2 = ST.HALF;
    if (wide) {
      return {
        wide,
        sides: [{ x: -(H2 + 0.8), z: -0.35, face: Math.PI + 0.45 }, { x: H2 + 0.8, z: -0.35, face: Math.PI - 0.45 }],
        bowls: [{ x: -(H2 + 0.9), z: H2 - 0.75 }, { x: H2 + 0.9, z: H2 - 0.75 }],
        buddy: { x: -(H2 + 0.75), z: -(H2 - 0.75), face: Math.PI + 0.6 },
        meet: [{ x: -0.8, z: -(H2 + 0.8) }, { x: 0.8, z: -(H2 + 0.8) }],
      };
    }
    return {
      wide,
      sides: [{ x: -1.7, z: -(H2 + 0.85), face: Math.PI + 0.12 }, { x: 1.7, z: -(H2 + 0.85), face: Math.PI - 0.12 }],
      bowls: [{ x: -2.75, z: -(H2 + 0.55) }, { x: 2.75, z: -(H2 + 0.55) }],
      buddy: { x: 0, z: -(H2 + 1.45), face: Math.PI },
      meet: [{ x: -0.7, z: -(H2 + 0.85) }, { x: 0.7, z: -(H2 + 0.85) }],
    };
  }

  function layout() {
    ST.resize();
    GMK.fx.overlay.resize();
    const Wd = ST.W, Ht = ST.H;
    if (Wd < 2 || Ht < 2) return;
    const wide = Wd / Ht >= 1.15;
    spots = makeSpots(wide);
    const V = THREE.Vector3, h = ST.HALF, pts = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push(new V(sx * h, sz > 0 ? ST.TOP * 0.45 : ST.TOP, sz * h), new V(sx * h, ST.TOP, sz * h));
    const people = spots.sides.concat(G.state === 'home' ? [] : [spots.buddy]);
    for (const s of people) pts.push(new V(s.x - 0.55, 0, s.z), new V(s.x + 0.55, 0, s.z), new V(s.x, s === spots.buddy ? 2.2 : 2.9, s.z));
    // the kit's round ? and language buttons sit on the left edge: keep the board and the boys clear of them
    const kitL = 62;
    const m = { l: kitL, r: 14, t: 14, b: 14 };
    if (!wide && G.state !== 'home') m.l = m.r = 8; // in a game on a tall screen they're down in the bottom left corner
    if (G.state === 'home') {
      if (wide) m.r = Wd * 0.56 + 10;
      else {
        m.b = Ht * 0.64 + 6;
        m.t = 8;
      }
    } else {
      const top = ui.hudtop.getBoundingClientRect(), mid = ui.hudmid.getBoundingClientRect();
      m.t = top.bottom + 8;
      if (getComputedStyle(ui.hudmid).position === 'fixed') {
        // a phone on its side: the score is a column on the right, the buttons a column on the left
        m.t = 8;
        m.r = Wd - mid.left + 6;
      }
      if (!wide) m.b = Math.min(Ht * 0.13, 120);
    }
    ST.fit(pts, wide ? 1.2 : 1.2, m);
    spots.bowls.forEach((b, k) => ST.bowl(k, b.x, b.z));
    G.sides && G.sides.forEach((s, k) => {
      const sp = spots.sides[k];
      s.actor.faceDefault = sp.face;
      if (!GMK.highFive.on) s.actor.place(sp.x, 0, sp.z);
    });
  }

  // ---------------------------------------------------------------- the games

  function startMatch(opts = {}) {
    gesture();
    for (const k of ['players', 'level', 'size', 'exact', 'undo', 'who']) if (opts[k] !== undefined) prefs[k] = opts[k];
    save();
    Object.assign(G, { players: prefs.players, level: prefs.level, size: prefs.size, exact: prefs.exact, undo: prefs.undo });
    G.sides = makeSides(G.players, prefs.who);
    G.key = G.sides.map((s) => s.id).join('|');
    setActors();
    G.starter = kid().color;
    show(ui.home, false);
    show(ui.hud, true);
    show(ui.callBtn, true);
    show(ui.over, false);
    document.body.dataset.screen = 'play';
    G.state = 'play';
    G.demo = null;
    GMK.highFive.cancel();
    setupHud();
    layout();
    S.music('title');
    startGame();
  }

  function startGame() {
    G.game = R.newGame(G.size, { exact: G.exact, first: G.starter });
    Object.assign(G, { endT: -1, endEv: null, cpuT: -1, waitT: -1, lockT: 0, nudge: false, panelT: -1, cursor: -1, hover: -1, press: null });
    ST.setSize(G.size);
    ST.hint(-1);
    ST.last(-1);
    ST.hover(-1);
    ST.cursor(-1);
    GMK.buddy.reset();
    GMK.fx.overlay.clear();
    flyers.clear();
    bursts.clear();
    clearToasts();
    G.sides.forEach((s) => {
      s.actor.react('idle');
      s.actor.drop();
    });
    G.state = 'play';
    show(ui.over, false);
    show(ui.pause, false);
    renderScore();
    beginTurn();
  }

  function beginTurn() {
    G.turnId++;
    const s = current();
    if (!s.human) {
      G.cpuT = rand(0.7, 1.15);
      s.actor.act('think', G.cpuT + 0.2, 0, true);
      GMK.sfx.think(s.id === 'bolt');
      const p = s.actor.root.position;
      flyers.add('🤔', p.x, 2.9, p.z, 0, 0.3, 0.6, G.cpuT, 0, 0);
    } else if (G.auto) G.cpuT = 0.3;
    updateTurnText();
    updateUndo();
  }

  // A point was chosen for the side to move. Returns false if a stone can't go there.
  function move(i, byKid) {
    const st = G.game;
    if (!st || st.over || G.state !== 'play' || G.lockT > 0) return false;
    if (!R.isLegal(st, i)) {
      if (byKid) GMK.sfx.nope();
      return false;
    }
    const s = current();
    const kind = R.judge(st, i);
    const ev = R.play(st, i);
    G.lockT = 0.25;
    G.cpuT = -1;
    ST.place(i, ev.color);
    ST.last(i);
    setTimeout(() => GMK.sfx.place(ev.color), 200);
    if (s.human) {
      ST.hint(-1);
      GMK.buddy.moved();
      G.nudge = false;
    }
    if (s.actor.mode !== 'signature') s.actor.act('give', 0.45, 0, true);
    react(kind, ev, s);
    if (st.over) {
      G.endEv = ev;
      G.endT = 0.5;
    } else {
      G.waitT = 0.4;
      // the CPU just made a four or an open three: your brother's button wiggles ("call me!")
      if (!s.human && G.players === 1 && R.threat(st, s.color)) {
        G.nudge = true;
        setTimeout(() => G.state === 'play' && GMK.sfx.warn(), 450);
      }
    }
    updateTurnText();
    updateUndo();
    return true;
  }

  const WORDS = { block: 'BLOCKED!', super: 'SUPER!', four: 'FOUR!', three: 'NICE!' };
  function react(kind, ev, s) {
    if (!kind || kind === 'win') return;
    if (kind === 'three' && !s.human) return; // threes come often: only the kids get a cheer for one
    const p = ST.cellPos(ev.cell);
    bursts.add(WORDS[kind], p.x, ST.TOP + 0.9, p.z, 1.5, kind === 'four' ? '#b8f5ff' : '#ffd400', kind === 'four' ? '#2f7cf0' : '#e8372c');
    const foe = G.sides.find((o) => o !== s);
    setTimeout(() => {
      if (kind === 'block') GMK.sfx.block();
      else if (kind === 'four') GMK.sfx.four();
      else GMK.sfx.nice();
      s.actor.react('cheer');
      if (kind === 'block' || kind === 'super') foe.actor.react('oops');
    }, 260);
  }

  function endGame() {
    const st = G.game;
    G.starter = R.other(G.starter);
    G.games++;
    const sc = score();
    const win = st.winner ? sideOf(st.winner) : null, lose = win ? G.sides.find((s) => s !== win) : null;
    if (win) {
      sc[st.winner]++;
      ST.win(st.line);
      win.actor.react('signature'); // Teddy's boxing or jump shot (in turn), Tommy's Y with ✌️; the friends wave
      setTimeout(() => lose.actor.react('shrug'), 250);
      const a = ST.toScreen(ST.cellPos(st.line[Math.floor(st.line.length / 2)]));
      if (win.human) {
        GMK.sfx.win();
        GMK.fx.overlay.burst(a.x, a.y, 80, ['⭐', '🎉', win.color === B ? '💙' : '🤍'], 1.2);
        GMK.fx.overlay.rain(120);
      } else GMK.sfx.lose();
      bumpScore(win === G.sides[0] ? ui.scoreL : ui.scoreR);
    } else {
      GMK.sfx.draw();
      G.sides.forEach((s) => s.actor.react('shrug'));
      const p = ST.cellPos(((G.size / 2) | 0) * (G.size + 1));
      for (let i = 0; i < 6; i++) flyers.add('🤝', p.x, ST.TOP + 1, p.z, rand(-2, 2), rand(2, 3.5), 0.6, 1.2, rand(-2, 2), 4);
    }
    G.state = 'ended';
    G.endT = -1;
    G.nudge = false;
    renderScore();
    updateTurnText();
    updateUndo();
    G.panelT = 2.6;
  }

  function showPanel() {
    const st = G.game;
    const win = st.winner ? sideOf(st.winner) : null;
    ui.oFace.innerHTML = win ? `<img alt="" src="${art[win.id]}"><span class="big">🏆</span>` : '<span class="big">🤝</span>';
    ui.oTitle.textContent = win ? `${nameOf(win.id)} WINS!` : 'DRAW!';
    const [a, b] = G.sides, sc = score();
    const chip = (c) => `<i class="chip ${c === B ? 'b' : 'w'}"></i>`;
    ui.oScore.innerHTML = `<img alt="" src="${art[a.id]}">${chip(a.color)}<span>${sc[a.color]}</span><span class="dash">–</span><span>${sc[b.color]}</span>${chip(b.color)}<img alt="" src="${art[b.id]}">`;
    G.state = 'over';
    show(ui.over, true);
    if (win) {
      win.actor.react('over');
      G.sides.find((s) => s !== win).actor.react('sulk');
    }
  }

  function next() {
    gesture();
    if (G.state === 'over' || G.state === 'ended') startGame();
  }

  // R / 🔄: a new game. A game not finished yet doesn't count (and the same side starts again).
  function restartGame() {
    if (!['play', 'paused', 'ended', 'over'].includes(G.state)) return;
    show(ui.pause, false);
    startGame();
    toast('🔄', 'hint');
  }

  // ---------------------------------------------------------------- undo

  // How many stones the undo button takes back now: in 1 player your last stone and the CPU's answer (so it's your
  // turn again), or just yours while the CPU is still thinking; in 2 players the last stone. 0 = nothing to undo.
  function undoCount() {
    const st = G.game;
    if (!G.undo || G.state !== 'play' || !st || st.over || !st.moves.length) return 0;
    if (G.players === 2) return 1;
    if (st.turn !== kid().color) return 1;
    return st.moves.length >= 2 ? 2 : 0;
  }

  function undoMove() {
    gesture();
    const count = undoCount();
    if (!count || G.lockT > 0 || G.endT > 0) {
      if (G.state === 'play') GMK.sfx.nope();
      return false;
    }
    const st = G.game;
    for (let k = 0; k < count; k++) ST.remove(R.undo(st));
    ST.last(st.moves.length ? st.moves[st.moves.length - 1] : -1);
    ST.hint(-1);
    Object.assign(G, { cpuT: -1, waitT: -1, nudge: false, lockT: 0.2 });
    G.undos++;
    GMK.sfx.undo();
    GMK.buddy.repoint();
    current().actor.react('hop');
    toast('↩️ UNDO!', 'hint');
    beginTurn();
    return true;
  }

  function updateUndo() {
    if (!ui) return;
    ui.undoBtn.style.display = G.undo ? '' : 'none';
    ui.undoBtn.classList.toggle('off', !undoCount());
  }

  // ---------------------------------------------------------------- home

  function goHome() {
    G.state = 'home';
    document.body.dataset.screen = 'home';
    show(ui.hud, false);
    show(ui.callBtn, false);
    show(ui.over, false);
    show(ui.pause, false);
    show(ui.home, true);
    GMK.buddy.reset();
    GMK.highFive.cancel();
    ST.hint(-1);
    ST.cursor(-1);
    ST.hover(-1);
    clearToasts();
    GMK.fx.overlay.clear();
    G.sides = [{ id: 'teddy', color: B, human: false }, { id: 'tommy', color: W, human: false }];
    setActors();
    layout();
    G.sides.forEach((s) => s.actor.react('hello'));
    refreshHome();
    demoStart();
    S.music('title');
  }

  // the boys play a slow game behind the menu, on the board you played last
  function demoStart() {
    G.demo = { st: R.newGame(prefs.size, { first: Math.random() < 0.5 ? B : W, exact: prefs.exact }), t: 1.2, end: -1 };
    ST.setSize(prefs.size);
    ST.last(-1);
  }
  function demoUpdate(dt) {
    const d = G.demo;
    if (!d) return;
    d.t -= dt;
    if (d.end >= 0) {
      d.end -= dt;
      if (d.end < 0) demoStart();
      return;
    }
    if (d.t > 0) return;
    const st = d.st;
    const i = R.cpuMove(st, Math.random() < 0.65 ? 'normal' : 'easy');
    if (i < 0) {
      d.end = 2;
      return;
    }
    const ev = R.play(st, i);
    ST.place(i, ev.color);
    ST.last(i);
    setTimeout(() => G.state === 'home' && G.demo === d && GMK.sfx.place(ev.color), 200);
    sideOf(ev.color).actor.act('give', 0.45, 0, true);
    d.t = 0.9;
    if (st.over) {
      d.end = 3.6;
      if (st.winner) {
        setTimeout(() => {
          if (G.state !== 'home' || G.demo !== d) return;
          ST.win(st.line);
          sideOf(st.winner).actor.react('signature');
          sideOf(R.other(st.winner)).actor.react('shrug');
        }, 500);
      }
    }
  }

  function refreshHome() {
    const seg = (el, v) => {
      for (const b of el.children) {
        const on = b.dataset.v === String(v);
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on);
        b.setAttribute('role', 'radio');
      }
    };
    seg(ui.segPlayers, prefs.players);
    seg(ui.segWho, prefs.who);
    seg(ui.segLevel, prefs.level);
    ui.segWho.style.display = ui.segLevel.style.display = prefs.players === 1 ? '' : 'none';
    ui.duo.style.display = prefs.players === 2 ? '' : 'none';
    for (const [el, on] of [[ui.togUndo, prefs.undo], [ui.togExact, prefs.exact]]) {
      el.classList.toggle('on', !!on);
      el.setAttribute('aria-pressed', !!on);
    }
    for (const t of ui.tiles.children) t.classList.toggle('last', +t.dataset.n === prefs.size);
  }

  function setPref(k, v) {
    gesture();
    prefs[k] = v;
    save();
    refreshHome();
    GMK.sfx.kit('click');
    if (k === 'who') {
      const s = G.sides && G.sides.find((x) => x.id === v);
      if (s && G.state === 'home') s.actor.react('hello');
    }
    if (k === 'exact' && G.demo) G.demo.st.exact = v;
  }

  // ---------------------------------------------------------------- HUD

  function setupHud() {
    const [a, b] = G.sides;
    ui.faceL.src = art[a.id];
    ui.faceR.src = art[b.id];
    ui.chipL.className = 'chip ' + (a.color === B ? 'b' : 'w');
    ui.chipR.className = 'chip ' + (b.color === B ? 'b' : 'w');
    if (G.players === 1) {
      const bud = GMK.buddy.entry;
      ui.callBtn.innerHTML = `<img alt="" src="${art[bud.id]}"><kbd>T</kbd>`;
      const nice = bud.name[0] + bud.name.slice(1).toLowerCase();
      ui.callBtn.title = `Call ${nice} (T)`;
      ui.callBtn.setAttribute('aria-label', `Call ${nice}`);
    } else {
      ui.callBtn.innerHTML = '🙌<kbd>T</kbd>';
      ui.callBtn.title = 'High five! (T)';
      ui.callBtn.setAttribute('aria-label', 'High five!');
    }
    updateUndo();
  }

  function renderScore() {
    const [a, b] = G.sides, sc = score();
    ui.scoreL.textContent = sc[a.color];
    ui.scoreR.textContent = sc[b.color];
  }
  function bumpScore(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  const cache = {};
  function setText(el, key, v) {
    if (cache[key] !== v) {
      cache[key] = v;
      el.textContent = v;
    }
  }

  function updateTurnText() {
    if (!G.game || !ui) return;
    const s = current(), st = G.game;
    let text = '', mine = false;
    if (G.state === 'ended' || G.state === 'over' || st.over) text = st.winner ? `${nameOf(sideOf(st.winner).id)} WINS!` : 'DRAW!';
    else if (!s.human) text = `${nameOf(s.id)} IS THINKING…`;
    else if (G.players === 1) {
      text = 'YOUR TURN!';
      mine = true;
    } else {
      text = `${nameOf(s.id)}'S TURN!`;
      mine = true;
    }
    setText(ui.turn, 'turn', text);
    ui.turn.classList.toggle('mine', mine);
    ui.sideL.classList.toggle('now', !st.over && G.sides[0].color === st.turn);
    ui.sideR.classList.toggle('now', !st.over && G.sides[1].color === st.turn);
  }

  function toast(text, cls) {
    const el = document.createElement('div');
    el.className = 'toast' + (cls ? ' ' + cls : '');
    el.textContent = text;
    ui.toasts.appendChild(el);
    setTimeout(() => el.remove(), cls === 'save' ? 2450 : 1950);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
  }
  function clearToasts() {
    if (ui) ui.toasts.innerHTML = '';
  }

  function show(el, on) {
    el.classList.toggle('hidden', !on);
  }

  // ---------------------------------------------------------------- your brother and the high five

  function call() {
    gesture();
    if (!G.sides || !['play', 'ended', 'over'].includes(G.state)) return 'none';
    if (G.players === 2) return GMK.highFive.start();
    G.nudge = false;
    return GMK.buddy.call();
  }

  const buddyApi = {
    toast: (t, c) => toast(t, c),
    player: () => kid().actor,
    spot: () => spots.buddy,
    turnId: () => G.turnId,
    canHint: () => G.state === 'play' && G.game && !G.game.over && current() === kid() && G.lockT <= 0,
    roundOver: () => G.state !== 'play' || (G.game && G.game.over),
    showHint() {
      const h = R.hint(G.game);
      if (!h) return null;
      ST.hint(h.cell, kid().color);
      return h;
    },
    clearHint: () => ST.hint(-1),
    players: () => [G.sides[0].actor, G.sides[1].actor],
    meet: () => spots.meet,
    homes: () => spots.sides,
    get flyers() { return flyers; },
  };

  // ---------------------------------------------------------------- input

  let audioReady = false;
  function gesture() {
    if (!audioReady) {
      audioReady = true;
      S.init();
      S.music('title');
    } else S.init();
  }

  // can the kid whose turn it is play point i?
  function canPlay(i) {
    const st = G.game, s = current();
    return G.state === 'play' && st && !st.over && s && s.human && !G.auto && i >= 0 && R.isLegal(st, i);
  }

  function humanTap(i) {
    if (!canPlay(i)) {
      if (G.state === 'play' && i >= 0 && current() && current().human) GMK.sfx.nope();
      return false;
    }
    return move(i, true);
  }

  function moveCursor(dx, dy) {
    if (G.state !== 'play') return;
    const n = G.size, mid = ((n / 2) | 0) * n + ((n / 2) | 0);
    let c = G.cursor;
    if (c < 0) c = ST.lastCell >= 0 ? ST.lastCell : mid;
    else {
      const col = Math.min(n - 1, Math.max(0, (c % n) + dx)), row = Math.min(n - 1, Math.max(0, Math.floor(c / n) + dy));
      c = row * n + col;
    }
    G.cursor = c;
    G.hover = -1;
    GMK.sfx.tick();
  }

  function bindInput() {
    // a press shows where the stone would go (slide to move it); letting go plays it
    ui.canvas.addEventListener('pointerdown', (e) => {
      gesture();
      if (G.state !== 'play') return;
      const i = ST.pick(e.clientX, e.clientY);
      G.press = { id: e.pointerId };
      G.hover = i;
      G.cursor = -1;
      try {
        ui.canvas.setPointerCapture(e.pointerId);
      } catch (err) { /* old browsers */ }
    });
    ui.canvas.addEventListener('pointermove', (e) => {
      const pressed = G.press && e.pointerId === G.press.id;
      if (!pressed && e.pointerType !== 'mouse') return;
      const i = G.state === 'play' ? ST.pick(e.clientX, e.clientY) : -1;
      if (i !== G.hover && canPlay(i)) GMK.sfx.tick();
      G.hover = i;
      ui.canvas.style.cursor = canPlay(i) ? 'pointer' : '';
    });
    ui.canvas.addEventListener('pointerup', (e) => {
      if (!G.press || e.pointerId !== G.press.id) return;
      G.press = null;
      const i = ST.pick(e.clientX, e.clientY);
      if (e.pointerType !== 'mouse') G.hover = -1;
      if (i >= 0 && G.state === 'play') humanTap(i);
    });
    ui.canvas.addEventListener('pointercancel', () => {
      G.press = null;
      G.hover = -1;
    });
    ui.canvas.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !G.press) G.hover = -1;
    });
    const tap = (el, fn) => el.addEventListener('click', (e) => {
      e.stopPropagation();
      gesture();
      fn();
    });
    for (const t of ui.tiles.children) tap(t, () => startMatch({ size: +t.dataset.n }));
    for (const b of ui.segPlayers.children) tap(b, () => setPref('players', +b.dataset.v));
    for (const b of ui.segWho.children) tap(b, () => setPref('who', b.dataset.v));
    for (const b of ui.segLevel.children) tap(b, () => setPref('level', b.dataset.v));
    tap(ui.togUndo, () => setPref('undo', !prefs.undo));
    tap(ui.togExact, () => setPref('exact', !prefs.exact));
    ui.callBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      call();
    });
    tap(ui.pauseBtn, () => pause(true));
    tap(ui.undoBtn, undoMove);
    tap(ui.pResume, () => pause(false));
    tap(ui.pRestart, restartGame);
    tap(ui.pHome, goHome);
    tap(ui.oAgain, next);
    tap(ui.oHome, goHome);
    tap(ui.muteBtn, toggleMute);
    addEventListener('keydown', (e) => {
      if (e.repeat && !e.key.startsWith('Arrow')) return;
      gesture();
      const k = e.key.toLowerCase();
      if (k === 'm') return toggleMute();
      if (G.state === 'home') {
        const size = { 1: 9, 2: 13, 3: 15 }[e.key];
        if (size) startMatch({ size });
        else if (k === 'arrowleft' || k === 'arrowright') setPref('who', prefs.who === 'teddy' ? 'tommy' : 'teddy');
        else if (k === 'arrowup' || k === 'arrowdown') setPref('players', prefs.players === 1 ? 2 : 1);
        else if (k === 'l') setPref('level', prefs.level === 'easy' ? 'normal' : 'easy');
        else if (k === 'u') setPref('undo', !prefs.undo);
        else if (k === 'f') setPref('exact', !prefs.exact);
        else if (k === 'enter' || k === ' ') startMatch({});
        if (k.startsWith('arrow') || k === ' ') e.preventDefault();
        return;
      }
      if (k === 't') return call();
      if (G.state === 'paused') {
        if (k === 'escape' || k === 'p' || k === 'enter' || k === ' ') pause(false);
        else if (k === 'r') restartGame();
        return;
      }
      if (G.state === 'over') {
        if (k === 'enter' || k === ' ' || k === 'r') next();
        else if (k === 'escape') goHome();
        e.preventDefault();
        return;
      }
      if (k === 'escape' || k === 'p') return pause(true);
      if (k === 'r') return restartGame();
      if (G.state !== 'play') return;
      if (k === 'u') undoMove();
      else if (k === 'arrowleft') moveCursor(-1, 0);
      else if (k === 'arrowright') moveCursor(1, 0);
      else if (k === 'arrowup') moveCursor(0, -1);
      else if (k === 'arrowdown') moveCursor(0, 1);
      else if (k === 'enter' || k === ' ') {
        if (G.cursor < 0) moveCursor(0, 0);
        else humanTap(G.cursor);
      }
      if (k.startsWith('arrow') || k === ' ') e.preventDefault();
    });
    addEventListener('resize', layout);
    document.addEventListener('visibilitychange', () => (document.hidden ? S.suspend() : S.resume()));
  }

  function pause(on) {
    if (on && (G.state === 'play' || G.state === 'ended')) {
      G.pausedFrom = G.state;
      G.state = 'paused';
      show(ui.pause, true);
      S.music('pause');
    } else if (!on && G.state === 'paused') {
      G.state = G.pausedFrom || 'play';
      show(ui.pause, false);
      S.music('title');
    }
  }

  function toggleMute() {
    const muted = S.toggleMute();
    ui.muteBtn.textContent = muted ? '🔇' : '🔊';
  }

  // ---------------------------------------------------------------- the loop

  const tmp = new THREE.Vector3();
  function step(dt) {
    dt = Math.min(dt, 0.1);
    // the window can start at 0 x 0 (a hidden tab) and resize without an event reaching us: re-fit when it changes
    if ((innerWidth || 1) !== ST.W || (innerHeight || 1) !== ST.H) layout();
    const running = G.state !== 'paused' && G.state !== 'boot';
    if (running) {
      if (G.state === 'home') demoUpdate(dt);
      if (G.state === 'play') {
        G.lockT = Math.max(0, G.lockT - dt);
        if (G.waitT > 0) {
          G.waitT -= dt;
          if (G.waitT <= 0 && !G.game.over) beginTurn();
        } else if (G.cpuT > 0) {
          G.cpuT -= dt;
          if (G.cpuT <= 0) {
            const s = current();
            // the test bot (game.auto) plays the kid's side
            move(R.cpuMove(G.game, s.human ? G.autoLevel : G.level), false);
          }
        }
        if (G.endT > 0) {
          G.endT -= dt;
          if (G.endT <= 0) endGame();
        }
      }
      if (G.state === 'ended' && G.panelT > 0) {
        G.panelT -= dt;
        if (G.panelT <= 0) showPanel();
      }
      ST.update(dt);
      flyers.update(dt);
      bursts.update(dt);
      if (G.sides) G.sides.forEach((s) => s.actor.update(dt));
      GMK.buddy.update(dt);
      GMK.highFive.update(dt);
    }
    // the turn badge over whoever is to move, and the ring / see-through stone where you'd play
    const st = G.state === 'home' ? (G.demo && G.demo.st) : G.game;
    if (G.sides) {
      G.sides.forEach((s, k) => {
        const on = st && !st.over && st.turn === s.color && G.state !== 'home';
        const bdg = badges[k];
        bdg.visible = !!on;
        if (on) {
          s.actor.root.getWorldPosition(tmp);
          bdg.position.set(tmp.x, 2.75 + Math.abs(Math.sin(performance.now() / 260)) * 0.18, tmp.z);
        }
      });
    }
    const mine = G.state === 'play' && current() && current().human && !G.game.over;
    const col = G.game ? G.game.turn : B;
    ST.hover(mine && G.hover >= 0 && R.isLegal(G.game, G.hover) ? G.hover : -1, col);
    ST.cursor(mine ? G.cursor : -1, col);
    GMK.fx.overlay.update(dt);
    ui.callBtn.classList.toggle('here', GMK.buddy.on || GMK.highFive.on);
    ui.callBtn.classList.toggle('nudge', G.nudge && !GMK.buddy.on && G.state === 'play');
    ST.render();
  }

  function frame(now) {
    const dt = G.last ? (now - G.last) / 1000 : 0.016;
    G.last = now;
    if (!G.held) step(dt);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- boot

  function boot() {
    ui = {
      canvas: $('game'), home: $('home'), hud: $('hud'), hudtop: document.querySelector('.hudtop'), hudmid: document.querySelector('.hudmid'), logo: $('logo'), tiles: $('tiles'),
      segPlayers: $('segPlayers'), segWho: $('segWho'), segLevel: $('segLevel'), duo: $('duo'), duoA: $('duoA'), duoB: $('duoB'),
      togUndo: $('togUndo'), togExact: $('togExact'), pauseBtn: $('pauseBtn'), undoBtn: $('undoBtn'), muteBtn: $('muteBtn'),
      sideL: $('sideL'), sideR: $('sideR'), faceL: $('faceL'), faceR: $('faceR'), chipL: $('chipL'), chipR: $('chipR'),
      scoreL: $('scoreL'), scoreR: $('scoreR'), turn: $('turn'), callBtn: $('callBtn'), toasts: $('toasts'),
      over: $('over'), oFace: $('oFace'), oTitle: $('oTitle'), oScore: $('oScore'), oAgain: $('oAgain'), oHome: $('oHome'),
      pause: $('pause'), pResume: $('pResume'), pRestart: $('pRestart'), pHome: $('pHome'),
    };
    // the logo: the first word small on top, the rest big ("TT" / "Gomoku"); a one-word name is all big
    const words = window.GMK_TITLE.split(' ');
    ui.logo.querySelector('small').textContent = words.length > 1 ? words[0] : '';
    ui.logo.querySelector('big').textContent = words.length > 1 ? words.slice(1).join(' ') : words[0];
    // the little boards on the menu tiles: a black five corner to corner, and some white stones
    for (const t of ui.tiles.children) {
      const n = +t.dataset.n, m = t.querySelector('.mini'), cells = n - 1, mid = (n - 1) >> 1;
      m.style.setProperty('--s', `${(84 / cells) * 0.92}%`);
      const put = (r, c, cls) => {
        const i = document.createElement('i');
        i.className = cls;
        i.style.left = `${8 + (84 * c) / cells}%`;
        i.style.top = `${8 + (84 * r) / cells}%`;
        m.appendChild(i);
      };
      for (let k = -2; k <= 2; k++) put(mid + k, mid + k, 'b win');
      for (const [dr, dc] of [[-1, 1], [0, 2], [1, -1], [2, 0], [-2, 0]]) put(mid + dr, mid + dc, 'w');
    }
    ui.muteBtn.textContent = S.isMuted() ? '🔇' : '🔊';
    ST.init(ui.canvas);
    GMK.fx.overlay.init($('fx'));
    flyers = GMK.fx.flyers(ST.scene, 60);
    bursts = GMK.fx.bursts(ST.scene, 6);
    actors.forEach((a) => a.attach(ST.scene, flyers));
    art = Kit.portraits(['teddy', 'tommy', 'bolt', 'bruno'].map((id) => Kit.roster.get(id)), { size: 160 });
    ui.segWho.children[0].querySelector('img').src = art.teddy;
    ui.segWho.children[1].querySelector('img').src = art.tommy;
    ui.segLevel.children[0].querySelector('img').src = art.bruno;
    ui.segLevel.children[1].querySelector('img').src = art.bolt;
    ui.duoA.src = art.teddy;
    ui.duoB.src = art.tommy;
    GMK.buddy.init(buddyApi);
    bindInput();
    goHome();
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- test hook

  const toCell = (r, c) => r * G.size + c;
  window.game = {
    // advance `secs` of game time in 1/60 s steps, rendering once at the end (works while the pane is hidden)
    step(secs = 0.1) {
      const n = Math.max(1, Math.round(secs * 60));
      for (let i = 0; i < n; i++) step(1 / 60);
      return game.info();
    },
    hold(on = true) { G.held = on; },
    // start({ size: 9 | 13 | 15, players: 1 | 2, who: 'teddy' | 'tommy', level: 'easy' | 'normal', exact, undo })
    start(opts = {}) {
      startMatch(opts);
      return game.info();
    },
    home: () => goHome(),
    tap: (i) => humanTap(i),            // play point i (row * size + col) for the kid whose turn it is
    tapRC: (r, c) => humanTap(toCell(r, c)),
    key: (k) => dispatchEvent(new KeyboardEvent('keydown', { key: k })),
    call: () => call(),
    undo: () => undoMove(),
    pause: (on = true) => pause(on),
    next: () => next(),
    restart: () => restartGame(),
    // let a test bot play the kid's side too ('normal', 'easy', or 'hint' = Normal that never slips)
    auto(on = true, level = 'normal') {
      G.auto = on;
      G.autoLevel = level;
      if (on && G.state === 'play' && current() && current().human && G.cpuT < 0 && G.waitT <= 0) G.cpuT = 0.3;
    },
    // set the board straight away (for tests and screenshots): `board` is size*size numbers or a string of digits
    // (0 empty, 1 black, 2 white), `turn` the colour to move
    stage(board, turn) {
      const b = typeof board === 'string' ? board.split('').map(Number) : board.slice();
      const st = G.game;
      st.board = b;
      st.moves = b.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
      if (turn) st.turn = turn;
      ST.set(st.board);
      G.cpuT = -1;
      G.waitT = -1;
      beginTurn();
      return game.info();
    },
    check: (opts) => GMK.check(opts),
    rates: (n, sizes) => GMK.rates(n, sizes),
    info() {
      const st = G.game;
      return {
        state: G.state, players: G.players, level: G.level, size: G.size, exact: G.exact, undo: G.undo,
        sides: G.sides && G.sides.map((s) => ({ id: s.id, color: s.color, human: s.human, pose: s.actor.pose })),
        board: st && st.board.join(''), turn: st && st.turn, moves: st && st.moves.length, over: st && st.over,
        winner: st && st.winner, line: st && st.line, score: Object.assign({}, score()), games: G.games, undos: G.undos,
        canUndo: undoCount(), nudge: G.nudge, buddy: GMK.buddy.info(), hint: ST.hintCell, last: ST.lastCell,
        panel: !ui.over.classList.contains('hidden') ? 'over' : null, step: ST.stepPx(),
      };
    },
    get G() { return G; },
    get rules() { return R; },
  };

  let booted = false;
  const go = () => {
    if (booted) return;
    booted = true;
    boot();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go);
  setTimeout(go, 1500);
})();
