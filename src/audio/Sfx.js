// Système audio du jeu.
//
// Deux moteurs derrière une API unique :
//   1. Fichiers réels (CC0) chargés dans le cache Phaser et joués via le
//      Sound Manager global (`game.sound`). C'est le chemin nominal.
//   2. Un synthé Web Audio "8-bit" gardé en *fallback* : si un fichier n'est
//      pas chargé (clé absente du cache), on retombe sur le son synthétisé.
//      Le jeu ne casse donc jamais, même sans assets audio.
//
// Le Sound Manager est capté une fois via `Sfx.init(game.sound)`.
// Le mute global est persisté dans localStorage (clé `fh_muted`).

const MUTE_KEY = 'fh_muted';
const MUSIC_VOL_KEY = 'fh_vol_music';
const SFX_VOL_KEY = 'fh_vol_sfx';

// Volumes par défaut (les fichiers réels passent par le Sound Manager Phaser).
const DEFAULT_SFX_VOLUME = 0.25;
const DEFAULT_MUSIC_VOLUME = 0.15;

// Volumes courants (relus depuis localStorage à l'init).
let sfxVolume = DEFAULT_SFX_VOLUME;
let musicVolume = DEFAULT_MUSIC_VOLUME;

// Référence au Sound Manager Phaser (instance globale partagée par les scènes).
let sound = null;
// Instance de la musique en cours (pour la stopper avant d'en lancer une autre).
let currentMusic = null;
let currentMusicKey = null;
// Piste désirée en attente de déverrouillage de l'AudioContext (autoplay bloqué
// par le navigateur tant qu'il n'y a pas eu de geste utilisateur).
let pendingMusicKey = null;
let unlockHooked = false;

// Source de vérité UNIQUE du mute (et non `sound.mute`, peu fiable tant que
// l'AudioContext est verrouillé). Initialisée à l'init depuis localStorage,
// puis réappliquée à `sound.mute` (y compris au déverrouillage du contexte).
let muted = false;
let muteUnlockHooked = false;

/* ------------------------------------------------------------------ */
/* Synthé Web Audio (fallback)                                         */
/* ------------------------------------------------------------------ */

let ctx = null;
let master = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({
  freq,
  freqEnd,
  type = 'square',
  duration = 0.15,
  gain = 0.15,
  attack = 0.005,
  release = 0.02,
  when = 0,
}) {
  // Le synthé respecte le mute global.
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const t1 = t0 + duration;

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t1);
  }

  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.linearRampToValueAtTime(gain, Math.max(t0 + attack, t1 - release));
  g.gain.linearRampToValueAtTime(0, t1);

  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t1 + 0.05);
}

// Sons synthé de secours, indexés par clé. Chaque entrée reproduit
// approximativement le fichier correspondant.
const synthFallback = {
  jump() {
    tone({ freq: 300, freqEnd: 720, duration: 0.12, gain: 0.13 });
  },
  double_jump() {
    tone({ freq: 500, freqEnd: 1100, duration: 0.1, gain: 0.13 });
    tone({ freq: 750, freqEnd: 1300, duration: 0.1, gain: 0.12, when: 0.07 });
  },
  pickup() {
    tone({ freq: 880, duration: 0.07, gain: 0.1 });
    tone({ freq: 1320, duration: 0.09, gain: 0.1, when: 0.07 });
  },
  box_break() {
    // "Crack" sec : descente rapide, sawtooth.
    tone({ freq: 220, freqEnd: 90, duration: 0.12, gain: 0.16, type: 'sawtooth' });
  },
  trampoline() {
    // "Boing" : montée élastique.
    tone({ freq: 260, freqEnd: 900, duration: 0.18, gain: 0.15, type: 'triangle' });
  },
  hit() {
    // Coup sourd.
    tone({ freq: 180, freqEnd: 60, duration: 0.18, gain: 0.18, type: 'square' });
  },
  death() {
    tone({ freq: 420, freqEnd: 70, duration: 0.55, gain: 0.18, type: 'sawtooth' });
  },
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) =>
      tone({ freq: f, duration: 0.13, gain: 0.14, when: i * 0.13 }),
    );
  },
  coin() {
    // "Ding" de pièce : deux notes carrées ascendantes très rapides.
    tone({ freq: 988, duration: 0.05, gain: 0.12 });
    tone({ freq: 1319, duration: 0.1, gain: 0.12, when: 0.05 });
  },
};

/* ------------------------------------------------------------------ */
/* Helpers fichiers Phaser                                             */
/* ------------------------------------------------------------------ */

// Joue un son chargé dans le cache Phaser ; sinon retombe sur le synthé.
// `boost` : multiplicateur de gain propre au son (reste scalé par sfxVolume +
// mute, plafonné à 1.0). Sert à rendre certains sons plus présents.
function playSfx(key, boost = 1) {
  if (hasAudio(key)) {
    sound.play(key, { volume: clamp01(sfxVolume * boost) });
    return;
  }
  if (synthFallback[key]) synthFallback[key]();
}

/* ------------------------------------------------------------------ */
/* Volumes (persistés dans localStorage)                               */
/* ------------------------------------------------------------------ */

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function readStoredVolume(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? clamp01(v) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeStoredVolume(key, v) {
  try {
    localStorage.setItem(key, String(v));
  } catch (e) {
    /* localStorage indisponible : on ignore */
  }
}

// La clé existe-t-elle dans le cache audio Phaser ?
function hasAudio(key) {
  return !!(sound && sound.game && sound.game.cache.audio.exists(key));
}

/* ------------------------------------------------------------------ */
/* Mute (persisté dans localStorage)                                   */
/* ------------------------------------------------------------------ */

function readStoredMute() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function writeStoredMute(v) {
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch (e) {
    /* localStorage indisponible : on ignore */
  }
}

function isMuted() {
  return muted;
}

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

export const Sfx = {
  // À appeler une fois avec `this.sound` d'une scène (idempotent).
  init(soundManager) {
    if (!soundManager) return;
    sound = soundManager;
    // Source de vérité = localStorage. On l'applique à sound.mute, et on la
    // réapplique au déverrouillage du contexte (régler mute pendant que le
    // contexte est verrouillé peut ne pas prendre effet immédiatement).
    muted = readStoredMute();
    sound.mute = muted;
    if (sound.locked && !muteUnlockHooked) {
      muteUnlockHooked = true;
      sound.once('unlocked', () => { sound.mute = muted; });
    }
    musicVolume = readStoredVolume(MUSIC_VOL_KEY, DEFAULT_MUSIC_VOLUME);
    sfxVolume = readStoredVolume(SFX_VOL_KEY, DEFAULT_SFX_VOLUME);
  },

  // --- Bruitages ---
  jump() {
    playSfx('jump');
  },
  doubleJump() {
    playSfx('double_jump');
  },
  pickup() {
    playSfx('pickup');
  },
  boxBreak() {
    // Boosté pour rester bien présent même avec le volume Effets bas.
    playSfx('box_break', 2.5);
  },
  trampoline() {
    playSfx('trampoline');
  },
  hit() {
    playSfx('hit');
  },
  death() {
    playSfx('death');
  },
  win() {
    playSfx('win');
  },
  coin() {
    // Pas d'asset dédié : on passe par le fallback synthé (clé absente du cache).
    playSfx('coin');
  },

  // --- Musique ---
  // key : 'menu' | 'game' (mappé vers les clés de cache music_menu/music_game)
  playMusic(key) {
    const cacheKey = key === 'menu' ? 'music_menu' : 'music_game';
    // Déjà en train de jouer cette piste : ne rien faire (évite de couper/relancer
    // à chaque create() de scène).
    if (currentMusic && currentMusicKey === cacheKey && currentMusic.isPlaying) {
      return;
    }
    this.stopMusic();
    if (!hasAudio(cacheKey)) return; // pas de fallback synthé pour la musique

    // AudioContext encore verrouillé (pas de geste utilisateur) : on mémorise la
    // piste et on la lance au déverrouillage.
    if (sound.locked) {
      pendingMusicKey = cacheKey;
      if (!unlockHooked) {
        unlockHooked = true;
        sound.once('unlocked', () => {
          if (pendingMusicKey) {
            const k = pendingMusicKey;
            pendingMusicKey = null;
            this.playMusic(k === 'music_menu' ? 'menu' : 'game');
          }
        });
      }
      return;
    }

    currentMusic = sound.add(cacheKey, { loop: true, volume: musicVolume });
    currentMusic.play();
    currentMusicKey = cacheKey;
  },

  stopMusic() {
    pendingMusicKey = null;
    if (currentMusic) {
      currentMusic.stop();
      currentMusic.destroy();
      currentMusic = null;
      currentMusicKey = null;
    }
  },

  // --- Mute ---
  toggleMute() {
    muted = !muted;
    if (sound) sound.mute = muted;
    writeStoredMute(muted);
    return muted;
  },

  isMuted() {
    return isMuted();
  },

  // --- Volumes (0..1) ---
  setMusicVolume(v) {
    musicVolume = clamp01(v);
    writeStoredVolume(MUSIC_VOL_KEY, musicVolume);
    // Applique en direct à la musique en cours.
    if (currentMusic) currentMusic.setVolume(musicVolume);
  },
  getMusicVolume() {
    return musicVolume;
  },
  setSfxVolume(v) {
    sfxVolume = clamp01(v);
    writeStoredVolume(SFX_VOL_KEY, sfxVolume);
  },
  getSfxVolume() {
    return sfxVolume;
  },
  // Joue un bruitage d'aperçu (utilisé par le curseur Effets pour donner un retour).
  previewSfx() {
    playSfx('pickup');
  },

  // Conservé pour compatibilité (réglage du gain du synthé fallback).
  setVolume(v) {
    getCtx();
    if (master) master.gain.value = Math.max(0, Math.min(1, v));
  },
};
