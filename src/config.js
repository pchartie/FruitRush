/* Architecture du projet Fruit Rush
 *
 * But: Jeu de plateforme 2D, 1 niveau, sans ennemis
 * - Ramasser des fruits = points
 * - Éviter les trous (tomber = perdre une vie)
 * - Atteindre le drapeau de fin = victoire
 * - 3 vies
 *
 * Flow: MenuScene → GameScene → GameOverScene / VictoryScene
 */

export const CONFIG = {
  // Dimensions du rendu interne (le canvas est ensuite mis à l'échelle
  // de la fenêtre via Phaser.Scale.FIT). On bosse à 1000x750 plutôt qu'à
  // 800x600 + zoom 0.8 pour éviter l'aliasing dû au zoom fractionnaire.
  width: 1000,
  height: 750,

  // Monde (scroll horizontal)
  world: {
    width: 4800,
    height: 600,
  },

  // Joueur
  player: {
    speed: 260,
    jumpVelocity: -480,
    gravity: 900,
    startX: 100,
    startY: 400,
  },

  // Physique
  physics: {
    gravity: 900,
  },

  // UI
  ui: {
    score: { x: 16, y: 16, size: 24, color: '#fff' },
    lives: { x: 16, y: 48, size: 20, color: '#fff' },
    fruits: { x: 16, y: 76, size: 18, color: '#ffd700' },
  },

  // Vie
  maxLives: 3,
  fruitCountToWin: 15,
  // Bonus de fin de jeu : chaque vie restante rapporte ce nombre de points
  // (3 vies × 200 = 600 points max).
  lifeBonus: 200,
  // Temps imparti par niveau (secondes). À 0 : on recommence le niveau en
  // perdant un cœur (game over si c'était le dernier).
  levelTime: 60,
};
