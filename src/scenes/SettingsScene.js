import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { buildButton } from '../ui/buildButton.js';
import { buildCloseButton } from '../ui/buildCloseButton.js';
import { buildSlider } from '../ui/buildSlider.js';
import { Sfx } from '../audio/Sfx.js';
import { ACTIONS, getControls, setBinding, resetControls, keyLabel } from '../controls.js';

const ESC = Phaser.Input.Keyboard.KeyCodes.ESC;

// Overlay de réglages à onglets (Audio / Contrôles), réutilisé par le menu
// (bouton ⚙) et par la pause en jeu (Échap). La scène appelante fait
// `scene.pause(caller)` + `scene.launch('SettingsScene', { returnTo, title,
// closeLabel })`. La fermeture reprend la scène appelante et s'arrête.
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  init(data) {
    this.returnTo = data.returnTo || 'MenuScene';
    this.titleText = data.title || 'RÉGLAGES';
    this.closeLabel = data.closeLabel || 'FERMER';
    // Fermeture en icône Close (ouverture depuis le menu) plutôt qu'en bouton
    // texte. La pause en jeu garde le bouton texte « REPRENDRE ».
    this.closeIcon = data.closeIcon === true;
    this._capturing = null;
    this._keyButtons = [];
    this._tabs = {};
    this._activeTab = 'audio';
  }

  create() {
    const cx = CONFIG.width / 2;
    const cy = CONFIG.height / 2;

    Sfx.init(this.sound);

    // Fond assombri plein écran (capte les clics).
    this.add.rectangle(0, 0, CONFIG.width, CONFIG.height, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive();

    // Panneau central.
    const PW = 580;
    // Avec l'icône Close (haut-droite), le contenu s'arrête vers top+322 : on
    // ajuste la hauteur pour rester centré, sans le vide laissé par l'ancien
    // gros bouton Fermer. En pause, le bouton texte du bas a besoin de la place.
    const PH = this.closeIcon ? 360 : 480;
    const top = cy - PH / 2;
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.4);
    panel.fillRoundedRect(cx - PW / 2 + 4, top + 6, PW, PH, 22);
    panel.fillStyle(0x143306, 1);
    panel.fillRoundedRect(cx - PW / 2, top, PW, PH, 22);
    panel.lineStyle(3, 0x6ad24a, 1);
    panel.strokeRoundedRect(cx - PW / 2, top, PW, PH, 22);

    // Titre.
    this.add.text(cx, top + 34, this.titleText, {
      fontSize: '32px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      color: '#ffd700', stroke: '#1a3a0a', strokeThickness: 6,
    }).setOrigin(0.5);

    // Onglets.
    this._tabButton(cx - 90, top + 80, 'AUDIO', 'audio');
    this._tabButton(cx + 90, top + 80, 'CONTRÔLES', 'controls');

    // Contenu de chaque onglet dans son propre container (toggle visible).
    this.audioTab = this.add.container(0, 0);
    this.controlsTab = this.add.container(0, 0);
    this._buildAudioTab(cx, top);
    this._buildControlsTab(cx, top);

    // Fermeture (toujours visible) : icône Close en haut-droite du panneau si
    // ouvert depuis le menu, sinon bouton texte (« REPRENDRE » en pause).
    if (this.closeIcon) {
      buildCloseButton(this, {
        x: cx + PW / 2 - 24, y: top + 24,
        onClick: () => this._close(),
      });
    } else {
      buildButton(this, {
        x: cx, y: top + PH - 44, label: this.closeLabel, preset: 'green',
        width: 240, height: 56,
        onClick: () => this._close(),
      });
    }

    // Handler clavier unique : capture d'une touche (onglet Contrôles) OU Échap = fermeture.
    this.input.keyboard.on('keydown', this._onKey, this);

    this._showTab('audio');
  }

  /* ---------------- Onglets ---------------- */

  _tabButton(x, y, label, name) {
    const w = 168;
    const h = 40;
    const g = this.add.graphics();
    const text = this.add.text(x, y, label, {
      fontSize: '20px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffffff', stroke: '#0d4a23', strokeThickness: 3,
    }).setOrigin(0.5);
    const draw = () => {
      const active = this._activeTab === name;
      g.clear();
      g.fillStyle(active ? 0x1f8a4c : 0x0a2406, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      g.lineStyle(2, active ? 0xffd700 : 0x3a6a1a, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      text.setColor(active ? '#ffffff' : '#9bbf86');
    };
    this.add.zone(x, y, w, h)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showTab(name));
    this._tabs[name] = draw;
  }

  _showTab(name) {
    this._activeTab = name;
    // Annule une éventuelle capture en quittant l'onglet Contrôles.
    if (name !== 'controls' && this._capturing) {
      this._capturing = null;
      this._refreshKeys();
    }
    this.audioTab.setVisible(name === 'audio');
    this.controlsTab.setVisible(name === 'controls');
    Object.values(this._tabs).forEach((draw) => draw());
  }

  /* ---------------- Onglet Audio ---------------- */

  _buildAudioTab(cx, top) {
    const music = buildSlider(this, {
      x: cx, y: top + 150, width: 380, label: 'Musique',
      value: Sfx.getMusicVolume(), fillColor: 0x6ad24a,
      onChange: (v) => Sfx.setMusicVolume(v),
    });
    const sfx = buildSlider(this, {
      x: cx, y: top + 212, width: 380, label: 'Effets',
      value: Sfx.getSfxVolume(), fillColor: 0xf2a655,
      onChange: (v) => Sfx.setSfxVolume(v),
      onChangeEnd: () => Sfx.previewSfx(),
    });

    this.muteToggle = this.add.text(cx, top + 268, '', {
      fontSize: '20px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this._refreshMute();
    const muteZone = this.add.zone(cx, top + 268, 480, 40)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { Sfx.toggleMute(); this._refreshMute(); });

    this.audioTab.add([music.container, sfx.container, this.muteToggle, muteZone]);
  }

  /* ---------------- Onglet Contrôles ---------------- */

  _buildControlsTab(cx, top) {
    const hint = this.add.text(cx, top + 132, 'Clique une touche puis appuie sur la nouvelle (Échap annule)', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'italic',
      color: '#cccccc', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.controlsTab.add(hint);

    ACTIONS.forEach((action, i) => {
      const ry = top + 168 + i * 40;
      const lbl = this.add.text(cx - 240, ry, action.label, {
        fontSize: '20px', fontFamily: 'Arial', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0, 0.5);
      this.controlsTab.add(lbl);
      this._keyButton(cx + 40, ry, action.id, 0);
      this._keyButton(cx + 200, ry, action.id, 1);
    });
    this._refreshKeys();

    const reset = buildButton(this, {
      x: cx, y: top + 300, label: 'Réinitialiser les touches', preset: 'gray',
      width: 340, height: 44, fontSize: 20,
      onClick: () => { resetControls(); this._capturing = null; this._refreshKeys(); },
    });
    this.controlsTab.add(reset);
  }

  _keyButton(x, y, action, slot) {
    const w = 150;
    const h = 32;
    const g = this.add.graphics();
    const draw = (fill) => {
      g.clear();
      g.fillStyle(0x0d4a23, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      g.fillStyle(fill, 1);
      g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4, 7);
    };
    draw(0x1f8a4c);
    const label = this.add.text(x, y, '', {
      fontSize: '18px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffffff', stroke: '#0d4a23', strokeThickness: 3,
    }).setOrigin(0.5);
    const zone = this.add.zone(x, y, w, h)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => draw(this._isCapturing(action, slot) ? 0xf2a655 : 0x25a35a))
      .on('pointerout', () => draw(this._isCapturing(action, slot) ? 0xf2a655 : 0x1f8a4c))
      .on('pointerdown', () => { this._capturing = { action, slot }; this._refreshKeys(); });
    this.controlsTab.add([g, label, zone]);
    this._keyButtons.push({ action, slot, label, draw });
  }

  _isCapturing(action, slot) {
    return this._capturing && this._capturing.action === action && this._capturing.slot === slot;
  }

  _refreshKeys() {
    const c = getControls();
    this._keyButtons.forEach((b) => {
      const capturing = this._isCapturing(b.action, b.slot);
      b.label.setText(capturing ? '…' : keyLabel(c[b.action][b.slot]));
      b.draw(capturing ? 0xf2a655 : 0x1f8a4c);
    });
  }

  _onKey(event) {
    if (this._capturing) {
      const { action, slot } = this._capturing;
      this._capturing = null;
      if (event.keyCode !== ESC) setBinding(action, slot, event.keyCode);
      this._refreshKeys();
      return;
    }
    if (event.keyCode === ESC) this._close();
  }

  _refreshMute() {
    const muted = Sfx.isMuted();
    this.muteToggle.setText(muted ? '🔇  Son coupé — cliquer pour réactiver' : '🔊  Couper tout le son');
    this.muteToggle.setColor(muted ? '#ff9999' : '#ffffff');
  }

  _close() {
    this.scene.resume(this.returnTo);
    this.scene.stop();
  }
}
