// Charge tous les assets audio dans le cache Phaser.
//
// À appeler dans le `preload()` des scènes qui en ont besoin (MenuScene,
// GameScene). Le cache Phaser étant global, une clé déjà chargée n'est pas
// re-téléchargée : on peut donc appeler ce helper dans plusieurs scènes sans
// surcoût.

const SFX = {
  jump: 'assets/audio/sfx/jump.ogg',
  double_jump: 'assets/audio/sfx/double_jump.ogg',
  pickup: 'assets/audio/sfx/pickup.ogg',
  box_break: 'assets/audio/sfx/box_break.ogg',
  trampoline: 'assets/audio/sfx/trampoline.ogg',
  hit: 'assets/audio/sfx/hit.ogg',
  death: 'assets/audio/sfx/death.ogg',
  win: 'assets/audio/sfx/win.ogg',
};

const MUSIC = {
  music_menu: 'assets/audio/music/music_menu.mp3',
  music_game: 'assets/audio/music/music_game.mp3',
};

export function loadAudio(scene) {
  for (const [key, path] of Object.entries({ ...SFX, ...MUSIC })) {
    if (!scene.cache.audio.exists(key)) {
      scene.load.audio(key, path);
    }
  }
}
