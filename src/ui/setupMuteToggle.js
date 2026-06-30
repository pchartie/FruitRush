// Contrôle du son : touche M + icône cliquable (bouton Volume) en haut à droite.
//
// L'état mute est géré par Sfx (persisté dans localStorage), cohérent entre
// scènes. À appeler dans le `create()` de chaque scène.
//
// Icône = `assets/menu/buttons/Volume.png` (clé 'btn_volume', chargée dans les
// preload de Menu/Game). État coupé = icône grisée + barre rouge diagonale.
// Fallback emoji 🔊/🔇 si la texture n'est pas chargée.

import { CONFIG } from '../config.js';
import { Sfx } from '../audio/Sfx.js';

const ICON_SCALE = 2.25;

export function setupMuteToggle(scene, { bindKey = true } = {}) {
  const ax = CONFIG.width - 16;
  const ay = 16;
  const hasTex = scene.textures.exists('btn_volume');

  const toggle = () => {
    Sfx.toggleMute();
    refresh();
  };

  let icon, slash;

  if (hasTex) {
    icon = scene.add.image(ax, ay, 'btn_volume')
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10000)
      .setScale(ICON_SCALE)
      .setInteractive({ useHandCursor: true });
    icon.on('pointerdown', toggle);

    // Barre rouge "muet" par-dessus l'icône (origin 1,0 → boîte [ax-dw..ax]).
    const dw = icon.displayWidth;
    const dh = icon.displayHeight;
    slash = scene.add.graphics().setScrollFactor(0).setDepth(10001);
    slash.lineStyle(5, 0xff3a3a, 1);
    slash.lineBetween(ax - dw + 5, ay + 5, ax - 5, ay + dh - 5);
  } else {
    // Fallback : emoji texte + zone cliquable fixe (hit-test stable).
    icon = scene.add.text(ax, ay, '', { fontSize: '34px', fontFamily: 'Arial, sans-serif' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(10000);
    scene.add.zone(ax - 8, ay - 8, 64, 54).setOrigin(1, 0)
      .setScrollFactor(0).setDepth(10000)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', toggle);
  }

  function refresh() {
    const muted = Sfx.isMuted();
    if (hasTex) {
      icon.setTint(muted ? 0x888888 : 0xffffff);
      icon.setAlpha(muted ? 0.7 : 1);
      slash.setVisible(muted);
    } else {
      icon.setText(muted ? '🔇' : '🔊');
    }
  }

  refresh();

  if (bindKey) scene.input.keyboard.on('keydown-M', toggle);
  scene.events.on('resume', refresh);

  scene.events.once('shutdown', () => {
    if (bindKey) scene.input.keyboard.off('keydown-M', toggle);
    scene.events.off('resume', refresh);
  });

  return icon;
}
