// Panneau de stats : encadré "biseauté" (ombre + bord + face) avec
// plusieurs lignes de texte centrées à l'intérieur.
export function buildStatsPanel(scene, {
  x, y,
  width = 380,
  height = 130,
  lines = [],          // [{ text, size?, color?, accent? }]
  borderColor = 0x4a4a4a,
  faceColor = 0x1a1a1a,
}) {
  const W = width;
  const H = height;
  const radius = 14;

  const g = scene.add.graphics();
  // Ombre
  g.fillStyle(0x000000, 0.45);
  g.fillRoundedRect(x - W / 2 + 3, y - H / 2 + 5, W, H, radius);
  // Bord
  g.fillStyle(borderColor, 1);
  g.fillRoundedRect(x - W / 2, y - H / 2, W, H, radius);
  // Face
  g.fillStyle(faceColor, 0.92);
  g.fillRoundedRect(x - W / 2 + 3, y - H / 2 + 3, W - 6, H - 6, radius - 3);

  const lineGap = H / (lines.length + 1);
  lines.forEach((ln, i) => {
    const ty = y - H / 2 + lineGap * (i + 1);
    scene.add.text(x, ty, ln.text, {
      fontSize: `${ln.size || 22}px`,
      fontFamily: 'Arial',
      fontStyle: ln.accent ? 'bold' : 'normal',
      color: ln.color || '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);
  });
}
