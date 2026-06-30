// Bouton « fermer » à base d'icône (assets/menu/buttons/Close.png, clé
// 'btn_close', préchargée dans Menu/Game). Même esprit que le bouton Volume :
// icône cliquable sans fond, agrandie au survol. Une zone invisible dédiée sert
// de cible aux clics (hit-test fiable et confortable, l'icône source étant petite).
//
// Fallback texte « ✕ » si la texture n'est pas chargée, pour ne jamais casser.
//
// opts: { x, y, scale, hit, onClick }. Position ancrée en haut-droite (origin 1,0).

const ICON_SCALE = 2.5;
const HIT = 48;

export function buildCloseButton(scene, { x, y, scale = ICON_SCALE, hit = HIT, onClick = () => {} }) {
  const hasTex = scene.textures.exists('btn_close');

  const visual = hasTex
    ? scene.add.image(x, y, 'btn_close').setOrigin(1, 0).setScale(scale)
    : scene.add.text(x, y, '✕', {
        fontSize: '34px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
        color: '#ffffff', stroke: '#0d4a23', strokeThickness: 5,
      }).setOrigin(1, 0);

  // Zone cliquable centrée sur l'icône (cible unique et stable des pointeurs).
  const cx = x - visual.displayWidth / 2;
  const cy = y + visual.displayHeight / 2;
  const zone = scene.add.zone(cx, cy, hit, hit).setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  zone.on('pointerover', () => {
    scene.tweens.add({ targets: visual, scale: scale * 1.15, duration: 120, ease: 'Sine.easeOut' });
  });
  zone.on('pointerout', () => {
    scene.tweens.add({ targets: visual, scale, duration: 120, ease: 'Sine.easeOut' });
  });
  zone.on('pointerdown', () => {
    scene.tweens.add({ targets: visual, scale: scale * 0.92, duration: 60, yoyo: true, ease: 'Sine.easeOut' });
    onClick();
  });

  return { visual, zone };
}
