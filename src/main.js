import Phaser from 'phaser';
import { CONFIG } from './config.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { VictoryScene } from './scenes/VictoryScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { HighScoresScene } from './scenes/HighScoresScene.js';

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#87CEEB',
  // Scale Manager : le rendu interne reste 800x600 (toutes les coords du
  // jeu sont inchangées) mais le canvas est redimensionné pour remplir au
  // mieux la fenêtre du navigateur en gardant le ratio 4:3.
  scale: {
    parent: document.body,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CONFIG.width,
    height: CONFIG.height,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: CONFIG.physics.gravity },
      debug: false,
    },
  },
  scene: [MenuScene, GameScene, GameOverScene, VictoryScene, SettingsScene, HighScoresScene],
  pixelArt: true,
};

const game = new Phaser.Game(config);

// En développement seulement : accès au jeu depuis la console (tests, débogage).
if (import.meta.env.DEV) window.game = game;
