// Titre stylisé : texte principal + ombre portée + légère pulsation.
// Utilisé par Menu / GameOver / Victory.
export function buildTitle(scene, {
  x, y, text,
  color = '#ffd700',
  stroke = '#1a3a0a',
  fontSize = 88,
  shadowAlpha = 0.45,
  pulse = true,
}) {
  const style = {
    fontSize: `${fontSize}px`,
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontStyle: 'bold',
    color,
    stroke,
    strokeThickness: 12,
  };

  const shadow = scene.add.text(x + 5, y + 7, text, {
    ...style,
    color: '#000000',
    stroke: '#000000',
  }).setOrigin(0.5).setAlpha(shadowAlpha);

  const title = scene.add.text(x, y, text, style).setOrigin(0.5);

  if (pulse) {
    scene.tweens.add({
      targets: [title, shadow],
      scaleX: 1.03, scaleY: 1.03,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  return { title, shadow };
}
