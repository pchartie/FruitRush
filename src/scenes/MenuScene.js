import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { buildButton } from '../ui/buildButton.js';
import { buildTitle } from '../ui/buildTitle.js';
import { buildSectionLabel } from '../ui/buildSectionLabel.js';
import { setupMuteToggle } from '../ui/setupMuteToggle.js';
import { loadAudio } from '../audio/loadAudio.js';
import { Sfx } from '../audio/Sfx.js';

const CHARS = ['virtual_guy', 'pink_man', 'ninja_frog', 'mask_dude'];
const CHAR_LABELS = {
  virtual_guy: 'Virtual Guy',
  pink_man: 'Pink Man',
  ninja_frog: 'Ninja Frog',
  mask_dude: 'Mask Dude',
};

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  preload() {
    // Spritesheets idle uniquement (suffisant pour la prévisualisation animée).
    CHARS.forEach(char => {
      this.load.spritesheet(`${char}_idle`, `assets/main_characters/${char}/Idle (32x32).png`, {
        frameWidth: 32, frameHeight: 32,
      });
    });
    loadAudio(this);
    this.load.image('btn_volume', 'assets/menu/buttons/Volume.png');
    this.load.image('btn_close', 'assets/menu/buttons/Close.png');
  }

  create() {
    const cx = CONFIG.width / 2;

    this.cameras.main.setBackgroundColor('#2d5016');

    // Audio : init du Sound Manager (idempotent), musique de menu, contrôle mute.
    Sfx.init(this.sound);
    // Écran d'accueil silencieux : on coupe toute musique éventuelle.
    Sfx.stopMusic();
    setupMuteToggle(this);

    // Bouton Réglages (haut gauche) : ouvre l'overlay de volume.
    this.add.text(16, 16, '⚙ Réglages', {
      fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffe88a', stroke: '#1a3a0a', strokeThickness: 4,
    }).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.pause('MenuScene');
        this.scene.launch('SettingsScene', {
          returnTo: 'MenuScene', title: 'RÉGLAGES', closeLabel: 'FERMER', closeIcon: true,
        });
      });

    // Bouton Meilleurs scores (sous Réglages).
    this.add.text(16, 50, '🏆 Meilleurs scores', {
      fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffe88a', stroke: '#1a3a0a', strokeThickness: 4,
    }).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.pause('MenuScene');
        this.scene.launch('HighScoresScene', { returnTo: 'MenuScene' });
      });

    // Anims idle pour les previews — réutilisées par GameScene ensuite.
    CHARS.forEach(char => {
      if (this.anims.exists(`${char}_idle`)) return;
      this.anims.create({
        key: `${char}_idle`,
        frames: this.anims.generateFrameNumbers(`${char}_idle`, { start: 0, end: 10 }),
        frameRate: 12,
        repeat: -1,
      });
    });

    // Titre monochrome doré avec ombre portée et pulsation.
    buildTitle(this, { x: cx, y: 110, text: 'Fruit Rush' });

    // Sous-titre encadré d'étoiles.
    this.add.text(cx, 200, '✦   Une aventure fruitée vous attend !   ✦', {
      fontSize: '22px', fontFamily: 'Arial', fontStyle: 'italic bold',
      color: '#ffe88a', stroke: '#1a3a0a', strokeThickness: 4,
    }).setOrigin(0.5);

    // === Sélection du perso ===
    buildSectionLabel(this, { x: cx, y: 260, text: 'Choisis ton héros' });

    this.selectedChar = 'virtual_guy';
    const cardsY = 360;
    const cardSpacing = 130;
    const cardsStartX = cx - cardSpacing * 1.5;

    this.charCards = CHARS.map((char, i) => {
      const x = cardsStartX + i * cardSpacing;
      const card = this.add.rectangle(x, cardsY, 100, 120, 0x1a3a0a, 0.75)
        .setStrokeStyle(2, 0xffffff);
      const sprite = this.add.sprite(x, cardsY - 14, `${char}_idle`, 0)
        .setScale(2);
      sprite.play(`${char}_idle`);
      const label = this.add.text(x, cardsY + 38, CHAR_LABELS[char], {
        fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold',
        color: '#fff', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => this._select(char));
      card.on('pointerover', () => {
        if (this.selectedChar !== char) card.setStrokeStyle(3, 0xffff66);
      });
      card.on('pointerout', () => {
        if (this.selectedChar !== char) card.setStrokeStyle(2, 0xffffff);
      });
      return { card, sprite, label, char };
    });
    this._refreshCards();

    // === Bouton Jouer ===
    buildButton(this, {
      x: cx, y: 540,
      label: 'JOUER',
      preset: 'green',
      icon: 'play',
      width: 260, height: 76,
      onClick: () => {
        this.registry.set('char', this.selectedChar);
        this.registry.set('currentLevel', 1);
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
          this.scene.start('GameScene', { char: this.selectedChar, level: 1 });
        });
      },
    });

    this.cameras.main.fadeIn(500);
  }

  _select(char) {
    this.selectedChar = char;
    this._refreshCards();
  }

  _refreshCards() {
    this.charCards.forEach(({ card, sprite, char }) => {
      const isSel = char === this.selectedChar;
      card.setStrokeStyle(isSel ? 4 : 2, isSel ? 0xffd700 : 0xffffff);
      card.setFillStyle(isSel ? 0x2d5016 : 0x1a3a0a, isSel ? 0.9 : 0.75);
      sprite.setScale(isSel ? 2.5 : 2);
    });
  }

}
