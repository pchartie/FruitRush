// Label de section "encadré" : texte + filets décoratifs avec losanges
// aux extrémités, de chaque côté du label.
export function buildSectionLabel(scene, {
  x, y, text,
  color = '#ffd700',
  stroke = '#1a3a0a',
  fontSize = 26,
  decorColor = 0xffd700,
  lineLen = 90,
}) {
  const label = scene.add.text(x, y, text, {
    fontSize: `${fontSize}px`,
    fontFamily: 'Arial',
    fontStyle: 'bold',
    color,
    stroke,
    strokeThickness: 5,
  }).setOrigin(0.5);

  const gap = label.width / 2 + 24;
  const g = scene.add.graphics();
  g.lineStyle(3, decorColor, 0.85);
  g.lineBetween(x - gap - lineLen, y, x - gap, y);
  g.lineBetween(x + gap, y, x + gap + lineLen, y);
  g.fillStyle(decorColor, 1);
  [-1, 1].forEach(side => {
    const px = x + side * (gap + lineLen);
    g.fillTriangle(px - 5, y, px, y - 5, px + 5, y);
    g.fillTriangle(px - 5, y, px, y + 5, px + 5, y);
  });

  return label;
}
