import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { buildButton } from '../ui/buildButton.js';
import { buildTitle } from '../ui/buildTitle.js';
import { setupMuteToggle } from '../ui/setupMuteToggle.js';
import { mountHighScores } from '../ui/mountHighScores.js';
import { Sfx } from '../audio/Sfx.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.finalScore = data.score || 0;
  }

  create() {
    const cx = CONFIG.width / 2;

    this.cameras.main.setBackgroundColor('#1a0000');

    // La musique a déjà été stoppée à la mort ; on assure le mute UI.
    // bindKey=false : une saisie de pseudo peut être active sur cet écran.
    Sfx.init(this.sound);
    Sfx.stopMusic();
    setupMuteToggle(this, { bindKey: false });

    // Titre + sous-titre (remontés pour laisser place au classement).
    buildTitle(this, {
      x: cx, y: 80, text: 'GAME OVER',
      color: '#ff4444', stroke: '#3a0a0a', fontSize: 72,
    });
    this.add.text(cx, 140, '« Tu as épuisé toutes tes vies »', {
      fontSize: '20px', fontFamily: 'Arial', fontStyle: 'italic',
      color: '#ff9999', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Score final.
    this.add.text(cx, 178, `Score final : ${this.finalScore}`, {
      fontSize: '28px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Classement (asynchrone) : saisie pseudo si Top 10, sinon liste.
    mountHighScores(this, { score: this.finalScore, x: cx, y: 215, width: 440 });

    // Mort punitive : pas de « Recommencer ». Retour au menu uniquement.
    buildButton(this, {
      x: cx, y: 660, label: 'MENU', preset: 'gray',
      width: 300, height: 64,
      onClick: () => {
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => this.scene.start('MenuScene'));
      },
    });

    this.cameras.main.fadeIn(500);
  }
}
