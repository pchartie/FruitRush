// Client API des high scores. En dev, Vite proxifie /api vers le serveur
// Express (port 3001) ; en prod, même origine. Toutes les fonctions sont
// asynchrones (réseau) et lèvent en cas d'échec — l'appelant gère l'erreur
// pour que le jeu ne casse pas si le serveur est indisponible.

const ENDPOINT = '/api/scores';
export const MAX_SCORES = 15;

// Ouvre une partie côté serveur (scoring autoritatif). Renvoie le runId à
// transmettre lors de la soumission finale. Appelé au démarrage du niveau 1.
export async function startRun() {
  const res = await fetch('/api/run/start', { method: 'POST' });
  if (!res.ok) throw new Error(`POST /api/run/start → ${res.status}`);
  const data = await res.json();
  return data.runId;
}

export async function fetchScores() {
  const res = await fetch(ENDPOINT);
  if (!res.ok) throw new Error(`GET ${ENDPOINT} → ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.scores) ? data.scores : [];
}

// Soumet la partie : le client n'envoie PAS de score, seulement le runId, le
// pseudo et les stats par niveau ; le serveur recalcule et insère le score.
// Renvoie { rank, score, scores }.
export async function submitScore({ runId, name, levels }) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, name, levels }),
  });
  if (!res.ok) throw new Error(`POST ${ENDPOINT} → ${res.status}`);
  return res.json();
}

// Le score entre-t-il dans le classement (côté client, à partir de la liste
// déjà récupérée) ? Vrai si la liste n'est pas pleine, ou si le score dépasse
// le dernier. Un score nul ne qualifie pas.
export function qualifies(score, scores, max = MAX_SCORES) {
  if (!Number.isFinite(score) || score <= 0) return false;
  if (scores.length < max) return true;
  return score > scores[scores.length - 1].score;
}
