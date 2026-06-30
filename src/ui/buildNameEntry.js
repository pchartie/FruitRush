// Saisie de pseudo au clavier (Phaser n'a pas de champ texte natif).
// Lettres / chiffres / espace / _ / - acceptés, longueur bornée. Entrée valide
// (refuse si vide), Retour arrière efface. Curseur clignotant.
//
// Retourne { container, cleanup } — `cleanup` retire le listener clavier et le
// timer (appelé automatiquement au shutdown de la scène et après validation).

const ALLOWED = /[\p{L}\p{N} _-]/u;

export function buildNameEntry(scene, {
  x, y, maxLen = 20, prompt = 'Entre ton pseudo :', onSubmit = () => {},
}) {
  const container = scene.add.container(x, y);
  let name = '';
  let cursorOn = true;
  let done = false;

  const promptText = scene.add.text(0, -34, prompt, {
    fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold',
    color: '#ffffff', stroke: '#1a3a0a', strokeThickness: 4,
  }).setOrigin(0.5);

  const nameText = scene.add.text(0, 8, '', {
    fontSize: '34px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    color: '#ffe88a', stroke: '#000', strokeThickness: 5,
  }).setOrigin(0.5);

  const hint = scene.add.text(0, 52, '[Entrée] valider   ·   [⌫] effacer', {
    fontSize: '15px', fontFamily: 'Arial', fontStyle: 'italic',
    color: '#cccccc', stroke: '#000', strokeThickness: 2,
  }).setOrigin(0.5);

  container.add([promptText, nameText, hint]);

  const render = () => nameText.setText(name + (cursorOn ? '|' : ' '));
  render();

  const blink = scene.time.addEvent({
    delay: 450, loop: true,
    callback: () => { cursorOn = !cursorOn; render(); },
  });

  const onKey = (event) => {
    if (done) return;
    const key = event.key;
    if (key === 'Enter') {
      const trimmed = name.trim();
      if (trimmed.length > 0) {
        done = true;
        cleanup();
        onSubmit(trimmed);
      }
      return;
    }
    if (key === 'Backspace') {
      name = name.slice(0, -1);
      render();
      return;
    }
    if (key.length === 1 && name.length < maxLen && ALLOWED.test(key)) {
      name += key;
      render();
    }
  };

  scene.input.keyboard.on('keydown', onKey);

  const cleanup = () => {
    scene.input.keyboard.off('keydown', onKey);
    blink.remove();
  };
  scene.events.once('shutdown', cleanup);

  return { container, cleanup, getName: () => name };
}
