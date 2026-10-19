/* TT Gomoku: the renderer, the garden and the board.
   The board is a thick wooden block on four short legs, on a straw mat on the lawn. Its top is painted with the grid
   (9, 13 or 15 lines each way) and the star points. Stones sit on the points: Teddy's black ones are dark blue with
   a 🏀, Tommy's white ones cream with a ✌️. A wooden bowl of stones stands beside each player.
     setSize(n)            a new grid, and the board cleared
     set(board)            show a board straight away
     place(i, color)       a stone drops in with a bounce;  remove(i) it hops up and vanishes (undo)
     last(i)               the soft glow round the last stone; -1 hides it
     win(line)             a glowing bar along the five, and its stones bounce
     hint(i, color)        the point glows gold, with a see-through stone and a bouncing 👇 (your brother's tip)
     cursor(i, color), hover(i, color)   the ring, the guide lines and the see-through stone for where you'd play
     bowl(k, x, z)         move player k's bowl
     pick(x, y)            the point under a screen point, or -1
   fit(points, elev, margins) aims the camera so world points fill the screen minus margins (in pixels). */
(function () {
  'use strict';
  const T = THREE;
  const GMK = (window.GMK = window.GMK || {});
  const { makeCanvas, toTexture, std, rand, pick: pickOne, radialTexture, emojiTexture } = Kit.gfx;

  const HALF = 2.75; // half the board's width
  const EDGE = 0.32; // from the outer grid lines to the board's edge
  const SPAN = 2 * (HALF - EDGE); // the grid, edge line to edge line
  const LEG_H = 0.22, BLOCK_H = 0.46;
  const TOP = LEG_H + BLOCK_H; // height of the board's top
  const COL = { 1: '#1d3a8a', 2: '#fff1d2' }; // black (dark blue) and white (cream)
  const EMBLEM = { 1: '🏀', 2: '✌️' };
  const STARS = { 9: [2, 4, 6], 13: [3, 6, 9], 15: [3, 7, 11] };

  let renderer = null, W = 1, H = 1, n = 15, pitch = SPAN / 14;
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(36, 1, 0.1, 300);
  const fx = { line: null, lineT: -1, lineCells: null, hint: -1, hintC: 1, hintT: 0, cursor: -1, cursorC: 1, hover: -1, hoverC: 1, last: -1, t: 0 };
  const camBase = new T.Vector3();
  const stones = new Map(); // point -> { mesh, color, anim, bounce }
  let top = null, glowMesh = null, finger = null, ring = null, lastGlow = null, guide = null;
  const ghosts = {}, stoneMat = {}, emblemMat = {}, bowls = [];
  const stoneGeo = new T.SphereGeometry(1, 28, 14), emblemGeo = new T.CircleGeometry(1, 28);
  emblemGeo.rotateX(-Math.PI / 2);
  const tmp = new T.Vector3();

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    for (const c of [1, 2]) {
      stoneMat[c] = std(COL[c], c === 1 ? { roughness: 0.28, metalness: 0.15 } : { roughness: 0.34, metalness: 0.02 });
      emblemMat[c] = new T.MeshBasicMaterial({ map: emojiTexture(EMBLEM[c]), transparent: true, depthWrite: false, opacity: c === 1 ? 0.95 : 0.9 });
    }
    buildGarden();
    buildBoard();
    setSize(15);
    resize();
  }

  function resize() {
    W = Math.max(1, innerWidth || 1);
    H = Math.max(1, innerHeight || 1);
    if (renderer) renderer.setSize(W, H, false);
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
  }

  // A rounded rectangle slab, w wide (x) and d deep (z), h tall, centred on the origin, flat on y.
  function slab(w, d, h, r, bevel = 0.04) {
    const s = new T.Shape();
    const x = -w / 2 + bevel, y = -d / 2 + bevel, ww = w - 2 * bevel, dd = d - 2 * bevel, rr = Math.max(0.01, r - bevel);
    s.moveTo(x + rr, y);
    s.lineTo(x + ww - rr, y);
    s.quadraticCurveTo(x + ww, y, x + ww, y + rr);
    s.lineTo(x + ww, y + dd - rr);
    s.quadraticCurveTo(x + ww, y + dd, x + ww - rr, y + dd);
    s.lineTo(x + rr, y + dd);
    s.quadraticCurveTo(x, y + dd, x, y + dd - rr);
    s.lineTo(x, y + rr);
    s.quadraticCurveTo(x, y, x + rr, y);
    const g = new T.ExtrudeGeometry(s, { depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -(h - 2 * bevel) / 2, 0);
    return g;
  }

  // ---------------------------------------------------------------- the garden

  function lawnTexture() {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#7fd35c';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#74c851';
    for (let i = 0; i < 4; i++) g.fillRect(0, i * 64, 256, 32);
    for (let i = 0; i < 1100; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(30,90,10,0.08)';
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 5);
    }
    return toTexture(c, true);
  }

  // a woven straw mat under the board
  function matTexture() {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#e9cf8a';
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 8) {
      g.fillStyle = (y / 8) % 2 ? 'rgba(160,120,50,0.22)' : 'rgba(255,255,255,0.18)';
      g.fillRect(0, y, 256, 4);
    }
    g.fillStyle = 'rgba(60,140,70,0.85)';
    g.fillRect(0, 0, 256, 14);
    g.fillRect(0, 242, 256, 14);
    return toTexture(c, true);
  }

  function buildGarden() {
    scene.background = new T.Color('#9fdcff');
    scene.add(new T.HemisphereLight('#ffffff', '#5a8a3a', 0.85));
    const sun = new T.DirectionalLight('#fff3dc', 1.0);
    sun.position.set(-5, 12, 8);
    scene.add(sun);

    const tex = lawnTexture();
    tex.repeat.set(30, 30);
    const ground = new T.Mesh(new T.PlaneGeometry(120, 120), std('#ffffff', { map: tex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const mt = matTexture();
    const mat = new T.Mesh(new T.PlaneGeometry(HALF * 2 + 2.2, HALF * 2 + 1.6), std('#ffffff', { map: mt, roughness: 1 }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.y = 0.01;
    scene.add(mat);

    // a white picket fence along the back, then hedges and trees
    const white = std('#ffffff', { roughness: 0.6 });
    const postGeo = new T.BoxGeometry(0.22, 1.3, 0.1), tipGeo = new T.ConeGeometry(0.16, 0.22, 4);
    const fenceZ = -10.5;
    for (let x = -26; x <= 26; x += 0.55) {
      const post = new T.Mesh(postGeo, white);
      post.position.set(x, 0.65, fenceZ);
      scene.add(post);
      const tip = new T.Mesh(tipGeo, white);
      tip.position.set(x, 1.4, fenceZ);
      tip.rotation.y = Math.PI / 4;
      scene.add(tip);
    }
    for (const y of [0.35, 1.0]) {
      const rail = new T.Mesh(new T.BoxGeometry(53, 0.14, 0.08), white);
      rail.position.set(0, y, fenceZ + 0.08);
      scene.add(rail);
    }
    const leaf = [std('#3f9e3a'), std('#4cb244'), std('#378c33')];
    const bush = (x, z, s) => {
      for (let i = 0; i < 3; i++) {
        const b = new T.Mesh(new T.SphereGeometry(0.7 * s, 14, 10), leaf[i]);
        b.position.set(x + (i - 1) * 0.6 * s, 0.45 * s + (i === 1 ? 0.25 * s : 0), z + (i % 2) * 0.2);
        scene.add(b);
      }
    };
    const tree = (x, z, s) => {
      const trunk = new T.Mesh(new T.CylinderGeometry(0.22 * s, 0.3 * s, 2.2 * s, 8), std('#8a5a32'));
      trunk.position.set(x, 1.1 * s, z);
      scene.add(trunk);
      for (const [dx, dy, r] of [[0, 2.8, 1.3], [-0.8, 2.3, 0.9], [0.8, 2.4, 0.95]]) {
        const crown = new T.Mesh(new T.SphereGeometry(r * s, 16, 12), leaf[dx > 0 ? 1 : 0]);
        crown.position.set(x + dx * s, dy * s, z);
        scene.add(crown);
      }
    };
    for (const x of [-13, -8, 8, 13]) bush(x, -9.6, 1.3);
    bush(-12, -2, 1.4);
    bush(12, -2, 1.4);
    bush(-12.5, 5, 1.5);
    bush(12.5, 5, 1.5);
    tree(-17, -13, 1.6);
    tree(17, -13, 1.6);
    tree(-3, -14, 1.3);
    tree(5, -15, 1.5);

    // flowers, kept clear of the mat and the spots where the boys stand
    const petals = ['#ff6f91', '#ffd23f', '#ffffff', '#a77bff', '#ff8a1f'];
    const stem = std('#2f8a2a'), centre = std('#ffcc00');
    for (let i = 0; i < 110; i++) {
      const x = rand(-15, 15), z = rand(-9.8, 9.5);
      if (Math.abs(x) < HALF + 3.4 && z > -HALF - 3.8 && z < HALF + 1.8) continue;
      const f = new T.Group();
      const s = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.35, 5), stem);
      s.position.y = 0.17;
      f.add(s);
      const head = new T.Mesh(new T.SphereGeometry(0.11, 8, 6), std(pickOne(petals)));
      head.position.y = 0.38;
      head.scale.y = 0.6;
      f.add(head);
      const dot = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), centre);
      dot.position.y = 0.43;
      f.add(dot);
      f.position.set(x, 0, z);
      scene.add(f);
    }
  }

  // ---------------------------------------------------------------- the board

  function woodTexture(base, dark, size = 256) {
    const [c, g] = makeCanvas(size, size);
    g.fillStyle = base;
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 46; i++) {
      g.strokeStyle = dark;
      g.globalAlpha = rand(0.05, 0.14);
      g.lineWidth = rand(1, 3) * (size / 256);
      g.beginPath();
      const y = rand(0, size);
      g.moveTo(0, y);
      g.bezierCurveTo(size * 0.3, y + rand(-8, 8), size * 0.66, y + rand(-8, 8), size, y + rand(-6, 6));
      g.stroke();
    }
    g.globalAlpha = 1;
    return [c, g];
  }

  // the top: wood, the grid and the star points
  const TEX = 1024, P = HALF - 0.04; // the top plane's half width
  const toPx = (v) => ((v + P) / (2 * P)) * TEX;
  function gridTexture(size) {
    const [c, g] = woodTexture('#e8b86a', '#8a5a26', TEX);
    const step = SPAN / (size - 1), x0 = -SPAN / 2;
    g.strokeStyle = 'rgba(58, 34, 12, 0.85)';
    g.lineWidth = size > 13 ? 3 : 3.5;
    g.lineCap = 'square';
    for (let k = 0; k < size; k++) {
      const v = toPx(x0 + k * step);
      g.lineWidth = k === 0 || k === size - 1 ? 5 : size > 13 ? 3 : 3.5;
      g.beginPath();
      g.moveTo(toPx(x0), v);
      g.lineTo(toPx(-x0), v);
      g.stroke();
      g.beginPath();
      g.moveTo(v, toPx(x0));
      g.lineTo(v, toPx(-x0));
      g.stroke();
    }
    g.fillStyle = 'rgba(58, 34, 12, 0.9)';
    const s = STARS[size] || [];
    for (const r of s) {
      for (const k of s) {
        // the four corner stars and the middle one
        if ((r === s[1]) !== (k === s[1])) continue;
        g.beginPath();
        g.arc(toPx(x0 + k * step), toPx(x0 + r * step), size > 13 ? 9 : 11, 0, Math.PI * 2);
        g.fill();
      }
    }
    const t = toTexture(c);
    if (renderer) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }

  function buildBoard() {
    const board = new T.Group();
    scene.add(board);
    const [wc] = woodTexture('#d9a35a', '#7a4a20');
    const side = std('#ffffff', { map: toTexture(wc), roughness: 0.6 });
    const block = new T.Mesh(slab(HALF * 2, HALF * 2, BLOCK_H, 0.16, 0.05), [std('#e0ac62', { roughness: 0.6 }), side]);
    block.position.y = LEG_H + BLOCK_H / 2;
    board.add(block);
    const legMat = std('#a8692f', { roughness: 0.7 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new T.Mesh(new T.CylinderGeometry(0.32, 0.26, LEG_H + 0.02, 12), legMat);
        leg.position.set(sx * (HALF - 0.55), LEG_H / 2, sz * (HALF - 0.55));
        board.add(leg);
      }
    }
    top = new T.Mesh(new T.PlaneGeometry(P * 2, P * 2), std('#ffffff', { roughness: 0.55 }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = TOP + 0.003;
    board.add(top);

    // the bowls of stones beside the board
    for (const c of [1, 2]) {
      const g = new T.Group();
      const wood = std('#9a5f2c', { roughness: 0.5 });
      const body = new T.Mesh(new T.SphereGeometry(0.62, 22, 12, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), wood);
      body.scale.y = 0.75;
      body.position.y = 0.47;
      g.add(body);
      const rim = new T.Mesh(new T.TorusGeometry(0.58, 0.05, 8, 26), wood);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.6;
      g.add(rim);
      for (let k = 0; k < 9; k++) {
        const s = new T.Mesh(stoneGeo, stoneMat[c]);
        const a = k * 2.4, r = k ? 0.18 + (k % 3) * 0.1 : 0;
        s.scale.set(0.17, 0.08, 0.17);
        s.position.set(Math.cos(a) * r, 0.56 + (k < 4 ? 0.07 : 0), Math.sin(a) * r);
        s.rotation.set(rand(-0.3, 0.3), 0, rand(-0.3, 0.3));
        g.add(s);
      }
      g.scale.setScalar(0.75);
      scene.add(g);
      bowls.push(g);
    }

    // the see-through stones for where you'd play
    for (const c of [1, 2]) {
      const g = new T.Group();
      g.add(new T.Mesh(stoneGeo, new T.MeshBasicMaterial({ color: COL[c], transparent: true, opacity: 0.55, depthWrite: false })));
      const e = new T.Mesh(emblemGeo, new T.MeshBasicMaterial({ map: emblemMat[c].map, transparent: true, opacity: 0.5, depthWrite: false }));
      e.position.y = 1.02;
      e.scale.setScalar(0.62);
      g.add(e);
      g.visible = false;
      g.renderOrder = 7;
      scene.add(g);
      ghosts[c] = g;
    }
    // the hint glow and finger, the cursor ring and guide lines, the last-move glow
    const glowTex = radialTexture(128, [[0, 'rgba(255,230,90,1)'], [0.45, 'rgba(255,200,40,0.65)'], [1, 'rgba(255,190,0,0)']]);
    glowMesh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.visible = false;
    glowMesh.renderOrder = 5;
    scene.add(glowMesh);
    finger = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture('👇'), depthTest: false, transparent: true, opacity: 0.9 }));
    finger.visible = false;
    finger.renderOrder = 25;
    scene.add(finger);
    const [rc, rg] = makeCanvas(128, 128);
    rg.strokeStyle = '#14121f';
    rg.lineWidth = 16;
    rg.beginPath();
    rg.arc(64, 64, 52, 0, Math.PI * 2);
    rg.stroke();
    rg.strokeStyle = '#ffd400';
    rg.lineWidth = 9;
    rg.stroke();
    ring = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: toTexture(rc), transparent: true, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    ring.renderOrder = 6;
    scene.add(ring);
    guide = new T.Group();
    const gm = new T.MeshBasicMaterial({ color: '#fff27a', transparent: true, opacity: 0.55, depthWrite: false });
    for (const a of [0, Math.PI / 2]) {
      const bar = new T.Mesh(new T.PlaneGeometry(SPAN + 0.3, 1), gm);
      bar.rotation.x = -Math.PI / 2;
      bar.rotation.z = a;
      guide.add(bar);
    }
    guide.visible = false;
    guide.renderOrder = 4;
    scene.add(guide);
    const lastTex = radialTexture(128, [[0, 'rgba(255,240,160,0)'], [0.5, 'rgba(255,236,120,0)'], [0.66, 'rgba(255,226,90,0.95)'], [0.82, 'rgba(255,200,40,0.45)'], [1, 'rgba(255,190,0,0)']]);
    lastGlow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: lastTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    lastGlow.rotation.x = -Math.PI / 2;
    lastGlow.visible = false;
    lastGlow.renderOrder = 3;
    scene.add(lastGlow);
  }

  // A new grid of size x size points; the stones all go.
  function setSize(size) {
    if (top.material.map && n === size) {
      set(null);
      return;
    }
    n = size;
    pitch = SPAN / (n - 1);
    if (top.material.map) top.material.map.dispose();
    top.material.map = gridTexture(n);
    top.material.needsUpdate = true;
    const r = stoneR();
    for (const c of [1, 2]) ghosts[c].scale.set(r, r * 0.42, r);
    glowMesh.scale.setScalar(pitch * 2);
    ring.scale.setScalar(pitch * 1.2);
    lastGlow.scale.setScalar(pitch * 1.45);
    guide.children.forEach((b) => (b.scale.y = Math.max(0.05, pitch * 0.16)));
    finger.scale.setScalar(Math.max(0.55, Math.min(0.8, pitch * 1.5)));
    set(null);
  }
  const stoneR = () => pitch * 0.46;

  const cellPos = (i, out = new T.Vector3()) => out.set(-SPAN / 2 + (i % n) * pitch, TOP, -SPAN / 2 + Math.floor(i / n) * pitch);

  function makeStone(i, color) {
    const g = new T.Group();
    const r = stoneR();
    const body = new T.Mesh(stoneGeo, stoneMat[color]);
    body.scale.set(r, r * 0.42, r);
    g.add(body);
    const e = new T.Mesh(emblemGeo, emblemMat[color]);
    e.scale.setScalar(r * 0.64);
    e.position.y = r * 0.42 + 0.004;
    e.rotation.y = rand(-0.4, 0.4);
    e.renderOrder = 2;
    g.add(e);
    cellPos(i, g.position);
    g.position.y = TOP + r * 0.42 * 0.98;
    scene.add(g);
    const s = { g, color, anim: null, bounce: -1, baseY: g.position.y };
    stones.set(i, s);
    return s;
  }
  function drop(i) {
    const s = stones.get(i);
    if (!s) return;
    scene.remove(s.g);
    stones.delete(i);
  }

  function set(board) {
    for (const i of [...stones.keys()]) drop(i);
    clearWin();
    if (board) board.forEach((v, i) => v && makeStone(i, v));
    fx.last = -1;
  }

  function place(i, color) {
    drop(i);
    const s = makeStone(i, color);
    s.anim = { kind: 'drop', t: 0, dur: 0.36 };
    s.g.position.y = s.baseY + 1.6;
  }
  function remove(i) {
    const s = stones.get(i);
    if (!s) return;
    stones.delete(i); // gone from the board straight away; the mesh flies off
    s.anim = { kind: 'lift', t: 0, dur: 0.35 };
    leaving.push(s);
  }
  const leaving = [];

  function win(line) {
    clearWin();
    if (!line || line.length < 2) return;
    const a = cellPos(line[0]), b = cellPos(line[line.length - 1]);
    const len = a.distanceTo(b) + pitch * 0.9;
    const bar = new T.Mesh(new T.BoxGeometry(1, 0.04, pitch * 0.2), new T.MeshBasicMaterial({ color: '#fff27a', transparent: true, opacity: 0.9, depthTest: false }));
    const haloTex = radialTexture(64, [[0, 'rgba(255,240,120,0.9)'], [1, 'rgba(255,200,0,0)']]);
    const halo = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending }));
    halo.rotation.x = -Math.PI / 2;
    halo.scale.set(1.12, pitch * 2.2, 1);
    const g = new T.Group();
    g.add(halo);
    g.add(bar);
    g.position.copy(a).add(b).multiplyScalar(0.5);
    g.position.y = TOP + stoneR() * 0.5 + 0.02;
    g.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    g.userData.len = len;
    g.scale.set(0.01, 1, 1);
    halo.renderOrder = 8;
    bar.renderOrder = 9;
    scene.add(g);
    fx.line = g;
    fx.lineT = 0;
    fx.lineCells = line.slice();
    line.forEach((i, k) => {
      const s = stones.get(i);
      if (s) s.bounce = -k * 0.1;
    });
  }
  function clearWin() {
    if (fx.line) {
      scene.remove(fx.line);
      fx.line.traverse((o) => o.geometry && o.geometry.dispose());
      fx.line = null;
    }
    fx.lineCells = null;
    for (const s of stones.values()) s.bounce = -1;
  }

  function hint(i, color = 1) {
    fx.hint = i;
    fx.hintC = color;
    fx.hintT = 0;
  }
  function cursor(i, color = 1) {
    fx.cursor = i;
    fx.cursorC = color;
  }
  function hover(i, color = 1) {
    fx.hover = i;
    fx.hoverC = color;
  }
  function last(i) { fx.last = i; }
  function bowl(k, x, z) {
    bowls[k].position.set(x, 0, z);
  }

  // ---------------------------------------------------------------- every frame

  function update(dt) {
    fx.t += dt;
    for (const [i, s] of stones) {
      const a = s.anim;
      if (a) {
        a.t += dt;
        const u = Math.min(1, a.t / a.dur);
        const body = s.g.children[0], r = stoneR();
        if (u < 0.6) {
          const k = u / 0.6;
          s.g.position.y = s.baseY + 1.6 * (1 - k * k);
        } else {
          const k = (u - 0.6) / 0.4;
          s.g.position.y = s.baseY;
          const sq = Math.sin(k * Math.PI) * 0.3 * (1 - k);
          body.scale.set(r * (1 + sq), r * 0.42 * (1 - sq * 1.4), r * (1 + sq));
        }
        if (u >= 1) {
          s.anim = null;
          body.scale.set(r, r * 0.42, r);
        }
      }
      if (s.bounce > -1 || (fx.lineCells && fx.lineCells.includes(i))) {
        s.bounce += dt;
        if (!s.anim) s.g.position.y = s.baseY + Math.abs(Math.sin(Math.max(0, s.bounce) * 6)) * pitch * 0.55;
      }
    }
    for (let k = leaving.length - 1; k >= 0; k--) {
      const s = leaving[k];
      s.anim.t += dt;
      const u = Math.min(1, s.anim.t / s.anim.dur);
      s.g.position.y = s.baseY + u * 1.2;
      s.g.rotation.y = u * 6;
      s.g.scale.setScalar(Math.max(0.01, 1 - u));
      if (u >= 1) {
        scene.remove(s.g);
        leaving.splice(k, 1);
      }
    }
    if (fx.line) {
      fx.lineT += dt;
      const u = Math.min(1, fx.lineT / 0.35);
      fx.line.scale.x = fx.line.userData.len * (1 - Math.pow(1 - u, 3));
      fx.line.children[0].material.opacity = 0.7 + Math.sin(fx.t * 8) * 0.3;
    }
    // the last move's glow, breathing softly
    const ls = fx.last >= 0 && stones.get(fx.last);
    lastGlow.visible = !!ls && !ls.anim;
    if (lastGlow.visible) {
      cellPos(fx.last, tmp);
      lastGlow.position.set(tmp.x, TOP + 0.006, tmp.z);
      lastGlow.material.opacity = 0.75 + Math.sin(fx.t * 3.2) * 0.25;
    }
    // the hint: glow and a bouncing finger
    const h = fx.hint;
    glowMesh.visible = finger.visible = h >= 0;
    if (h >= 0) {
      fx.hintT += dt;
      cellPos(h, tmp);
      glowMesh.position.set(tmp.x, TOP + 0.008, tmp.z);
      glowMesh.scale.setScalar(pitch * 2.2 * (1 + Math.sin(fx.t * 6) * 0.12) * Math.min(1, fx.hintT * 4));
      finger.position.set(tmp.x, TOP + 0.1 + finger.scale.x * 1.15 + Math.abs(Math.sin(fx.t * 5)) * 0.22, tmp.z);
    }
    // the cursor (keyboard) or the point under the mouse or finger: a ring, guide lines and a see-through stone
    const gi = fx.hover >= 0 ? fx.hover : fx.cursor >= 0 ? fx.cursor : fx.hint;
    const gc = fx.hover >= 0 ? fx.hoverC : fx.cursor >= 0 ? fx.cursorC : fx.hintC;
    const pointing = fx.hover >= 0 ? fx.hover : fx.cursor;
    ring.visible = guide.visible = pointing >= 0;
    if (pointing >= 0) {
      cellPos(pointing, tmp);
      ring.position.set(tmp.x, TOP + 0.012, tmp.z);
      ring.scale.setScalar(pitch * 1.25 * (1 + Math.sin(fx.t * 7) * 0.04));
      guide.position.set(tmp.x, TOP + 0.005, tmp.z);
      guide.children[0].position.set(-tmp.x, 0, 0);
      guide.children[1].position.set(0, 0, -tmp.z);
    }
    ghosts[1].visible = ghosts[2].visible = false;
    if (gi >= 0 && !stones.has(gi)) {
      const g = ghosts[gc];
      cellPos(gi, tmp);
      g.visible = true;
      g.position.set(tmp.x, TOP + stoneR() * 0.42 + 0.03 + Math.sin(fx.t * 4) * 0.02, tmp.z);
    }
    if (!cam.position.equals(camBase) && camBase.lengthSq()) {
      cam.position.copy(camBase);
      cam.updateMatrixWorld(true);
    }
  }

  // ---------------------------------------------------------------- camera

  // Aim the camera down at `elev` radians from the front so the world points `pts` fill the screen minus margins
  // { l, r, t, b } in pixels. It fits them in a box of that size in the middle of the picture, then slides the
  // picture (the camera's view offset) so the box sits over the free part of the screen. Returns the point it looks at.
  const right = new T.Vector3(), up = new T.Vector3();
  function fit(pts, elev, m) {
    cam.clearViewOffset();
    const dir = new T.Vector3(0, Math.sin(elev), Math.cos(elev));
    const center = new T.Vector3();
    pts.forEach((p) => center.add(p));
    center.multiplyScalar(1 / pts.length);
    const hw = Math.max(0.1, (W - m.l - m.r) / W), hh = Math.max(0.1, (H - m.t - m.b) / H);
    const box = { x0: -hw, x1: hw, y0: -hh, y1: hh };
    const place = (d) => {
      cam.position.copy(center).addScaledVector(dir, d);
      cam.lookAt(center);
      cam.updateMatrixWorld(true);
    };
    const bounds = () => {
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) {
        tmp.copy(p).project(cam);
        x0 = Math.min(x0, tmp.x);
        x1 = Math.max(x1, tmp.x);
        y0 = Math.min(y0, tmp.y);
        y1 = Math.max(y1, tmp.y);
      }
      return { x0, x1, y0, y1 };
    };
    for (let iter = 0; iter < 4; iter++) {
      let lo = 2, hi = 300;
      for (let i = 0; i < 32; i++) {
        const mid = (lo + hi) / 2;
        place(mid);
        const b = bounds();
        if (b.x0 >= box.x0 && b.x1 <= box.x1 && b.y0 >= box.y0 && b.y1 <= box.y1) hi = mid;
        else lo = mid;
      }
      place(hi);
      const b = bounds();
      const dx = (b.x0 + b.x1) / 2 - (box.x0 + box.x1) / 2;
      const dy = (b.y0 + b.y1) / 2 - (box.y0 + box.y1) / 2;
      const d = cam.position.distanceTo(center);
      const halfH = d * Math.tan((cam.fov * Math.PI) / 360), halfW = halfH * cam.aspect;
      right.setFromMatrixColumn(cam.matrixWorld, 0);
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      center.addScaledVector(right, dx * halfW).addScaledVector(up, dy * halfH);
    }
    const bx = (m.l + W - m.r) / 2, by = (m.t + H - m.b) / 2;
    cam.setViewOffset(W, H, W / 2 - bx, H / 2 - by, W, H);
    cam.updateMatrixWorld(true);
    camBase.copy(cam.position);
    return center;
  }

  // The point under screen point (x, y): the nearest one, from anywhere on the board up to half a step past the
  // outer lines. -1 off the board.
  const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), -TOP), hit = new T.Vector3();
  function pick(x, y) {
    ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    if (!ray.ray.intersectPlane(plane, hit)) return -1;
    const col = Math.round((hit.x + SPAN / 2) / pitch), row = Math.round((hit.z + SPAN / 2) / pitch);
    if (col < 0 || col >= n || row < 0 || row >= n) return -1;
    return row * n + col;
  }

  function toScreen(v, out = { x: 0, y: 0 }) {
    tmp.copy(v).project(cam);
    out.x = ((tmp.x + 1) / 2) * W;
    out.y = ((1 - tmp.y) / 2) * H;
    return out;
  }

  // how big one step of the grid is on screen, in pixels (across and front to back, near the middle)
  function stepPx() {
    const mid = ((n / 2) | 0) * n + ((n / 2) | 0);
    const a = toScreen(cellPos(mid)), b = toScreen(cellPos(mid + 1)), c = toScreen(cellPos(mid + n));
    return { across: +Math.hypot(b.x - a.x, b.y - a.y).toFixed(1), down: +Math.hypot(c.x - a.x, c.y - a.y).toFixed(1) };
  }

  function render() {
    if (renderer) renderer.render(scene, cam);
  }

  GMK.stage = {
    init, resize, render, update, fit, pick, toScreen, cellPos, setSize, set, place, remove, last, win, clearWin, hint, cursor, hover, bowl, stepPx,
    scene, cam, HALF, TOP, SPAN, COL, EMBLEM,
    busy: () => leaving.length > 0 || [...stones.values()].some((s) => s.anim),
    get W() { return W; },
    get H() { return H; },
    get n() { return n; },
    get pitch() { return pitch; },
    get renderer() { return renderer; },
    get hintCell() { return fx.hint; },
    get lastCell() { return fx.last; },
    get stoneCount() { return stones.size; },
  };
})();
