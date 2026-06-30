// Couche d'accès aux scores (SQLite via better-sqlite3).
//
// Base de données : server/data/scores.db (créée au besoin). La table
// `scores` garde tous les scores ; on ne renvoie que le Top N côté API.

import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'scores.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    score      INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scores_score ON scores (score DESC, created_at ASC);
`);

const stmtTop = db.prepare(
  // Tri : meilleur score d'abord ; à égalité, le plus ancien d'abord.
  'SELECT name, score, created_at AS date FROM scores ORDER BY score DESC, created_at ASC LIMIT ?',
);
const stmtInsert = db.prepare(
  'INSERT INTO scores (name, score, created_at) VALUES (?, ?, ?)',
);
// Rang = nombre de scores strictement meilleurs + 1. À score égal, les entrées
// déjà présentes (donc plus anciennes) passent devant la nouvelle.
const stmtRank = db.prepare(
  'SELECT COUNT(*) AS better FROM scores WHERE score > ? OR (score = ? AND created_at < ?)',
);

export function getTop(limit = 15) {
  return stmtTop.all(limit);
}

export function insertScore(name, score) {
  const createdAt = Date.now();
  stmtInsert.run(name, score, createdAt);
  const { better } = stmtRank.get(score, score, createdAt);
  return better + 1; // rang (1 = meilleur)
}
