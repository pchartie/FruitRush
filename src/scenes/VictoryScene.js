import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { buildButton } from '../ui/buildButton.js';
import { buildTitle } from '../ui/buildTitle.js';
import { setupMuteToggle } from '../ui/setupMuteToggle.js';
import { mountHighScores } from '../ui/mountHighScores.js';
import { Sfx } from '../audio/Sfx.js';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.baseScore = data.baseScore != null ? data.baseScore : this.finalScore;
    this.lifeBonus = data.lifeBonus || 0;
    this.finalFruits = data.fruitsCollected || 0;
    this.finalTotal = data.fruitTotal || 0;
    this.remainingLives = data.lives || 0;
  }

  create() {
    const cx = CONFIG.width / 2;

    this.cameras.main.setBackgroundColor('#0a2a0a');

    // Le jingle de victoire a été joué par reachFlag ; on stoppe la musique.
    // bindKey=false : une saisie de pseudo peut être active sur cet écran.
    Sfx.init(this.sound);
    Sfx.stopMusic();
    setupMuteToggle(this, { bindKey: false });

    // Titre doré + étincelles.
    buildTitle(this, {
      x: cx, y: 76, text: 'VICTOIRE !',
      color: '#ffd700', stroke: '#3a2a05', fontSize: 76,
    });
    this._buildSparkles(76);

    this.add.text(cx, 134, '✦  Félicitations, jeu terminé !  ✦', {
      fontSize: '20px', fontFamily: 'Arial', fontStyle: 'italic bold',
      color: '#aaffaa', stroke: '#1a3a0a', strokeThickness: 4,
    }).setOrigin(0.5);

    // 🍎 Fruits collectés.
    this.add.text(cx, 160, `🍎 ${this.finalFruits}/${this.finalTotal}`, {
      fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Libellé du bonus cœurs (apparaît en fondu pendant le décompte).
    this.bonusLabel = this.add.text(cx, 192, `Bonus cœurs  ·  +${CONFIG.lifeBonus} pts chacun`, {
      fontSize: '17px', fontFamily: 'Arial', fontStyle: 'italic bold',
      color: '#ff9a9a', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    // Score total : démarre à la base, animé jusqu'au total final pendant que
    // les cœurs sont crédités un par un (cf. _tallyLifeBonus).
    this.scoreValue = this.baseScore;
    this.scoreText = this.add.text(cx, 270, `Score total : ${this.baseScore}`, {
      fontSize: '30px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      color: '#ffd700', stroke: '#1a3a0a', strokeThickness: 5,
    }).setOrigin(0.5);

    // Classement (asynchrone) — affiché avec le score final autoritatif.
    mountHighScores(this, { score: this.finalScore, x: cx, y: 316, width: 440 });

    // Décompte des cœurs -> points, une fois l'écran apparu.
    this.time.delayedCall(800, () => this._tallyLifeBonus());

    // Boutons côte à côte en bas.
    buildButton(this, {
      x: cx - 165, y: 660, label: 'REJOUER', preset: 'green', icon: 'play',
      width: 300, height: 64,
      onClick: () => {
        this.registry.set('currentLevel', 1);
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => this.scene.start('GameScene', { level: 1 }));
      },
    });
    buildButton(this, {
      x: cx + 165, y: 660, label: 'MENU', preset: 'gray',
      width: 300, height: 64,
      onClick: () => {
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => this.scene.start('MenuScene'));
      },
    });

    this.cameras.main.fadeIn(500);
  }

  // Crédite le bonus de vies au score, façon décompte de fin de niveau : chaque
  // cœur restant est "consommé" (fonce vers le score) et ajoute lifeBonus au
  // total affiché, son de pièce + pop à l'arrivée. Rend le bonus explicite au
  // lieu d'un total déjà calculé qui sortait de nulle part.
  _tallyLifeBonus() {
    const n = Math.max(0, this.remainingLives);
    if (n <= 0) {
      // Aucun cœur : le total affiché est déjà le final, juste un petit éclat.
      this._flashScore();
      return;
    }
    const cx = CONFIG.width / 2;
    const heartY = 226;
    const spacing = 52;
    const startX = cx - ((n - 1) * spacing) / 2;

    // Le libellé du bonus apparaît en fondu.
    this.tweens.add({ targets: this.bonusLabel, alpha: 1, duration: 300 });

    // Rangée de cœurs qui battent en attendant d'être crédités.
    const hearts = [];
    for (let i = 0; i < n; i++) {
      const h = this.add.text(startX + i * spacing, heartY, '❤', {
        fontSize: '40px', color: '#ff4d4d', stroke: '#5a0000', strokeThickness: 4,
      }).setOrigin(0.5);
      this.tweens.add({
        targets: h, scaleX: 1.12, scaleY: 1.12,
        duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 90,
      });
      hearts.push(h);
    }

    // Consomme les cœurs un par un, en cadence.
    const step = 520;
    hearts.forEach((h, i) => {
      this.time.delayedCall(700 + i * step, () => this._consumeHeart(h, i === n - 1));
    });
  }

  // Anime un cœur : petit sursaut, puis il file vers le score et s'estompe.
  _consumeHeart(heart, isLast) {
    const cx = CONFIG.width / 2;
    this.tweens.killTweensOf(heart);
    this.tweens.add({
      targets: heart, scaleX: 1.6, scaleY: 1.6, duration: 130, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: heart,
          x: cx, y: this.scoreText.y,
          scaleX: 0.2, scaleY: 0.2, alpha: 0,
          duration: 320, ease: 'Cubic.easeIn',
          onComplete: () => {
            heart.destroy();
            this._creditLifeBonus(isLast);
          },
        });
      },
    });
  }

  // Ajoute lifeBonus au total affiché (le dernier cœur cale pile sur le final),
  // avec tintement de pièce + pop du texte de score.
  _creditLifeBonus(isLast) {
    this.scoreValue = isLast ? this.finalScore : this.scoreValue + CONFIG.lifeBonus;
    this.scoreText.setText(`Score total : ${this.scoreValue}`);
    Sfx.coin();
    this.scoreText.setScale(1);
    this.tweens.add({
      targets: this.scoreText, scaleX: 1.18, scaleY: 1.18,
      duration: 120, yoyo: true, ease: 'Quad.easeOut',
    });
    if (isLast) this.time.delayedCall(180, () => this._flashScore());
  }

  // Éclat final sur le score : gros pulse doré + petite gerbe d'étoiles.
  _flashScore() {
    this.tweens.add({
      targets: this.scoreText, scaleX: 1.3, scaleY: 1.3,
      duration: 220, yoyo: true, ease: 'Quad.easeOut',
    });
    this.scoreText.setColor('#fff6b0');
    this.time.delayedCall(280, () => this.scoreText.setColor('#ffd700'));
    const x = CONFIG.width / 2;
    const y = this.scoreText.y;
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI * 2 * i) / 8;
      const star = this.add.text(x, y, '✦', {
        fontSize: '22px', color: '#ffe88a', stroke: '#3a2a05', strokeThickness: 2,
      }).setOrigin(0.5);
      this.tweens.add({
        targets: star,
        x: x + Math.cos(ang) * 90,
        y: y + Math.sin(ang) * 90,
        alpha: 0, scaleX: 0.3, scaleY: 0.3,
        duration: 600, ease: 'Cubic.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }

  // Petites étoiles dorées scintillantes autour du titre.
  _buildSparkles(yLine) {
    const cx = CONFIG.width / 2;
    const positions = [
      { x: cx - 280, y: yLine - 20, scale: 1.1 },
      { x: cx - 320, y: yLine + 40, scale: 0.8 },
      { x: cx + 280, y: yLine - 20, scale: 1.1 },
      { x: cx + 320, y: yLine + 40, scale: 0.8 },
      { x: cx - 220, y: yLine + 64, scale: 0.7 },
      { x: cx + 220, y: yLine + 64, scale: 0.7 },
    ];
    positions.forEach((p, i) => {
      const star = this.add.text(p.x, p.y, '✦', {
        fontSize: '34px', color: '#ffe88a', stroke: '#3a2a05', strokeThickness: 3,
      }).setOrigin(0.5).setScale(p.scale);
      this.tweens.add({
        targets: star, alpha: { from: 1, to: 0.35 },
        scaleX: p.scale * 1.25, scaleY: p.scale * 1.25,
        duration: 700 + (i * 80), yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: i * 150,
      });
      this.tweens.add({
        targets: star, angle: 360, duration: 8000 + i * 500, repeat: -1, ease: 'Linear',
      });
    });
  }
}
