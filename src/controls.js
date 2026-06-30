// Configuration des touches (remappables), persistée dans localStorage.
//
// Chaque action a deux emplacements [principale, secondaire], stockés en
// keyCodes Phaser (= keyCodes DOM). Source de vérité unique lue par GameScene
// pour construire ses touches, et par SettingsScene pour l'UI de remapping.

import Phaser from 'phaser';

const KC = Phaser.Input.Keyboard.KeyCodes;
const STORAGE_KEY = 'fh_controls';

export const ACTIONS = [
  { id: 'left', label: 'Gauche' },
  { id: 'right', label: 'Droite' },
  { id: 'jump', label: 'Saut' },
];

const DEFAULTS = {
  left: [KC.LEFT, KC.A],
  right: [KC.RIGHT, KC.D],
  jump: [KC.SPACE, KC.W],
};

function clone(o) {
  return { left: [...o.left], right: [...o.right], jump: [...o.jump] };
}

function sanitizePair(pair, def) {
  if (!Array.isArray(pair)) return [...def];
  const a = Number.isInteger(pair[0]) ? pair[0] : def[0];
  const b = Number.isInteger(pair[1]) ? pair[1] : def[1];
  return [a, b];
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.left && p.right && p.jump) {
        return {
          left: sanitizePair(p.left, DEFAULTS.left),
          right: sanitizePair(p.right, DEFAULTS.right),
          jump: sanitizePair(p.jump, DEFAULTS.jump),
        };
      }
    }
  } catch (e) {
    /* ignore */
  }
  return clone(DEFAULTS);
}

let controls = load();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(controls));
  } catch (e) {
    /* ignore */
  }
}

export function getControls() {
  return clone(controls);
}

export function setBinding(action, slot, keyCode) {
  if (!controls[action] || (slot !== 0 && slot !== 1)) return;
  controls[action][slot] = keyCode;
  save();
}

export function resetControls() {
  controls = clone(DEFAULTS);
  save();
}

/* ---- Affichage lisible d'un keyCode ---- */

const SPECIAL = {
  [KC.LEFT]: '←', [KC.RIGHT]: '→', [KC.UP]: '↑', [KC.DOWN]: '↓',
  [KC.SPACE]: 'Espace', [KC.ENTER]: 'Entrée', [KC.SHIFT]: 'Maj',
  [KC.CTRL]: 'Ctrl', [KC.ALT]: 'Alt', [KC.TAB]: 'Tab',
  [KC.BACKSPACE]: '⌫', [KC.ESC]: 'Échap',
  [KC.ZERO]: '0', [KC.ONE]: '1', [KC.TWO]: '2', [KC.THREE]: '3', [KC.FOUR]: '4',
  [KC.FIVE]: '5', [KC.SIX]: '6', [KC.SEVEN]: '7', [KC.EIGHT]: '8', [KC.NINE]: '9',
};

let codeToName = null;

export function keyLabel(code) {
  if (SPECIAL[code]) return SPECIAL[code];
  if (!codeToName) {
    codeToName = {};
    for (const [name, c] of Object.entries(KC)) {
      if (codeToName[c] === undefined) codeToName[c] = name;
    }
  }
  const name = codeToName[code];
  if (!name) return `#${code}`;
  if (/^[A-Z]$/.test(name)) return name; // lettres
  if (name.startsWith('NUMPAD_')) return 'Num' + name.slice(7);
  return name;
}
