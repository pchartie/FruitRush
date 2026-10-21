// Serveur API des high scores (Express + SQLite).
//
//   GET  /api/scores              → Top 10
//   POST /api/run/start           → ouvre une partie, renvoie { runId }
//   POST /api/scores {runId, name, levels} → le SERVEUR recalcule le score à
//        partir des stats de partie (bornées par les vrais niveaux) et insère.
//
// Scoring AUTORITATIF : le client n'envoie jamais de score. Il déclare ce qu'il
// a fait par niveau (fruits/caisses/temps/vies) ; le serveur valide contre les
// maxima réels + l'ordre + la durée, puis calcule lui-même le score. Impossible
// de poster un score arbitraire (la triche par console `submitScore(2000)`
// n'existe plus).
//
// En production, sert aussi le build statique `dist/` (un seul service à
// déployer). En dev, Vite (port 3000) proxifie /api vers ce serveur (3001).

import express from 'express';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { getTop, insertScore } from './db.js';
import { LEVELS } from '../src/levels/levels.js';
import { CONFIG } from '../src/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const TOP_N = 15;
const MAX_NAME_LEN = 20;

// --- Barème, lu dans les vrais niveaux (src/levels/levels.js) et src/config.js ---
const N_LEVELS = Object.keys(LEVELS).length;
const LEVEL_MAX = {};     // par niveau : fruits, caisses, bonus temps max
for (const [num, L] of Object.entries(LEVELS)) {
  LEVEL_MAX[num] = { fruits: L.fruitPositions.length, boxes: L.boxes.length, time: L.time || CONFIG.levelTime };
}
const LIFE_BONUS = CONFIG.lifeBonus;
const MAX_LIVES = CONFIG.maxLives;
// Garde-fou : score MAX réellement atteignable (tous les fruits, caisses, temps et vies).
const MAX_SCORE = Object.values(LEVEL_MAX).reduce((sum, m) => sum + m.fruits * 10 + m.boxes * 50 + m.time, 0)
  + MAX_LIVES * LIFE_BONUS;

// --- Parties en cours (anti score arbitraire / anti-rejeu) ---
const runs = new Map();                  // runId -> { startTs, submitted }
const RUN_TTL_MS = 60 * 60 * 1000;       // une partie expire après 1 h
const MIN_MS_PER_LEVEL = 5000;           // pas de run "instantané" (auto/script)

// --- Rate limiting par IP ---
const RL_MAX = 20;                   // requêtes max (start + submit)
const RL_WINDOW_MS = 10 * 60 * 1000; // par fenêtre de 10 min
const rlHits = new Map();            // ip -> [timestamps]

const app = express();
app.use(express.json({ limit: '8kb' }));

// IP du joueur : derrière Cloudflare (tunnel), la socket vient du tunnel, donc
// on lit l'en-tête CF-Connecting-IP posé par Cloudflare ; fallbacks ensuite.
function clientIp(req) {
  return req.headers['cf-connecting-ip']
    || (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.ip || 'unknown';
}

function rateLimited(ip) {
  const now = Date.now();
  const arr = (rlHits.get(ip) || []).filter(t => now - t < RL_WINDOW_MS);
  rlHits.set(ip, arr);
  if (arr.length >= RL_MAX) return true;
  arr.push(now);
  return false;
}

function pruneRuns() {
  const now = Date.now();
  for (const [id, r] of runs) if (now - r.startTs > RUN_TTL_MS) runs.delete(id);
}

// Recalcule le score depuis les stats par niveau, en VALIDANT tout :
// ordre strict 1..N, maxima réels par niveau, un seul niveau non terminé (et en
// dernier = game over). Renvoie { ok, score } ou { ok:false }.
function computeScore(levels) {
  if (!Array.isArray(levels) || levels.length === 0 || levels.length > N_LEVELS) {
    return { ok: false };
  }
  let score = 0;
  let allCompleted = true;
  let lastLives = MAX_LIVES;
  for (let i = 0; i < levels.length; i++) {
    const L = levels[i] || {};
    if (L.level !== i + 1) return { ok: false };          // séquence stricte
    const max = LEVEL_MAX[L.level];
    if (!max) return { ok: false };
    const { fruits, boxes, timeLeft, lives } = L;
    if (!Number.isInteger(fruits) || fruits < 0 || fruits > max.fruits) return { ok: false };
    if (!Number.isInteger(boxes) || boxes < 0 || boxes > max.boxes) return { ok: false };
    if (!Number.isInteger(lives) || lives < 0 || lives > MAX_LIVES) return { ok: false };
    const completed = L.completed === true;
    if (!completed && i !== levels.length - 1) return { ok: false }; // trou = game over final
    score += fruits * 10 + boxes * 50;
    if (completed) {
      if (!Number.isInteger(timeLeft) || timeLeft < 0 || timeLeft > max.time) return { ok: false };
      score += timeLeft; // bonus temps
    } else {
      allCompleted = false;
    }
    lastLives = lives;
  }
  // Victoire (5 niveaux terminés) → bonus de vies.
  if (allCompleted && levels.length === N_LEVELS) {
    score += Math.min(lastLives, MAX_LIVES) * LIFE_BONUS;
  }
  if (score < 0 || score > MAX_SCORE) return { ok: false };
  return { ok: true, score };
}

// Nettoie un pseudo : ne garde que lettres / chiffres / espace / _ / - (ce qui
// élimine au passage les caractères de contrôle), puis borne la longueur.
function sanitizeName(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, MAX_NAME_LEN);
  return cleaned.length > 0 ? cleaned : null;
}

app.get('/api/scores', (_req, res) => {
  res.json({ scores: getTop(TOP_N) });
});

// Ouvre une partie : le serveur en garde la trace (horodatage) pour valider la
// soumission finale. Le client appelle ça au démarrage du niveau 1.
app.post('/api/run/start', (req, res) => {
  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'Trop de requêtes, réessaie plus tard.' });
  }
  pruneRuns();
  const runId = crypto.randomUUID();
  runs.set(runId, { startTs: Date.now(), submitted: false });
  res.status(201).json({ runId });
});

app.post('/api/scores', (req, res) => {
  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'Trop de soumissions, réessaie plus tard.' });
  }

  const { runId, name, levels } = req.body || {};

  // La partie doit exister, ne pas avoir expiré, ni avoir déjà été soumise.
  const run = runId && runs.get(runId);
  if (!run) return res.status(403).json({ error: 'Partie inconnue ou expirée.' });
  if (run.submitted) return res.status(409).json({ error: 'Score déjà enregistré.' });

  // Durée minimale plausible (anti run instantané / scripté).
  const minMs = MIN_MS_PER_LEVEL * (Array.isArray(levels) ? levels.length : 0);
  if (Date.now() - run.startTs < minMs) {
    return res.status(403).json({ error: 'Partie trop rapide pour être valide.' });
  }

  // Le SERVEUR calcule le score (le client n'en envoie aucun).
  const r = computeScore(levels);
  if (!r.ok) return res.status(400).json({ error: 'Données de partie invalides.' });

  const cleanName = sanitizeName(name);
  if (!cleanName) return res.status(400).json({ error: 'Pseudo invalide.' });

  run.submitted = true; // verrou anti-rejeu : une partie = une soumission
  const rank = insertScore(cleanName, r.score);
  res.status(201).json({ rank, score: r.score, scores: getTop(TOP_N) });
});

// Build statique (prod) si présent.
const distDir = join(__dirname, '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  // Catch-all SPA (Express 5 : pas de `app.get('*')`, on utilise un middleware).
  app.use((req, res) => res.sendFile(join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[scores] API en écoute sur http://localhost:${PORT}`);
});
