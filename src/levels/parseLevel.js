// Transforme une carte ASCII de niveau en données prêtes pour GameScene.
//
// Une carte = un tableau de lignes de même longueur ; 1 caractère = 1 tuile de
// 32 unités monde. La colonne c / ligne r couvre x ∈ [c*32, c*32+32[, y ∈ [r*32, r*32+32[.
// Module pur (pas de Phaser) : le serveur l'importe aussi pour connaître les
// maxima de chaque niveau (fruits, caisses, temps).
//
// Légende :
//   ' ' ou '.'  vide
//   '#'  terrain plein, collision toutes faces (bords / coins choisis automatiquement)
//   '='  sommet de pilier : herbe, on traverse par dessous et on se pose dessus
//   '|'  corps de pilier : décor, aucune collision
//   'D'  petit bloc 2×2 dans un pilier (coin haut-gauche) : marchepied, on se pose sur son sommet
//   '-'  planche fine : on traverse par dessous et on se pose dessus
//   '@'  départ du joueur (posé sur la tuile du dessous)
//   '$'  coupe d'arrivée (posée sur la tuile du dessous)
//   'C'  checkpoint : drapeau qui devient le point de réapparition
//   'o'  fruit
//   'B'  caisse, à casser en la tapant par dessous
//   'T'  trampoline (posé sur la tuile du dessous)
//   '^'  pointes au sol          'v'  pointes au plafond
//   'F'  feu (phase 0)           'f'  feu décalé d'un demi-cycle
//   'S'  scie, qui parcourt sa piste : '~' horizontale ou ':' verticale (S compris)
//   '_'  plateforme qui tombe (par paires : '__' = une plateforme de 2 tuiles)
//   'W'  souffleur : courant d'air qui soulève, jusqu'au premier plafond (fanHeight max)
//   'H'  Spike Head : bloc à pointes qui s'abat sur le joueur passé dessous
//   'A'  flèche : bulle qui propulse vers le haut, réapparaît après un moment

export const T = 32;

// Réglages des pièges du pack « Traps » partagés entre le jeu et scripts/check-levels.mjs.
export const MECHANICS = {
  fanLift: 2600,      // accélération vers le haut dans un courant d'air (px/s²)
  fanMaxRise: 330,    // vitesse de montée maximale dans le courant d'air (px/s)
  arrowBoost: 700,    // vitesse verticale donnée par une flèche (px/s, vers le haut)
  arrowRespawn: 1500, // délai avant qu'une flèche réapparaisse (ms)
};

// Kits de terrain du tileset (22 × 11 tuiles 16×16) : 9 frames
// [hautG, haut, hautD, milieuG, milieu, milieuD, basG, bas, basD].
export const KITS = {
  green:  [6, 7, 8, 28, 29, 30, 50, 51, 52],
  pink:   [182, 183, 184, 204, 205, 206, 226, 227, 228],
  orange: [94, 95, 96, 116, 117, 118, 138, 139, 140],
  stone:  [0, 1, 2, 22, 23, 24, 44, 45, 46],
  brick:  [105, 106, 107, 127, 128, 129, 149, 150, 151],
};

// Petits blocs 2×2 décoratifs de chaque kit : [hautG, hautD, basG, basD].
export const KIT_DETAILS = {
  green:  [9, 10, 31, 32],
  pink:   [185, 186, 207, 208],
  orange: [97, 98, 119, 120],
};

// Planches fines : [gauche, milieu, droite].
export const PLANKS = {
  wood:  [39, 40, 41],
  metal: [61, 62, 63],
};

const LEGEND = new Set(' .#=|-D@$CoBT^vFfS~:_WHA');

export function buildLevel(def) {
  const map = def.map;
  const rows = map.length;
  const cols = map[0].length;
  map.forEach((line, r) => {
    if (line.length !== cols) {
      throw new Error(`${def.name} : ligne ${r} de ${line.length} caractères au lieu de ${cols}`);
    }
    [...line].forEach((ch, c) => {
      if (!LEGEND.has(ch)) throw new Error(`${def.name} : caractère inconnu '${ch}' en (${c}, ${r})`);
    });
  });

  const at = (c, r) => (r < 0 || r >= rows || c < 0 || c >= cols ? ' ' : map[r][c]);
  const cx = (c) => c * T + T / 2;
  const cy = (r) => r * T + T / 2;
  // Une tuile sur laquelle on peut se poser (sert aux pièges qui tombent / montent).
  const isFloor = (ch) => ch === '#' || ch === '=' || ch === '-';

  const out = {
    name: def.name,
    bgKey: def.bgKey,
    bgColor: def.bgColor,
    kit: KITS[def.kit],
    detail: KIT_DETAILS[def.kit],
    plank: PLANKS[def.plank || 'wood'],
    fruitTypes: def.fruitTypes,
    time: def.time,
    dark: !!def.dark,
    next: def.next,
    map,
    cols,
    rows,
    width: cols * T,
    height: rows * T,
    playerStart: null,
    flag: null,
    checkpoints: [],
    fruitPositions: [],
    boxes: [],
    trampolines: [],
    spikes: [],
    ceilingSpikes: [],
    fires: [],
    saws: [],
    fallingPlatforms: [],
    details: [],
    fans: [],
    spikeHeads: [],
    arrows: [],
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = map[r][c];
      const floorTop = (r + 1) * T;
      switch (ch) {
        case '@': out.playerStart = { x: cx(c), y: floorTop - 40 }; break;
        case '$': out.flag = { x: cx(c), y: floorTop - 56 }; break;
        case 'C': out.checkpoints.push({ x: cx(c), y: floorTop - 56 }); break;
        case 'o': out.fruitPositions.push([cx(c), cy(r)]); break;
        case 'B': out.boxes.push({ x: cx(c), y: cy(r), type: def.boxType || 'box1' }); break;
        case 'T': out.trampolines.push({ x: cx(c), y: floorTop - 28 }); break;
        case '^': out.spikes.push({ x: cx(c), y: cy(r) }); break;
        case 'v': out.ceilingSpikes.push({ x: cx(c), y: cy(r) }); break;
        case 'F':
        case 'f':
          out.fires.push({ x: cx(c), y: floorTop - 32, period: def.firePeriod || 2000, phase: ch === 'f' ? 0.5 : 0 });
          break;
        case '_':
          // Une plateforme par paire, en partant de la gauche de chaque suite de '_'.
          if (at(c - 1, r) !== '_' || out.fallingPlatforms.at(-1)?.cell !== `${c - 1},${r}`) {
            out.fallingPlatforms.push({ x: (c + 1) * T, y: r * T + 10, delay: def.fallDelay || 500, cell: `${c},${r}` });
          }
          break;
        case 'W': {
          // Courant d'air : de la tuile au-dessus du souffleur jusqu'au premier plafond.
          let top = r;
          while (top > 0 && r - top < (def.fanHeight || 9) && at(c, top - 1) !== '#') top--;
          out.fans.push({ x: cx(c), y: floorTop - 8, top: top * T, bottom: floorTop });
          break;
        }
        case 'H': {
          // S'abat jusqu'au premier sol sous lui.
          let floor = r + 1;
          while (floor < rows && !isFloor(at(c, floor))) floor++;
          out.spikeHeads.push({ x: cx(c), y: cy(r), bottomY: floor * T - 39 });
          break;
        }
        case 'A': out.arrows.push({ x: cx(c), y: cy(r) }); break;
        // Marchepied : surface d'appui au bas de la case (jointure des 2 rangées du bloc), large de 26.
        case 'D': out.details.push({ c, r, x: (c + 1) * T, y: (r + 1) * T }); break;
        case 'S': {
          // Piste : suite continue de '~' (ou de ':') de part et d'autre de la scie.
          const horizontal = at(c - 1, r) === '~' || at(c + 1, r) === '~';
          const track = horizontal ? '~' : ':';
          const step = horizontal ? [1, 0] : [0, 1];
          let [c1, r1] = [c, r];
          while ([track, 'S'].includes(at(c1 - step[0], r1 - step[1]))) { c1 -= step[0]; r1 -= step[1]; }
          let [c2, r2] = [c, r];
          while ([track, 'S'].includes(at(c2 + step[0], r2 + step[1]))) { c2 += step[0]; r2 += step[1]; }
          out.saws.push({ x1: cx(c1), y1: cy(r1), x2: cx(c2), y2: cy(r2), speed: def.sawSpeed || 120 });
          break;
        }
        default: break;
      }
    }
  }
  out.fallingPlatforms.forEach((p) => delete p.cell);

  if (!out.playerStart) throw new Error(`${def.name} : pas de départ '@'`);
  if (!out.flag) throw new Error(`${def.name} : pas de coupe '$'`);
  return out;
}

// Frame de terrain d'une tuile '#', selon ses voisines : herbe en haut si rien
// au-dessus, bord gauche / droit / bas selon les côtés libres. Hors carte = plein
// (les murs du bord du niveau restent d'un seul tenant).
export function terrainFrame(level, c, r) {
  const solid = (cc, rr) => (cc < 0 || cc >= level.cols || rr < 0 || rr >= level.rows ? true : level.map[rr][cc] === '#');
  const top = !solid(c, r - 1);
  const bottom = !solid(c, r + 1);
  const left = !solid(c - 1, r);
  const right = !solid(c + 1, r);
  const row = top ? 0 : bottom ? 2 : 1;
  const col = left && !right ? 0 : right && !left ? 2 : 1;
  return level.kit[row * 3 + col];
}
