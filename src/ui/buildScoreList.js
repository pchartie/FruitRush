// Affiche un classement (Top N) stylé : rang · pseudo · score.
// Retourne un Container ancré en (x, y) (haut-centre). `highlightIndex` met une
// ligne en surbrillance (la nouvelle entrée du joueur).

export function buildScoreList(scene, {
  x, y, scores, highlightIndex = -1,
  width = 460, rowHeight = 30, fontSize = 20, title = '🏆 Meilleurs scores',
}) {
  const container = scene.add.container(x, y);
  const half = width / 2;

  const titleText = scene.add.text(0, 0, title, {
    fontSize: '26px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    color: '#ffd700', stroke: '#1a3a0a', strokeThickness: 5,
  }).setOrigin(0.5, 0);
  container.add(titleText);

  if (!scores || scores.length === 0) {
    const empty = scene.add.text(0, 48, 'Aucun score pour le moment.', {
      fontSize: '18px', fontFamily: 'Arial', fontStyle: 'italic',
      color: '#cccccc', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0);
    container.add(empty);
    return container;
  }

  const top = 44;
  scores.forEach((s, i) => {
    const ry = top + i * rowHeight;
    const isHL = i === highlightIndex;

    if (isHL) {
      const bg = scene.add.rectangle(0, ry + rowHeight / 2 - 2, width + 16, rowHeight - 2, 0xffd700, 0.18)
        .setOrigin(0.5);
      container.add(bg);
    }

    const color = isHL ? '#ffe88a' : '#ffffff';
    const rank = scene.add.text(-half, ry, `${i + 1}.`, {
      fontSize: `${fontSize}px`, fontFamily: 'Arial', fontStyle: 'bold',
      color, stroke: '#000', strokeThickness: 3,
    }).setOrigin(0, 0);
    const name = scene.add.text(-half + 52, ry, s.name, {
      fontSize: `${fontSize}px`, fontFamily: 'Arial', fontStyle: 'bold',
      color, stroke: '#000', strokeThickness: 3,
    }).setOrigin(0, 0);
    const score = scene.add.text(half, ry, String(s.score), {
      fontSize: `${fontSize}px`, fontFamily: 'Arial', fontStyle: 'bold',
      color, stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0);
    container.add([rank, name, score]);
  });

  return container;
}
