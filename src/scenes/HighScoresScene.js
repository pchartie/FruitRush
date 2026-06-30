import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { buildCloseButton } from '../ui/buildCloseButton.js';
import { buildScoreList } from '../ui/buildScoreList.js';
import { fetchScores } from '../api/scores.js';

// Overlay « Meilleurs scores » ouvert depuis le menu (même pattern que
// SettingsScene : la scène appelante fait pause + launch ; la fermeture
// reprend la scène appelante et stoppe cet overlay).
export class HighScoresScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HighScoresScene' });
  }

  init(data) {
    this.returnTo = data.returnTo || 'MenuScene';
  }

  create() {
    const cx = CONFIG.width / 2;
    const cy = CONFIG.height / 2;

    this.add.rectangle(0, 0, CONFIG.width, CONFIG.height, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive();

    const PW = 560;
    const PH = 560;
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.4);
    panel.fillRoundedRect(cx - PW / 2 + 4, cy - PH / 2 + 6, PW, PH, 22);
    panel.fillStyle(0x143306, 1);
    panel.fillRoundedRect(cx - PW / 2, cy - PH / 2, PW, PH, 22);
    panel.lineStyle(3, 0x6ad24a, 1);
    panel.strokeRoundedRect(cx - PW / 2, cy - PH / 2, PW, PH, 22);

    const topY = cy - PH / 2 + 40;
    const loading = this.add.text(cx, topY + 60, 'Chargement…', {
      fontSize: '20px', fontFamily: 'Arial', fontStyle: 'italic',
      color: '#cccccc', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    fetchScores()
      .then((scores) => {
        loading.destroy();
        buildScoreList(this, { x: cx, y: topY, scores, width: 460 });
      })
      .catch(() => {
        loading.setText('Classement indisponible\n(serveur hors-ligne).');
        loading.setAlign('center').setOrigin(0.5, 0);
      });

    // Bouton fermer (icône Close) en haut-droite du panneau ; Échap ferme aussi.
    buildCloseButton(this, {
      x: cx + PW / 2 - 24, y: cy - PH / 2 + 24,
      onClick: () => this._close(),
    });

    this.input.keyboard.on('keydown-ESC', () => this._close());
  }

  _close() {
    this.scene.resume(this.returnTo);
    this.scene.stop();
  }
}
