// Curseur de volume réutilisable (piste + remplissage + bouton rond).
//
// Interaction : glisser le bouton OU cliquer n'importe où sur la piste.
// Le composant est autonome : il se dessine dans un container positionné en
// (x, y) — (x, y) est le CENTRE de la piste. `onChange(value)` est appelé en
// continu (value ∈ [0,1]) ; `onChangeEnd(value)` à la fin d'un glisser/clic
// (utile pour jouer un son d'aperçu sans spammer).
//
// API : buildSlider(scene, opts) → { container, setValue, getValue }

export function buildSlider(scene, {
  x, y, width = 300, label = '', value = 0.5,
  fillColor = 0x6ad24a, onChange = () => {}, onChangeEnd = () => {},
}) {
  const half = width / 2;
  let v = Math.max(0, Math.min(1, value));

  const container = scene.add.container(x, y);

  // Label (au-dessus à gauche) + pourcentage (au-dessus à droite).
  const labelText = scene.add.text(-half, -26, label, {
    fontSize: '20px', fontFamily: 'Arial', fontStyle: 'bold',
    color: '#ffffff', stroke: '#000', strokeThickness: 3,
  }).setOrigin(0, 0.5);

  const pctText = scene.add.text(half, -26, '', {
    fontSize: '20px', fontFamily: 'Arial', fontStyle: 'bold',
    color: '#ffe88a', stroke: '#000', strokeThickness: 3,
  }).setOrigin(1, 0.5);

  // Piste (fond) + remplissage.
  const track = scene.add.rectangle(0, 0, width, 8, 0x000000, 0.55)
    .setOrigin(0.5)
    .setStrokeStyle(2, 0x2d5016);
  const fill = scene.add.rectangle(-half, 0, v * width, 8, fillColor)
    .setOrigin(0, 0.5);

  // Bouton rond draggable.
  const knob = scene.add.circle(-half + v * width, 0, 14, 0xffffff)
    .setStrokeStyle(3, 0x2d5016)
    .setInteractive({ useHandCursor: true, draggable: true });

  // Zone de clic large sur toute la piste (hauteur généreuse).
  const hit = scene.add.rectangle(0, 0, width + 28, 36, 0xffffff, 0.001)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  container.add([track, fill, hit, labelText, pctText, knob]);

  const redraw = () => {
    const kx = -half + v * width;
    knob.x = kx;
    fill.width = v * width;
    pctText.setText(`${Math.round(v * 100)}%`);
  };

  const applyLocalX = (localX, fireEnd) => {
    v = Math.max(0, Math.min(1, (localX + half) / width));
    redraw();
    onChange(v);
    if (fireEnd) onChangeEnd(v);
  };

  // Glisser le bouton : dragX est en coordonnées locales du parent (le container).
  knob.on('drag', (_pointer, dragX) => {
    applyLocalX(Math.max(-half, Math.min(half, dragX)), false);
  });
  knob.on('dragend', () => onChangeEnd(v));

  // Clic sur la piste : saute à la position (pointer.x est en coords écran/scene,
  // le container n'est ni scalé ni scrollé → local = pointer.x - container.x).
  hit.on('pointerdown', (pointer) => {
    applyLocalX(pointer.x - container.x, true);
  });

  redraw();

  return {
    container,
    getValue: () => v,
    setValue: (nv) => { v = Math.max(0, Math.min(1, nv)); redraw(); },
  };
}
