// Vérifie que chaque niveau est faisable : depuis le départ, on explore tout ce
// que le joueur peut atteindre en rejouant sa physique (course, saut, double
// saut, trampolines, souffleurs, flèches), puis on liste ce qui reste hors de
// portée : coupe, fruits, caisses (à taper par dessous), checkpoints.
// Donne aussi le temps du chemin le plus rapide jusqu'à la coupe.
//
//   node scripts/check-levels.mjs        (tous les niveaux)
//   node scripts/check-levels.mjs 3      (un seul)
//
// Simplifications : les pièges qui blessent (pointes, feux, scies, Spike Head)
// ne bloquent pas ; les plateformes qui tombent restent en place.

import { LEVELS } from '../src/levels/levels.js';
import { T, MECHANICS } from '../src/levels/parseLevel.js';
import { CONFIG } from '../src/config.js';

const DT = 1 / 60;
const G = CONFIG.player.gravity;
const SPEED = CONFIG.player.speed;
const JUMP = CONFIG.player.jumpVelocity;
const TRAMPOLINE = -820;     // GameScene.hitTrampoline
const PW = 20 * 1.75;        // hitbox du joueur (Player.js : 20×28 source, échelle 1.75)
const PH = 28 * 1.75;
const MAX_FRAMES = 300;
const SNAP = 16;             // grille des positions explorées (px)

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function prepare(L) {
  const solidAt = (c, r) => r >= 0 && r < L.rows && c >= 0 && c < L.cols && L.map[r][c] === '#';
  const oneWayAt = (c, r) => r >= 0 && r < L.rows && c >= 0 && c < L.cols && '=-'.includes(L.map[r][c]);
  // Caisses : solides (hitbox 40×40, voir GameScene._tightBody(box, 20, 20, 4, 2)).
  const boxes = L.boxes.map((b) => ({ x: b.x - 20, y: b.y - 20, w: 40, h: 40 }));
  const falling = L.fallingPlatforms.map((p) => ({ x: p.x - 32, y: p.y - 10, w: 64, h: 20 }))
    .concat(L.details.map((d) => ({ x: d.x - 13, y: d.y, w: 26, h: 24 })));   // marchepieds 'D'
  const tramps = L.trampolines.map((t) => ({ x: t.x - 24, y: t.y + 6, w: 46, h: 22 }));
  const fans = L.fans.map((f) => ({ x: f.x - 32, y: f.top, w: 64, h: f.bottom - f.top }));
  const arrows = L.arrows.map((a) => ({ x: a.x - 14, y: a.y - 14, w: 28, h: 28 }));
  const fruits = L.fruitPositions.map(([x, y]) => ({ x: x - 14, y: y - 24, w: 28, h: 38 }));
  const boxHits = L.boxes.map((b) => ({ x: b.x - 20, y: b.y + 20, w: 40, h: 6 }));
  const flag = { x: L.flag.x - 30, y: L.flag.y - 40, w: 60, h: 96 };
  const checkpoints = L.checkpoints.map((c) => ({ x: c.x - 20, y: c.y - 40, w: 40, h: 96 }));
  return { L, solidAt, oneWayAt, boxes, falling, tramps, fans, arrows, fruits, boxHits, flag, checkpoints };
}

// Simule un programme de commandes depuis une position au sol.
// prog = { dir, hold (frames dans cette direction), after (direction ensuite, 0 par défaut), jumps: [frames] }.
// Renvoie { landing: {x, y} | null, frames, touched: Set }.
function simulate(W, start, prog, touched) {
  const { L } = W;
  let { x, y } = start;
  let vx = 0;
  let vy = 0;
  let jumps = 2;
  let airborne = false;
  const usedArrows = new Set();
  for (let f = 0; f < MAX_FRAMES; f++) {
    vx = f < prog.hold ? prog.dir * SPEED : (prog.after || 0) * SPEED;
    if (prog.jumps.includes(f) && jumps > 0) { vy = JUMP; jumps--; airborne = true; }
    vy += G * DT;

    // Courant d'air des souffleurs.
    const body = { x, y, w: PW, h: PH };
    if (W.fans.some((z) => overlaps(body, z))) vy = Math.max(vy - MECHANICS.fanLift * DT, -MECHANICS.fanMaxRise);

    // Axe X.
    x += vx * DT;
    x = Math.max(0, Math.min(L.width - PW, x));
    for (let r = Math.floor(y / T); r <= Math.floor((y + PH - 1e-6) / T); r++) {
      for (let c = Math.floor(x / T); c <= Math.floor((x + PW - 1e-6) / T); c++) {
        if (!W.solidAt(c, r)) continue;
        if (vx > 0) x = c * T - PW; else if (vx < 0) x = (c + 1) * T;
      }
    }
    for (const b of W.boxes) {
      if (!overlaps({ x, y, w: PW, h: PH }, b)) continue;
      if (vx > 0) x = b.x - PW; else if (vx < 0) x = b.x + b.w;
    }

    // Axe Y.
    const prevBottom = y + PH;
    y += vy * DT;
    let landed = false;
    const rects = [];
    for (let r = Math.floor(y / T); r <= Math.floor((y + PH - 1e-6) / T); r++) {
      for (let c = Math.floor(x / T); c <= Math.floor((x + PW - 1e-6) / T); c++) {
        if (W.solidAt(c, r)) rects.push({ x: c * T, y: r * T, w: T, h: T, oneWay: false });
        else if (W.oneWayAt(c, r)) rects.push({ x: c * T, y: r * T, w: T, h: T, oneWay: true });
      }
    }
    for (const b of W.boxes) rects.push({ ...b, oneWay: false });
    for (const p of W.falling) rects.push({ ...p, oneWay: true });
    for (const t of rects) {
      if (!overlaps({ x, y, w: PW, h: PH }, t)) continue;
      if (vy > 0 && (!t.oneWay || prevBottom <= t.y + 1)) { y = t.y - PH; vy = 0; landed = true; }
      else if (vy < 0 && !t.oneWay) { y = t.y + t.h; vy = 0; }
    }

    const now = { x, y, w: PW, h: PH };
    W.tramps.forEach((t) => { if (vy >= 0 && overlaps(now, t)) { vy = TRAMPOLINE; jumps = 2; landed = false; airborne = true; } });
    W.arrows.forEach((a, i) => {
      if (!usedArrows.has(i) && overlaps(now, a)) { usedArrows.add(i); vy = -MECHANICS.arrowBoost; jumps = 2; landed = false; airborne = true; }
    });
    W.fruits.forEach((fr, i) => { if (overlaps(now, fr)) touched.add(`fruit${i}`); });
    W.boxHits.forEach((bh, i) => { if (vy <= 0 && overlaps(now, bh)) touched.add(`box${i}`); });
    W.checkpoints.forEach((cp, i) => { if (overlaps(now, cp)) touched.add(`cp${i}`); });
    if (overlaps(now, W.flag)) return { landing: null, frames: f + 1, flag: true };

    if (y > L.height + 60) return { landing: null, frames: f + 1 };
    if (!landed && vy !== 0) airborne = true;
    if (landed) {
      jumps = 2;
      // Fin du programme : au sol après un vol, ou après une marche.
      if (airborne || f >= prog.hold) return { landing: { x, y }, frames: f + 1 };
    }
  }
  return { landing: null, frames: MAX_FRAMES };
}

const PROGRAMS = [];
for (const dir of [-1, 0, 1]) {
  if (dir !== 0) for (const hold of [4, 10]) PROGRAMS.push({ dir, hold, jumps: [] });   // marcher
  if (dir !== 0) for (const j of [12, 22]) for (const j2 of [null, 10, 22]) {
    PROGRAMS.push({ dir, hold: MAX_FRAMES, jumps: j2 === null ? [j] : [j, j + j2] });  // quitter un rebord puis sauter
  }
  for (const hold of dir === 0 ? [0] : [MAX_FRAMES, 8, 18, 30]) {
    for (const j2 of [null, 6, 14, 22, 30, 40]) {
      PROGRAMS.push({ dir, hold, jumps: j2 === null ? [0] : [0, j2] });
    }
  }
  // Demi-tour en l'air (contourner un rebord, revenir sur une plateforme).
  if (dir !== 0) for (const j2 of [14, 30]) PROGRAMS.push({ dir, hold: 12, after: -dir, jumps: [0, j2] });
}

function check(num) {
  const L = LEVELS[num];
  const W = prepare(L);
  // Position de départ : posée au sol sous '@'.
  const start = settle(W, { x: L.playerStart.x - PW / 2, y: L.playerStart.y - PH / 2 });
  const key = (p) => `${Math.round(p.x / SNAP)},${Math.round(p.y)}`;
  const best = new Map([[key(start), 0]]);
  const queue = [[0, start]];
  const touched = new Set();
  let flagFrames = Infinity;
  while (queue.length) {
    // Dijkstra rudimentaire (file triée par temps).
    queue.sort((a, b) => a[0] - b[0]);
    const [t, pos] = queue.shift();
    if (t > best.get(key(pos))) continue;
    for (const prog of PROGRAMS) {
      const res = simulate(W, pos, prog, touched);
      if (res.flag) { flagFrames = Math.min(flagFrames, t + res.frames); continue; }
      if (!res.landing) continue;
      // Position exacte gardée (l'arrondir pourrait la mettre dans un mur) ; seule la clé est arrondie.
      const p = res.landing;
      const k = key(p);
      const nt = t + res.frames;
      if (nt < (best.get(k) ?? Infinity)) { best.set(k, nt); queue.push([nt, p]); }
    }
  }

  const cell = ([x, y]) => `(${Math.floor(x / T)}, ${Math.floor(y / T)})`;
  const missFruits = L.fruitPositions.filter((_, i) => !touched.has(`fruit${i}`)).map(cell);
  const missBoxes = L.boxes.filter((_, i) => !touched.has(`box${i}`)).map((b) => cell([b.x, b.y]));
  const missCp = L.checkpoints.filter((_, i) => !touched.has(`cp${i}`)).map((c) => cell([c.x, c.y]));
  const ok = flagFrames < Infinity && !missFruits.length && !missBoxes.length && !missCp.length;
  console.log(`\n${ok ? '✓' : '✗'} ${L.name}  (${L.cols}×${L.rows} tuiles, ${L.time} s)`);
  console.log(`  coupe : ${flagFrames < Infinity ? `atteinte, chemin le plus rapide ≈ ${(flagFrames / 60).toFixed(1)} s` : 'INATTEIGNABLE'}`);
  console.log(`  fruits : ${L.fruitPositions.length - missFruits.length}/${L.fruitPositions.length}${missFruits.length ? `  hors de portée : ${missFruits.join(' ')}` : ''}`);
  console.log(`  caisses : ${L.boxes.length - missBoxes.length}/${L.boxes.length}${missBoxes.length ? `  hors de portée : ${missBoxes.join(' ')}` : ''}`);
  if (L.checkpoints.length) console.log(`  checkpoints : ${L.checkpoints.length - missCp.length}/${L.checkpoints.length}${missCp.length ? `  hors de portée : ${missCp.join(' ')}` : ''}`);
  console.log(`  positions explorées : ${best.size}`);
  return ok;
}

// Laisse tomber le joueur depuis sa position de départ jusqu'au sol.
function settle(W, p) {
  const res = simulate(W, p, { dir: 0, hold: 0, jumps: [] }, new Set());
  return res.landing || p;
}

const only = process.argv[2];
const nums = only ? [Number(only)] : Object.keys(LEVELS).map(Number);
const results = nums.map(check);
process.exitCode = results.every(Boolean) ? 0 : 1;
