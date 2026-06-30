// Orchestration du classement sur un écran de fin (Game Over / Victoire).
//
// Flux : récupère le Top 10 → si le score qualifie, propose la saisie du pseudo
// puis l'enregistre (POST) et affiche la liste avec la nouvelle entrée en
// surbrillance ; sinon affiche directement la liste. Tolérant aux pannes : si
// le serveur est indisponible, affiche un message sans casser la scène.
//
// Tout est ancré en (x, y) = haut-centre de la zone classement.

import { fetchScores, submitScore, qualifies } from '../api/scores.js';
import { buildScoreList } from './buildScoreList.js';
import { buildNameEntry } from './buildNameEntry.js';

export async function mountHighScores(scene, { score, x, y, width = 460 }) {
  // Scoring autoritatif : la soumission référence la partie (runId) + les stats
  // par niveau (runLevels), le serveur recalcule le score. `score` ne sert ici
  // qu'à l'affichage et au test "est-ce que je rentre dans le top 10".
  const runId = scene.registry.get('runId');
  const levels = scene.registry.get('runLevels') || [];
  const info = (msg, dy = 60, color = '#cccccc') =>
    scene.add.text(x, y + dy, msg, {
      fontSize: '18px', fontFamily: 'Arial', fontStyle: 'italic',
      color, stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

  const loading = info('Chargement du classement…');

  let scores;
  try {
    scores = await fetchScores();
  } catch (e) {
    loading.setText('Classement indisponible (serveur hors-ligne).');
    return;
  }
  loading.destroy();

  // Écrans Victoire/Game Over : place serrée (boutons en bas) → liste compacte
  // pour que les 15 lignes tiennent. La modale du menu, elle, reste en grand.
  if (!qualifies(score, scores)) {
    buildScoreList(scene, { x, y, scores, width, rowHeight: 22, fontSize: 16 });
    return;
  }

  // Le score entre au classement : on demande le pseudo.
  const banner = scene.add.text(x, y, '🏆 Nouveau record ! Entre ton pseudo :', {
    fontSize: '24px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    color: '#ffd700', stroke: '#1a3a0a', strokeThickness: 5,
  }).setOrigin(0.5, 0);

  let submitted = false;

  // Petit rappel : le score est gardé même sans valider, dès qu'un pseudo est tapé.
  const hint = scene.add.text(x, y + 156, '(ton score est enregistré même si tu quittes, dès 1 caractère)', {
    fontSize: '13px', fontFamily: 'Arial', fontStyle: 'italic',
    color: '#aaffaa', stroke: '#000', strokeThickness: 2,
  }).setOrigin(0.5, 0);

  const entry = buildNameEntry(scene, {
    x, y: y + 90, prompt: '',
    onSubmit: async (name) => {
      submitted = true;
      entry.container.destroy();
      banner.destroy();
      hint.destroy();
      const posting = info('Enregistrement…', 40, '#ffe88a');
      try {
        const { rank, scores: updated } = await submitScore({ runId, name, levels });
        posting.destroy();
        buildScoreList(scene, { x, y, scores: updated, highlightIndex: rank - 1, width, rowHeight: 22, fontSize: 16 });
      } catch (e) {
        posting.setText('Échec de l’enregistrement (serveur hors-ligne).');
      }
    },
  });

  // Filet de sécurité : si le joueur quitte l'écran (Rejouer / Menu) sans
  // appuyer sur Entrée, on enregistre quand même le score dès qu'il y a ≥1
  // caractère. fire-and-forget : la requête réseau survit à la destruction
  // de la scène. Idempotence : `submitted` évite un double envoi.
  scene.events.once('shutdown', () => {
    if (submitted) return;
    const name = entry.getName().trim();
    if (name.length >= 1) {
      submitted = true;
      submitScore({ runId, name, levels }).catch(() => {});
    }
  });
}
