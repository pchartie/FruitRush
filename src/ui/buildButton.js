import Phaser from 'phaser';

// Palette de presets pour les boutons : (bord sombre, face médiane,
// face survol, highlight clair, stroke texte). Trois tons couvrent
// les cas courants : action principale, action secondaire, retour menu.
const PRESETS = {
  green: {
    border:    0x0d4a23,
    face:      0x1f8a4c,
    faceHover: 0x25a35a,
    highlight: 0x4ad682,
    stroke:    '#0d4a23',
  },
  orange: {
    border:    0x7a3e0a,
    face:      0xc0651a,
    faceHover: 0xd97a2a,
    highlight: 0xf2a655,
    stroke:    '#7a3e0a',
  },
  gray: {
    border:    0x2c3539,
    face:      0x6c7a82,
    faceHover: 0x80909a,
    highlight: 0xa8b5bd,
    stroke:    '#2c3539',
  },
};

// Construit un bouton "biseauté" (ombre + bord + face + highlight)
// retournant un Container interactif. opts: { x, y, label, preset,
// icon, width, height, onClick }.
export function buildButton(scene, {
  x,
  y,
  label,
  preset = 'green',
  icon = null,        // 'play' ou null
  width = 260,
  height = 70,
  fontSize = 28,
  onClick = () => {},
}) {
  const W = width;
  const H = height;
  const radius = 16;
  const colors = PRESETS[preset] || PRESETS.green;

  const c = scene.add.container(x, y);

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.45);
  shadow.fillRoundedRect(-W / 2 + 3, -H / 2 + 5, W, H, radius);

  const border = scene.add.graphics();
  border.fillStyle(colors.border, 1);
  border.fillRoundedRect(-W / 2, -H / 2, W, H, radius);

  const face = scene.add.graphics();
  const drawFace = (fillColor) => {
    face.clear();
    face.fillStyle(fillColor, 1);
    face.fillRoundedRect(-W / 2 + 3, -H / 2 + 3, W - 6, H - 6, radius - 3);
  };
  drawFace(colors.face);

  const hl = scene.add.graphics();
  hl.fillStyle(colors.highlight, 1);
  hl.fillRoundedRect(-W / 2 + 7, -H / 2 + 6, W - 14, (H - 6) / 2 - 2, Math.max(2, radius - 6));

  c.add([shadow, border, face, hl]);

  // Icône optionnelle à gauche.
  let labelOffsetX = 0;
  if (icon === 'play') {
    const tri = scene.add.graphics();
    const tx = -W / 2 + 32;
    tri.fillStyle(colors.border, 1);
    tri.fillTriangle(tx - 1, -16, tx - 1, 16, tx + 24, 0);
    tri.fillStyle(0xffffff, 1);
    tri.fillTriangle(tx, -14, tx, 14, tx + 21, 0);
    c.add(tri);
    labelOffsetX = 22;
  }

  const text = scene.add.text(labelOffsetX, 0, label, {
    fontSize: `${fontSize}px`,
    fontFamily: 'Arial',
    fontStyle: 'bold',
    color: '#ffffff',
    stroke: colors.stroke,
    strokeThickness: 4,
  }).setOrigin(0.5);
  c.add(text);

  c.setSize(W, H);

  // Zone invisible centrée sur le container, qui sert d'unique cible aux
  // événements pointer. Plus fiable que `c.setInteractive(Rectangle, ...)`
  // sur un Container : les containers ont des bugs de hit-test quand on
  // les scale au tween (la hitbox locale ne suit pas le scaling). Une Zone
  // dédiée traverse correctement les transformations du container parent.
  const hit = scene.add.zone(0, 0, W, H).setOrigin(0.5);
  hit.setInteractive({ useHandCursor: true });
  c.add(hit);

  hit.on('pointerover', () => {
    scene.tweens.add({ targets: c, scale: 1.06, duration: 120, ease: 'Sine.easeOut' });
    drawFace(colors.faceHover);
  });
  hit.on('pointerout', () => {
    scene.tweens.add({ targets: c, scale: 1, duration: 120, ease: 'Sine.easeOut' });
    drawFace(colors.face);
  });
  hit.on('pointerdown', () => {
    scene.tweens.add({ targets: c, scale: 0.97, duration: 60, yoyo: true, ease: 'Sine.easeOut' });
    onClick();
  });

  return c;
}
