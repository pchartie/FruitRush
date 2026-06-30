import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { Player } from '../entities/player/Player.js';
import { Sfx } from '../audio/Sfx.js';
import { loadAudio } from '../audio/loadAudio.js';
import { setupMuteToggle } from '../ui/setupMuteToggle.js';
import { getControls } from '../controls.js';
import { LEVELS } from '../levels/levels.js';
import { startRun } from '../api/scores.js';

// Boîtes englobantes (pixels source) du contenu non-transparent de chaque fruit,
// mesurées sur les spritesheets (union de toutes les frames d'idle). Sert à
// caler la hitbox au plus près du dessin plutôt que sur la frame 32×32 entière.
// Format : [w, h, offsetX, offsetY].
const FRUIT_BODY = {
  apple: [16, 18, 8, 5],
  bananas: [18, 19, 7, 5],
  cherries: [18, 18, 7, 7],
  kiwi: [16, 16, 8, 8],
  melon: [22, 16, 5, 8],
  orange: [20, 16, 8, 8],
  pineapple: [14, 21, 9, 6],
  strawberry: [13, 16, 10, 8],
};

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    // Perso choisi depuis MenuScene : data en priorité, sinon registry global
    // (préservé entre les retries depuis GameOver / Victory), sinon défaut.
    this.selectedChar =
      (data && data.char) || this.registry.get('char') || 'virtual_guy';
    // Niveau courant. data > registry > 1. On le persiste dans le registry
    // pour qu'un GameOver puisse rejouer le bon niveau.
    this.levelNum =
      (data && data.level) || this.registry.get('currentLevel') || 1;
    this.levelData = LEVELS[this.levelNum] || LEVELS[1];
    this.registry.set('currentLevel', this.levelNum);
    // Score / vies transmis depuis le niveau précédent en cas d'enchaînement.
    this.carryScore = (data && data.carryScore) || 0;
    this.carryLives = (data && data.carryLives) || null;
  }

  preload() {
    // Personnages : ce sont des spritesheets horizontaux (32x32 par frame),
    // pas des images uniques — sinon le strip entier s'affiche = persos dupliqués.
    const chars = ['virtual_guy', 'pink_man', 'ninja_frog', 'mask_dude'];
    const charFrame = { frameWidth: 32, frameHeight: 32 };
    chars.forEach(char => {
      this.load.spritesheet(`${char}_idle`, `assets/main_characters/${char}/Idle (32x32).png`, charFrame);
      this.load.spritesheet(`${char}_run`,  `assets/main_characters/${char}/Run (32x32).png`,  charFrame);
      this.load.spritesheet(`${char}_jump`, `assets/main_characters/${char}/Jump (32x32).png`, charFrame);
      this.load.spritesheet(`${char}_fall`, `assets/main_characters/${char}/Fall (32x32).png`, charFrame);
      this.load.spritesheet(`${char}_dj`,   `assets/main_characters/${char}/Double Jump (32x32).png`, charFrame);
    });

    // Fruits spritesheets (17 frames chacun pour l'idle anim).
    const fruits = ['Apple', 'Bananas', 'Cherries', 'Kiwi', 'Melon', 'Orange', 'Pineapple', 'Strawberry'];
    fruits.forEach(f => {
      this.load.spritesheet(f.toLowerCase(), `assets/fruits/${f}.png`, {
        frameWidth: 32, frameHeight: 32,
      });
    });
    // Anim de ramassage commune à tous les fruits (6 frames).
    this.load.spritesheet('collected', 'assets/fruits/Collected.png', {
      frameWidth: 32, frameHeight: 32,
    });

    // Tileset terrain : 22 cols × 11 rows de 16x16.
    this.load.spritesheet('terrain', 'assets/Terrain/Terrain (16x16).png', {
      frameWidth: 16, frameHeight: 16,
    });

    // Fonds tileables (64x64 chacun). On précharge tous les fonds dispos ;
    // le bon est sélectionné via LEVELS[n].bgKey.
    this.load.image('bg_blue',   'assets/background/Blue.png');
    this.load.image('bg_purple', 'assets/background/Purple.png');
    this.load.image('bg_brown',  'assets/background/Brown.png');
    this.load.image('bg_gray',   'assets/background/Gray.png');
    this.load.image('bg_green',  'assets/background/Green.png');
    this.load.image('bg_pink',   'assets/background/Pink.png');
    this.load.image('bg_yellow', 'assets/background/Yellow.png');

    // Checkpoints
    this.load.image('endIdle', 'assets/checkpoints/end/End (Idle).png');
    this.load.spritesheet('endPressed', 'assets/checkpoints/end/End (Pressed) (64x64).png', {
      frameWidth: 64, frameHeight: 64,
    });
    this.load.image('flagIdle', 'assets/checkpoints/flag/Checkpoint (Flag Idle)(64x64).png');

    // Pièges
    this.load.image('spikes', 'assets/traps/spikes/Idle.png');
    this.load.image('trampoline_idle', 'assets/traps/trampoline/Idle.png');
    this.load.spritesheet('trampoline_jump', 'assets/traps/trampoline/Jump (28x28).png', {
      frameWidth: 28, frameHeight: 28,
    });

    // Boîtes destructibles : Idle (1 frame) / Hit (3 frames) / Break (4 frames).
    // Toutes les frames font 28x24.
    ['Box1', 'Box2', 'Box3'].forEach(b => {
      const k = b.toLowerCase();
      const fc = { frameWidth: 28, frameHeight: 24 };
      this.load.image(`${k}_idle`, `assets/items/boxes/${b}/Idle.png`);
      this.load.spritesheet(`${k}_hit`,   `assets/items/boxes/${b}/Hit (28x24).png`, fc);
      this.load.spritesheet(`${k}_break`, `assets/items/boxes/${b}/Break.png`, fc);
    });

    // Fire : cycle Off (statique) → On (3 frames, brûle) → Off. Frame 16x32.
    this.load.image('fire_off', 'assets/traps/fire/Off.png');
    this.load.spritesheet('fire_on',  'assets/traps/fire/On (16x32).png',  { frameWidth: 16, frameHeight: 32 });
    this.load.spritesheet('fire_hit', 'assets/traps/fire/Hit (16x32).png', { frameWidth: 16, frameHeight: 32 });

    // Saw : tournante en permanence (8 frames, 38x38) + chaîne décorative 8x8.
    this.load.image('saw_off', 'assets/traps/saw/Off.png');
    this.load.spritesheet('saw_on', 'assets/traps/saw/On (38x38).png', { frameWidth: 38, frameHeight: 38 });
    this.load.image('saw_chain', 'assets/traps/saw/Chain.png');

    // Falling platforms : Off (statique) + On (4 frames, secousse avant la chute). Frame 32x10.
    this.load.image('fp_off', 'assets/traps/falling_platforms/Off.png');
    this.load.spritesheet('fp_on', 'assets/traps/falling_platforms/On (32x10).png', { frameWidth: 32, frameHeight: 10 });

    loadAudio(this);
    this.load.image('btn_volume', 'assets/menu/buttons/Volume.png');
    this.load.image('btn_close', 'assets/menu/buttons/Close.png');
  }

  create() {
    try {
      const L = this.levelData;
      this.score = this.carryScore || 0;
      // Score à l'entrée du niveau : sert de base si on recommence ce niveau
      // (timeout), pour éviter de recompter les fruits déjà ramassés.
      this.levelStartScore = this.score;
      this.lives = this.carryLives != null ? this.carryLives : CONFIG.maxLives;
      this.fruitsCollected = 0;
      this.boxesBroken = 0;
      this.isDead = false;
      this.char = this.selectedChar;

      // Scoring autoritatif : au niveau 1 = nouvelle partie → on (ré)ouvre un
      // run côté serveur et on remet à zéro l'accumulateur de stats par niveau.
      this._startRunIfNew();

      // Audio : init (idempotent), musique de gameplay, contrôle mute.
      Sfx.init(this.sound);
      Sfx.playMusic('game');
      setupMuteToggle(this);

      // Pause + réglages (Échap) : ouvre l'overlay SettingsScene par-dessus.
      this.input.keyboard.on('keydown-ESC', () => {
        if (this.scene.isActive('SettingsScene')) return;
        this.scene.pause('GameScene');
        this.scene.launch('SettingsScene', {
          returnTo: 'GameScene', title: 'PAUSE', closeLabel: 'REPRENDRE',
        });
      });

      const W = L.worldWidth;
      const H = CONFIG.world.height;
      this.physics.world.setBounds(0, 0, W, H);
      this.cameras.main.setBackgroundColor(L.bgColor);

      // === Fond tileable, fixé sur le viewport, derrière tout le reste ===
      this.bg = this.add.tileSprite(0, 0, CONFIG.width, CONFIG.height, L.bgKey)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-10);

      // === Animations du personnage ===
      // Une seule fois par scène : on enregistre les anims pour tous les persos.
      const chars = ['virtual_guy', 'pink_man', 'ninja_frog', 'mask_dude'];
      chars.forEach(char => {
        const mk = (suffix, end, rate, repeat) => {
          if (this.anims.exists(`${char}_${suffix}`)) return;
          this.anims.create({
            key: `${char}_${suffix}`,
            frames: this.anims.generateFrameNumbers(`${char}_${suffix}`, { start: 0, end }),
            frameRate: rate,
            repeat,
          });
        };
        mk('idle', 10, 12, -1); // 11 frames, boucle
        mk('run',  11, 16, -1); // 12 frames, boucle rapide
        mk('jump',  0, 10,  0); //  1 frame
        mk('fall',  0, 10,  0); //  1 frame
        mk('dj',    5, 22,  0); //  6 frames, une seule passe
      });

      // === Plateformes : frames + layout proviennent du niveau ===
      this.platforms = this.physics.add.staticGroup();
      const T = 32;
      const TILE_SCALE = 2;
      const TILES = L.tiles;
      const level = L.layout;

      const pickFrame = (c, r, tw) => {
        const isTopRow = r === 0;
        const isLeftCol = c === 0;
        const isRightCol = c === tw - 1;
        if (isTopRow) {
          if (isLeftCol)  return TILES.topLeft;
          if (isRightCol) return TILES.topRight;
          return TILES.top;
        }
        if (isLeftCol)  return TILES.midLeft;
        if (isRightCol) return TILES.midRight;
        return TILES.midMid;
      };

      // Trois cas pour les tuiles du layout :
      //  - Sol (ty=18) : tout solide, collision toutes faces.
      //  - Pilier (ty != 18, th > 1) : seule la rangée d'herbe (r=0) a un body,
      //    et ce body est en "jump-through" (collision uniquement par le dessus).
      //    On peut traverser le pilier par dessous et latéralement (la terre
      //    décorative est déjà sans body), et se poser sur le haut en retombant.
      //  - Plateforme fine flottante (ty != 18, th == 1) : 100% solide (toutes
      //    faces), comportement historique des plateformes route haute.
      level.forEach(([tx, ty, tw, th]) => {
        const isGround = ty === 18;
        const isPillar = !isGround && th > 1;
        // Depth par colonne : plus la colonne est grande (ty petit), plus
        // elle est en arrière. Une petite colonne (ty grand) passe ainsi
        // ENTIÈREMENT devant les grandes adjacentes qui la chevauchent,
        // évitant les artefacts de bord (midLeft/midRight) qui découpent
        // la petite. Toutes les tuiles d'une même colonne partagent le
        // même depth. Range : ty=18 (sol) → -0.4 ; ty=4 → -6. Reste entre
        // background (-10) et entités (0 par défaut : joueur, fruits, pièges).
        const tileDepth = (ty - 19) * 0.4;
        for (let c = 0; c < tw; c++) {
          for (let r = 0; r < th; r++) {
            const x = tx * T + c * T + T / 2;
            const y = ty * T + r * T + T / 2;
            const frame = pickFrame(c, r, tw);
            if (isGround || r === 0) {
              const tile = this.platforms.create(x, y, 'terrain', frame);
              tile.setScale(TILE_SCALE);
              tile.setDepth(tileDepth);
              tile.refreshBody();
              if (isPillar) {
                // Jump-through : on désactive collision DOWN/LEFT/RIGHT, on
                // garde UP. Phaser arcade utilise checkCollision pour décider
                // si la face concernée arrête le sprite entrant.
                tile.body.checkCollision.down = false;
                tile.body.checkCollision.left = false;
                tile.body.checkCollision.right = false;
              }
            } else {
              // Tige de pilier : purement décorative (pas de body).
              this.add.image(x, y, 'terrain', frame).setScale(TILE_SCALE).setDepth(tileDepth);
            }
          }
        }
      });

      // === Petits blocs "vivants" dans les colonnes de terre (optionnel) ===
      // Bloc 2×2 (frames tiles.detail) tamponné çà et là dans les grandes
      // colonnes. La rangée du HAUT est une vraie plateforme jump-through (on
      // peut sauter à travers puis se poser dessus, collision uniquement par le
      // dessus, comme les piliers) ; la rangée du bas reste décorative.
      // Positions = L.dirtDecals = [[tx, ty(coin haut-gauche)], ...].
      if (TILES.detail && Array.isArray(L.dirtDecals)) {
        const d = TILES.detail;
        // Géométrie du bloc mesurée dans le tileset (région 2×2, px source) :
        // le bloc vert occupe y 15..29 → son SOMMET (où l'on se pose) est à
        // y=15 source = 30 px monde sous le haut de la rangée du haut. Il est
        // centré horizontalement sur la jointure des 2 tuiles, ~16 px source large.
        const CAP_TOP_OFFSET = 32; // px monde depuis le haut de la tuile du haut (sommet vert, -2px)
        const CAP_W = 26;          // largeur monde du body (-2px de chaque côté)
        const CAP_H = 24;          // hauteur monde du body
        // Décalage horizontal optionnel du bloc (visuel + collision), px monde,
        // pour l'aligner finement sur la colonne selon le niveau.
        const offX = L.dirtDecalOffsetX || 0;
        L.dirtDecals.forEach(([dtx, dty]) => {
          // Profondeur = celle de la colonne porteuse, juste devant sa terre.
          const col = level.find(([px, py, pw, ph]) =>
            py !== 18 && ph > 1 && dtx >= px && dtx < px + pw && dty >= py && dty < py + ph);
          const depth = (col ? (col[1] - 19) * 0.4 : -0.4) + 0.05;
          // Visuel : les 4 tuiles du bloc, pur décor (pas de body).
          const drawImg = (cx2, cy2, frame) =>
            this.add.image(cx2 * T + T / 2 + offX, cy2 * T + T / 2, 'terrain', frame)
              .setScale(TILE_SCALE).setDepth(depth);
          drawImg(dtx,     dty,     d.topLeft);
          drawImg(dtx + 1, dty,     d.topRight);
          drawImg(dtx,     dty + 1, d.botLeft);
          drawImg(dtx + 1, dty + 1, d.botRight);
          // Collision : un body invisible jump-through calé sur le sommet vert.
          const capX = dtx * T + T + offX;           // jointure des 2 colonnes
          const capTopY = dty * T + CAP_TOP_OFFSET;
          const cap = this.platforms.create(capX, capTopY + CAP_H / 2, 'terrain', d.topLeft);
          cap.setVisible(false).setDepth(depth);
          cap.body.setSize(CAP_W, CAP_H);            // body statique = px monde, recentré
          cap.body.checkCollision.down = false;
          cap.body.checkCollision.left = false;
          cap.body.checkCollision.right = false;
        });
      }

      // === Fruits ===
      this.fruits = this.physics.add.staticGroup();
      // Liste complète des 8 fruits (pour init des anims). La sélection du
      // sous-ensemble à spawner sur ce niveau vient de L.fruitTypes (sinon
      // fallback : tous les 8 cyclés). Permet de donner une identité visuelle
      // par niveau (ex: niv 1 ne montre que apple+strawberry).
      const ALL_FRUITS = ['apple','bananas','cherries','kiwi','melon','orange','pineapple','strawberry'];
      const fruitTypes = (L.fruitTypes && L.fruitTypes.length) ? L.fruitTypes : ALL_FRUITS;

      // Anim idle pour chaque fruit (17 frames, boucle) + anim de ramassage.
      ALL_FRUITS.forEach(type => {
        if (this.anims.exists(`${type}_idle`)) return;
        this.anims.create({
          key: `${type}_idle`,
          frames: this.anims.generateFrameNumbers(type, { start: 0, end: 16 }),
          frameRate: 14,
          repeat: -1,
        });
      });
      if (!this.anims.exists('fruit_collected')) {
        this.anims.create({
          key: 'fruit_collected',
          frames: this.anims.generateFrameNumbers('collected', { start: 0, end: 5 }),
          frameRate: 22,
          repeat: 0,
        });
      }
      // Anim de la coupe quand on l'atteint (8 frames).
      if (!this.anims.exists('flag_pressed')) {
        this.anims.create({
          key: 'flag_pressed',
          frames: this.anims.generateFrameNumbers('endPressed', { start: 0, end: 7 }),
          frameRate: 16,
          repeat: 0,
        });
      }
      // Anim du trampoline qui rebondit (8 frames, jouée une fois).
      if (!this.anims.exists('trampoline_bounce')) {
        this.anims.create({
          key: 'trampoline_bounce',
          frames: this.anims.generateFrameNumbers('trampoline_jump', { start: 0, end: 7 }),
          frameRate: 30,
          repeat: 0,
        });
      }
      // Anim feu : brûle en boucle (3 frames).
      if (!this.anims.exists('fire_burn')) {
        this.anims.create({
          key: 'fire_burn',
          frames: this.anims.generateFrameNumbers('fire_on', { start: 0, end: 2 }),
          frameRate: 12,
          repeat: -1,
        });
      }
      // Anim scie : rotation continue (8 frames).
      if (!this.anims.exists('saw_spin')) {
        this.anims.create({
          key: 'saw_spin',
          frames: this.anims.generateFrameNumbers('saw_on', { start: 0, end: 7 }),
          frameRate: 22,
          repeat: -1,
        });
      }
      // Anim plateforme branlante avant chute (4 frames, jouée 1 fois).
      if (!this.anims.exists('fp_shake')) {
        this.anims.create({
          key: 'fp_shake',
          frames: this.anims.generateFrameNumbers('fp_on', { start: 0, end: 3 }),
          frameRate: 14,
          repeat: 2,
        });
      }
      // Anims des boîtes : hit (3 frames) puis break (4 frames).
      ['box1', 'box2', 'box3'].forEach(k => {
        if (!this.anims.exists(`${k}_hit_anim`)) {
          this.anims.create({
            key: `${k}_hit_anim`,
            frames: this.anims.generateFrameNumbers(`${k}_hit`, { start: 0, end: 2 }),
            frameRate: 20,
            repeat: 0,
          });
        }
        if (!this.anims.exists(`${k}_break_anim`)) {
          this.anims.create({
            key: `${k}_break_anim`,
            frames: this.anims.generateFrameNumbers(`${k}_break`, { start: 0, end: 3 }),
            frameRate: 22,
            repeat: 0,
          });
        }
      });

      const fruitPositions = L.fruitPositions;

      fruitPositions.forEach(([fx, fy], i) => {
        // Cycle déterministe : on parcourt les 8 types pour garantir que
        // chacun apparaisse au moins 2 fois sur les 22 positions.
        const type = fruitTypes[i % fruitTypes.length];
        if (this.textures.exists(type)) {
          // Vrai sprite fruit
          const f = this.fruits.create(fx, fy, type, 0);
          f.setScale(1.75);
          const fb = FRUIT_BODY[type] || [16, 16, 8, 8];
          this._tightBody(f, fb[0], fb[1], fb[2], fb[3]);
          // Anim idle, démarrée à une frame aléatoire pour désynchroniser les fruits.
          f.play({ key: `${type}_idle`, startFrame: Math.floor(Math.random() * 17) });
          this.tweens.add({
            targets: f, y: fy - 10,
            duration: 1000 + Math.random() * 500,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Math.random() * 800,
          });
        } else {
          // Fallback cercle coloré
          const colors = [0xe74c3c, 0xf39c12, 0x2ecc71, 0x9b59b6, 0x1abc9c, 0xe67e22, 0x3498db, 0xff6b81];
          const cKey = `fruit_fb_${fx}_${fy}`;
          if (!this.textures.exists(cKey)) {
            const g = this.make.graphics({ add: false });
            g.fillStyle(colors[Math.floor(Math.random() * colors.length)]);
            g.fillCircle(16, 16, 12);
            g.fillStyle(0xffffff, 0.4);
            g.fillCircle(12, 10, 4);
            g.generateTexture(cKey, 32, 32);
            g.destroy();
          }
          const f = this.fruits.create(fx, fy, cKey);
          f.refreshBody();
          this.tweens.add({
            targets: f, y: fy - 10,
            duration: 1000 + Math.random() * 500,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Math.random() * 800,
          });
        }
      });

      this.fruitTotal = fruitPositions.length;

      // === Drapeau de fin ===
      const flagKey = this.textures.exists('endIdle') ? 'endIdle' : 'flag_end';
      if (!this.textures.exists('flag_end') && !this.textures.exists('endIdle')) {
        // Fallback
        const g = this.make.graphics({ add: false });
        g.fillStyle(0x2ecc71);
        g.fillRect(4, 0, 24, 48);
        g.fillStyle(0xf1c40f);
        g.fillTriangle(8, 4, 8, 24, 28, 14);
        g.generateTexture('flag_end', 32, 48);
        g.destroy();
      }
      const finalFlagKey = this.textures.exists('endIdle') ? 'endIdle' : 'flag_end';
      // staticSprite (et pas staticImage) car on joue une animation dessus
      // quand le perso atteint la coupe (.play() n'existe pas sur Image).
      this.flag = this.physics.add.staticSprite(L.flag.x, L.flag.y, finalFlagKey);
      this.flag.setScale(1.75);
      this.flag.refreshBody();

      // === Trampolines ===
      this.trampolines = this.physics.add.staticGroup();
      (L.trampolines || []).forEach(({ x, y }) => {
        const tramp = this.trampolines.create(x, y, 'trampoline_idle');
        tramp.setScale(2);
        // Seule la base (le coussin) est solide : bande basse y17..28.
        this._tightBody(tramp, 23, 11, 2, 17);
      });

      // === Pointes ===
      this.spikes = this.physics.add.staticGroup();
      (L.spikes || []).forEach(({ x, y }) => {
        const spike = this.spikes.create(x, y, 'spikes');
        spike.setScale(2);
        // Les pointes n'occupent que la bande basse de la tuile 16×16 (y9..16).
        this._tightBody(spike, 16, 7, 0, 9);
      });

      // === Boîtes destructibles ===
      // On utilise staticSprite (et pas staticImage) pour pouvoir jouer
      // l'animation hit puis break dessus.
      this.boxes = this.physics.add.staticGroup();
      (L.boxes || []).forEach(({ x, y, type }) => {
        const key = `${type}_idle`;
        if (!this.textures.exists(key)) return;
        const box = this.physics.add.staticSprite(x, y, key);
        box.setScale(2);
        // La caisse a ~4px de marge transparente : contenu 20×20 à (4,2).
        this._tightBody(box, 20, 20, 4, 2);
        box.boxType = type;
        this.boxes.add(box);
      });

      // === Feux (cyclent on/off, dégât quand "on") ===
      // Format LEVELS.fires : [{ x, y, period, phase }]
      //   period (ms) : durée totale d'un cycle (1/2 off, 1/2 on). Défaut 2000.
      //   phase (0..1) : décalage initial pour désynchroniser plusieurs feux.
      this.fires = this.physics.add.staticGroup();
      (L.fires || []).forEach(({ x, y, period = 2000, phase = 0 }) => {
        const fire = this.physics.add.staticSprite(x, y, 'fire_off');
        fire.setScale(2);
        // Cœur de la flamme (frame 16×32) ; le dégât n'est actif que "burning".
        this._tightBody(fire, 12, 28, 2, 4);
        fire.burning = false;
        this.fires.add(fire);
        const half = period / 2;
        const initialDelay = Math.max(1, Math.floor(half * (phase % 1)));
        // Toggle après le délai initial, puis tous les `half` ms.
        this.time.delayedCall(initialDelay, () => {
          this._toggleFire(fire);
          this.time.addEvent({
            delay: half,
            loop: true,
            callback: () => this._toggleFire(fire),
          });
        });
      });

      // === Scies (patrouillent horizontalement, toujours actives) ===
      // Format LEVELS.saws : [{ x, y, range, speed }]
      //   range : amplitude de la patrouille (en px de chaque côté de x).
      //   speed : px/s pendant la patrouille.
      this.saws = this.physics.add.group({ allowGravity: false, immovable: true });
      (L.saws || []).forEach(({ x, y, range = 80, speed = 120 }) => {
        const saw = this.saws.create(x, y, 'saw_on');
        saw.setScale(1.5);
        saw.body.allowGravity = false;
        // Hitbox RONDE serrée sur la lame (dynamique → pixels source, frame 38×38).
        saw.body.setCircle(14, 5, 5);
        saw.play('saw_spin');
        // Tween yo-yo entre x-range et x+range.
        const duration = (range * 2 / speed) * 1000;
        this.tweens.add({
          targets: saw,
          x: x + range,
          duration,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      });

      // === Plateformes qui tombent (déclenchées quand le joueur monte dessus) ===
      // Format LEVELS.fallingPlatforms : [{ x, y, delay }]
      //   delay (ms) avant la chute après le contact. Défaut 500.
      this.fallingPlatforms = this.physics.add.staticGroup();
      (L.fallingPlatforms || []).forEach(({ x, y, delay = 500 }) => {
        const fp = this.physics.add.staticSprite(x, y, 'fp_off');
        fp.setScale(2);
        fp.refreshBody();
        fp.triggered = false;
        fp.fallDelay = delay;
        this.fallingPlatforms.add(fp);
      });

      // === Joueur ===
      this.player = new Player(this, L.playerStart.x, L.playerStart.y, this.char);

      // === Collisions ===
      this.physics.add.collider(this.player.sprite, this.platforms);
      this.physics.add.overlap(this.player.sprite, this.fruits, this.collectFruit, null, this);
      this.physics.add.overlap(this.player.sprite, this.flag, this.reachFlag, null, this);
      this.physics.add.overlap(this.player.sprite, this.trampolines, this.hitTrampoline, null, this);
      this.physics.add.overlap(this.player.sprite, this.spikes, this.hitSpikes, null, this);
      // Collider (et pas overlap) pour que les boîtes soient solides ; on
      // détecte le contact "par dessous" via body.touching.up dans le handler.
      this.physics.add.collider(this.player.sprite, this.boxes, this.hitBox, null, this);
      // Feu et scie : overlap = dégât quand actif (le feu n'a un body que
      // pendant la phase "burning", géré dans le handler).
      this.physics.add.overlap(this.player.sprite, this.fires, this.hitFire, null, this);
      this.physics.add.overlap(this.player.sprite, this.saws, this.hitSaw, null, this);
      // Plateformes qui tombent : collider solide tant que pas déclenché.
      this.physics.add.collider(this.player.sprite, this.fallingPlatforms, this._touchFallingPlatform, null, this);

      // === Caméra : pas de zoom (rendu pixel-perfect) ===
      // La hauteur de vue (= CONFIG.height = 750) est plus grande que la
      // hauteur du monde (600), donc on cale les bounds pour que le bas
      // du sol (y = 640) reste collé en bas de l'écran.
      const VIEW_H = CONFIG.height;                      // 750
      const GROUND_BOTTOM_Y = (18 + 2) * 32;             // bas de la 2e rangée de sol
      const CAM_TOP_Y = GROUND_BOTTOM_Y - VIEW_H;        // -110
      this.cameras.main.setBounds(0, CAM_TOP_Y, W, VIEW_H);
      this.cameras.main.startFollow(this.player.sprite, true, 0.2, 0.2);
      this.cameras.main.setDeadzone(80, 300);

      // === Input ===
      // Touches construites depuis la config remappable (src/controls.js).
      // Reconstruites au retour de pause si le joueur a changé un binding.
      this.keymap = this._buildControls();
      this.events.on('resume', () => { this.keymap = this._buildControls(); });

      // === HUD : style "platformer classique" en haut à gauche ===
      // Pas de cadres : juste icône + valeur, gros stroke noir pour la
      // lisibilité par-dessus n'importe quel décor. Les cœurs sont des
      // game objects séparés qui se vident un par un selon la vie.
      this.hudScoreIcon = this.add.text(18, 14, '★', {
        fontSize: '34px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: '#ffd700', stroke: '#000', strokeThickness: 6,
      }).setScrollFactor(0).setDepth(100);

      this.hudScoreText = this.add.text(62, 20, '0', {
        fontSize: '28px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff', stroke: '#000', strokeThickness: 6,
      }).setScrollFactor(0).setDepth(100);

      // Cœurs : un Graphics par vie max, dessiné à la main (pointe basse douce,
      // sans la "queue" du glyphe ♥). On bascule plein / vide via _drawHeart.
      // Init selon `this.lives` (peut être < maxLives en arrivant d'un niveau
      // précédent avec des cœurs déjà perdus).
      this.hudHearts = [];
      for (let i = 0; i < CONFIG.maxLives; i++) {
        const alive = i < this.lives;
        const heart = this.add.graphics({ x: 32 + i * 36, y: 82 })
          .setScrollFactor(0).setDepth(100);
        this._drawHeart(heart, alive);
        this.hudHearts.push(heart);
      }

      this.hudFruitIcon = this.add.text(18, 116, '🍎', {
        fontSize: '30px',
      }).setScrollFactor(0).setDepth(100);

      this.hudFruitText = this.add.text(62, 120, `0 / ${this.fruitTotal}`, {
        fontSize: '24px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ffd700', stroke: '#000', strokeThickness: 6,
      }).setScrollFactor(0).setDepth(100);

      this.updateUI();

      // === Timer du niveau (haut centre) ===
      this.timeLeft = CONFIG.levelTime;
      this.hudTimerText = this.add.text(CONFIG.width / 2, 14, '', {
        fontSize: '36px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff', stroke: '#000', strokeThickness: 6,
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
      this._updateTimerDisplay();
      // Event en pause automatiquement quand la scène est en pause (overlay Réglages).
      this.time.addEvent({
        delay: 1000, loop: true, callback: this._tickTimer, callbackScope: this,
      });

      // Bannière "Niveau X" qui fade-in puis fade-out après ~1.4s.
      const banner = this.add.text(CONFIG.width / 2, CONFIG.height / 2 - 40, L.name, {
        fontSize: '44px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 8,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);
      this.tweens.add({
        targets: banner,
        alpha: { from: 0, to: 1 },
        duration: 350,
        yoyo: true,
        hold: 1100,
        onComplete: () => banner.destroy(),
      });

      this.cameras.main.fadeIn(300);
      console.log('GameScene OK level=' + this.levelNum);
    } catch(e) {
      console.error('GameScene error:', e);
      this.add.text(400, 300, 'Error: ' + e.message, { fontSize: '24px', color: '#f00' }).setOrigin(0.5);
    }
  }

  hitTrampoline(playerSprite, tramp) {
    // Évite les boucles d'overlap : un seul rebond par cycle d'animation.
    if (tramp.bouncing) return;
    tramp.bouncing = true;
    // Boost vertical fort + reset du double saut pour que le joueur puisse
    // encore enchaîner un saut en l'air après le trampoline.
    playerSprite.setVelocityY(-820);
    this.player.jumpsRemaining = 2;
    this.player.djAnimActive = false;
    Sfx.trampoline();
    tramp.play('trampoline_bounce');
    tramp.once('animationcomplete', () => {
      tramp.setTexture('trampoline_idle');
      tramp.bouncing = false;
    });
  }

  hitSpikes() {
    this.takeDamage();
  }

  // Feu : dégât uniquement quand la flamme est active (phase "On" du cycle).
  hitFire(_playerSprite, fire) {
    if (!fire.burning) return;
    this.takeDamage();
  }

  // Scie : toujours active, contact = dégât.
  hitSaw() {
    this.takeDamage();
  }

  // Bascule feu actif/inactif (appelé par le timer du cycle).
  _toggleFire(fire) {
    if (!fire || !fire.active) return;
    if (fire.burning) {
      fire.burning = false;
      fire.anims.stop();
      fire.setTexture('fire_off');
    } else {
      fire.burning = true;
      fire.play('fire_burn');
    }
  }

  // Plateforme qui tombe : on déclenche la chute quand le joueur atterrit
  // dessus (y du joueur au-dessus de celui de la plateforme).
  _touchFallingPlatform(playerSprite, fp) {
    if (fp.triggered) return;
    if (playerSprite.y >= fp.y) return; // contact latéral / par dessous : ignore
    fp.triggered = true;
    fp.play('fp_shake');
    this.time.delayedCall(fp.fallDelay, () => {
      if (!fp.active) return;
      // Coupe la collision, anim off, et chute par tween.
      if (fp.body) fp.body.enable = false;
      fp.setTexture('fp_off');
      this.tweens.add({
        targets: fp,
        y: fp.y + 700,
        alpha: { from: 1, to: 0.6 },
        duration: 900,
        ease: 'Cubic.In',
        onComplete: () => fp.destroy(),
      });
    });
  }

  // Boîte cassée : seulement si le joueur l'a tapée par DESSOUS (sa tête
  // touche le bas de la boîte = body.touching.up). Sinon il marche dessus.
  hitBox(playerSprite, box) {
    if (box.broken) return;
    if (!playerSprite.body.touching.up) return;
    box.broken = true;
    // Désactive la collision pour qu'on puisse passer pendant l'anim de destruction.
    if (box.body) box.body.enable = false;
    this.boxesBroken++;
    this.score += 50;
    this.updateUI();
    this._spawnFloatingText(box.x, box.y - 24, '+50', '#ffd700');
    Sfx.boxBreak();
    box.play(`${box.boxType}_hit_anim`);
    box.once('animationcomplete', () => {
      box.play(`${box.boxType}_break_anim`);
      box.once('animationcomplete', () => box.destroy());
    });
  }

  // Dégât en place (piques) : perte d'un cœur + invincibilité 1.5s avec
  // clignotement. PAS de téléportation, le joueur reste où il est.
  takeDamage() {
    if (this.isDead || (this.player && this.player.invincible)) return;
    this.lives--;
    this.updateUI();
    this._loseHeart();
    if (this.lives <= 0) {
      Sfx.death();
      Sfx.stopMusic();
      this._freezePlayer();
      this.isDead = true;
      this._pushLevelResult(false); // game over : niveau en cours non terminé
      this.time.delayedCall(500, () => this.scene.start('GameOverScene', { score: this.score }));
      return;
    }
    Sfx.hit();
    this._startInvincibility(1500);
  }

  // Fige le perso : stop vitesse + anim + gravité. Utilisé sur game over
  // pour éviter qu'il continue à courir ou tomber pendant la transition.
  _freezePlayer() {
    if (!this.player || !this.player.sprite) return;
    const s = this.player.sprite;
    s.setVelocity(0, 0);
    if (s.body) s.body.allowGravity = false;
    if (s.anims) s.anims.pause();
  }

  _startInvincibility(duration) {
    if (!this.player) return;
    this.player.invincible = true;
    const sprite = this.player.sprite;
    // Clignotement alpha rapide pendant toute la durée.
    const blink = this.tweens.add({
      targets: sprite,
      alpha: { from: 1, to: 0.3 },
      duration: 100,
      yoyo: true,
      repeat: -1,
    });
    this.time.delayedCall(duration, () => {
      blink.stop();
      sprite.setAlpha(1);
      this.player.invincible = false;
    });
  }

  collectFruit(_, fruit) {
    // Garde contre les overlaps multiples pendant l'anim Collected.
    if (fruit.collected) return;
    fruit.collected = true;
    this.fruitsCollected++;
    this.score += 10;
    this.updateUI();
    // HUD reste fixe sur le ramassage — seul un "+10" flottant apparaît
    // au-dessus du fruit pour le feedback visuel local.
    this._spawnFloatingText(fruit.x, fruit.y - 10, '+10', '#ffd700');
    Sfx.pickup();
    // On joue l'anim de ramassage puis on détruit le sprite.
    fruit.play('fruit_collected');
    fruit.once('animationcomplete', () => fruit.destroy());
  }

  reachFlag() {
    if (this.isDead) return;
    this.isDead = true;
    // Niveau terminé : on enregistre ses stats (timeLeft encore plein, avant le
    // décompte) pour le scoring autoritatif côté serveur.
    this._pushLevelResult(true);
    Sfx.win();
    this._freezePlayer();
    // Anim de la coupe : transition vers le spritesheet "pressed".
    if (this.anims.exists('flag_pressed')) {
      this.flag.setTexture('endPressed', 0);
      this.flag.play('flag_pressed');
    }
    // Explosion de confettis au-dessus de la coupe.
    this._spawnConfetti(this.flag.x, this.flag.y - 40);
    // Temps d'arrêt, puis décompte temps -> points, puis transition.
    this.time.delayedCall(400, () => this._tallyTimeBonus(() => this._exitLevel()));
  }

  // Décompte le temps restant jusqu'à 0 sur ~1.5s : chaque seconde consommée
  // crédite +1 point. Affichages timer + score mis à jour en direct, son de
  // pièce joué en cadence (~15 max). Appelle onDone une fois le décompte fini.
  _tallyTimeBonus(onDone) {
    const start = Math.max(0, this.timeLeft);
    if (start <= 0) {
      onDone();
      return;
    }
    const coinEvery = Math.max(1, Math.ceil(start / 15));
    const proxy = { t: start };
    let credited = 0;
    this.tweens.add({
      targets: proxy,
      t: 0,
      duration: 1500,
      ease: 'Linear',
      onUpdate: () => {
        const consumed = start - Math.ceil(proxy.t); // secondes entières écoulées
        if (consumed <= credited) return;
        this.score += consumed - credited;
        // Une pièce tous les `coinEvery` points crédités (cascade, pas mitraille).
        if (Math.floor(consumed / coinEvery) > Math.floor(credited / coinEvery)) {
          Sfx.coin();
        }
        credited = consumed;
        this.timeLeft = Math.ceil(proxy.t);
        this._updateTimerDisplay();
        this.updateUI();
      },
      onComplete: () => {
        this.score += start - credited; // solde éventuel
        this.timeLeft = 0;
        this._updateTimerDisplay();
        this.updateUI();
        onDone();
      },
    });
  }

  _exitLevel() {
    this.cameras.main.fadeOut(1000);
    this.time.delayedCall(1000, () => {
      const next = this.levelData.next;
      if (next) {
        // Enchaîne sur le niveau suivant en conservant score et vies.
        this.scene.start('GameScene', {
          level: next,
          carryScore: this.score,
          carryLives: this.lives,
        });
      } else {
        // Bonus de fin de jeu : +200 par vie restante (600 max).
        const lifeBonus = this.lives * CONFIG.lifeBonus;
        this.scene.start('VictoryScene', {
          score: this.score + lifeBonus,
          baseScore: this.score,
          lifeBonus,
          fruitsCollected: this.fruitsCollected,
          fruitTotal: this.fruitTotal,
          lives: this.lives,
        });
      }
    });
  }

  // Nouvelle partie (niveau 1) : ouvre un run côté serveur (runId stocké dans le
  // registry, lu à la soumission) et remet à zéro les stats par niveau. En cas
  // de serveur indisponible, runId reste null → soumission impossible mais le
  // jeu n'est pas bloqué (dégradation propre).
  _startRunIfNew() {
    if (this.levelNum !== 1) return;
    this.registry.set('runLevels', []);
    this.registry.set('runId', null);
    startRun()
      .then((id) => this.registry.set('runId', id))
      .catch(() => {});
  }

  // Enregistre les stats du niveau courant dans le registry (consommées par la
  // soumission). `completed` = drapeau atteint (avec bonus temps) vs game over.
  _pushLevelResult(completed) {
    const levels = this.registry.get('runLevels') || [];
    levels.push({
      level: this.levelNum,
      fruits: this.fruitsCollected,
      boxes: this.boxesBroken,
      timeLeft: completed ? Math.max(0, Math.floor(this.timeLeft)) : 0,
      lives: this.lives,
      completed,
    });
    this.registry.set('runLevels', levels);
  }

  update() {
    // Scroll diagonal continu du fond (effet PixelFrog).
    if (this.bg) {
      this.bg.tilePositionX += 0.4;
      this.bg.tilePositionY -= 0.4;
    }

    if (this.isDead || !this.player) return;
    this.player.update(this.keymap);
    if (this.player.sprite.y > 700) this.die();
  }

  // Resserre la hitbox d'un sprite STATIQUE sur le contenu réellement dessiné.
  // w/h/ox/oy sont en pixels SOURCE (non scalés) ; on les convertit en pixels
  // monde (× scale). Ordre impératif : refreshBody() AVANT setSize/setOffset,
  // car refreshBody() réinitialise la taille du body à la frame entière.
  _tightBody(sprite, w, h, ox, oy) {
    const s = sprite.scaleX;
    sprite.refreshBody();
    sprite.body.setSize(w * s, h * s, false);
    sprite.body.setOffset(ox * s, oy * s);
  }

  // Tic du timer (toutes les secondes). Figé tant que isDead (victoire / mort
  // en cours) ; l'event lui-même est mis en pause quand la scène est en pause.
  _tickTimer() {
    if (this.isDead) return;
    this.timeLeft--;
    this._updateTimerDisplay();
    if (this.timeLeft <= 0) this._onTimeout();
  }

  _updateTimerDisplay() {
    if (!this.hudTimerText) return;
    const t = Math.max(0, this.timeLeft);
    const m = Math.floor(t / 60);
    const s = t % 60;
    this.hudTimerText.setText(`${m}:${String(s).padStart(2, '0')}`);
    this.hudTimerText.setColor(t <= 10 ? '#ff4444' : '#ffffff');
  }

  // Temps écoulé : on perd un cœur puis on recommence le niveau (ou game over
  // si c'était le dernier cœur). Score remis à sa valeur d'entrée de niveau.
  _onTimeout() {
    if (this.isDead) return;
    this.isDead = true;
    this.lives--;
    this._loseHeart();
    Sfx.stopMusic();
    Sfx.death();
    this._freezePlayer();
    if (this.player && this.player.sprite) {
      this._spawnFloatingText(this.player.sprite.x, this.player.sprite.y - 40, 'TEMPS ÉCOULÉ !', '#ff4444');
    }
    this.time.delayedCall(900, () => {
      if (this.lives <= 0) {
        this._pushLevelResult(false); // game over par timeout : niveau non terminé
        this.scene.start('GameOverScene', { score: this.score });
      } else {
        this.scene.start('GameScene', {
          level: this.levelNum,
          carryScore: this.levelStartScore,
          carryLives: this.lives,
        });
      }
    });
  }

  // Construit les objets Key depuis la config remappable. Retire d'abord les
  // touches déjà créées (évite l'accumulation lors d'un rebuild après pause).
  _buildControls() {
    if (this._actionKeys) {
      this._actionKeys.forEach((k) => this.input.keyboard.removeKey(k.keyCode));
    }
    const c = getControls();
    const make = (codes) => codes.map((code) => this.input.keyboard.addKey(code));
    const keymap = { left: make(c.left), right: make(c.right), jump: make(c.jump) };
    this._actionKeys = [...keymap.left, ...keymap.right, ...keymap.jump];
    return keymap;
  }

  die() {
    this.lives--;
    this.updateUI();
    this._loseHeart();
    Sfx.death();
    if (this.lives <= 0) {
      Sfx.stopMusic();
      this._freezePlayer();
      this.isDead = true;
      this._pushLevelResult(false); // game over : niveau en cours non terminé
      this.time.delayedCall(500, () => this.scene.start('GameOverScene', { score: this.score }));
    } else {
      this.player.sprite.setPosition(this.levelData.playerStart.x, this.levelData.playerStart.y - 80);
      this.player.sprite.setVelocity(0, 0);
      this.player.jumpsRemaining = 2;
      this.player.djAnimActive = false;
      this.timeLeft = CONFIG.levelTime;
      this._updateTimerDisplay();
      this.cameras.main.shake(200, 0.01);
    }
  }

  updateUI() {
    if (!this.hudScoreText) return;
    this.hudScoreText.setText(`${this.score}`);
    this.hudFruitText.setText(`${this.fruitsCollected} / ${this.fruitTotal}`);
    // NB : les cœurs sont gérés explicitement par _loseHeart() à chaque
    // dégât pour pouvoir jouer l'anim. Pas de reset global ici.
  }

  // Anim "perte de cœur" : secousse horizontale puis bascule visuelle vers
  // l'état vide (cœur assombri). Le cœur est un Graphics redessiné par _drawHeart.
  _loseHeart() {
    const lostIdx = this.lives; // index du cœur qui vient de tomber
    const heart = this.hudHearts && this.hudHearts[lostIdx];
    if (!heart) return;
    this.tweens.killTweensOf(heart);

    const startX = heart.x;
    this.tweens.add({
      targets: heart,
      x: { from: startX - 4, to: startX + 4 },
      duration: 35,
      yoyo: true,
      repeat: 5,
      onComplete: () => heart.setX(startX),
    });
    this.time.delayedCall(260, () => this._drawHeart(heart, false));
  }

  // Dessine un cœur dans le Graphics g (origine locale) à partir de la courbe
  // paramétrique classique du cœur (silhouette lisse, humps arrondis, pointe
  // douce — pas la "queue" du glyphe de police). Remplissage + contour noir
  // qui suit la courbe. filled=false → cœur vide assombri.
  _drawHeart(g, filled) {
    g.clear();
    const scale = 0.85;
    const pts = [];
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push({ x: x * scale, y: -y * scale }); // y inversé (écran vers le bas)
    }
    g.fillStyle(filled ? 0xff3a3a : 0x552222, filled ? 1 : 0.55);
    g.fillPoints(pts, true);
    g.lineStyle(3, 0x000000, 1);
    g.strokePoints(pts, true);
  }

  // Explosion de confettis (50 rectangles colorés) qui jaillissent puis
  // retombent avec rotation et fade. Pas d'asset : on dessine des rectangles
  // colorés à la volée. Phase 1 : montée courte (300-600 ms, easeOut), phase
  // 2 : chute accélérée (900-1200 ms, easeIn) + rotation continue + alpha 0.
  _spawnConfetti(x, y) {
    const colors = [0xff3a3a, 0xffd700, 0x2ecc71, 0x3498db, 0x9b59b6, 0xe67e22, 0xff6b81, 0xffffff];
    for (let i = 0; i < 50; i++) {
      const color = Phaser.Utils.Array.GetRandom(colors);
      const w = Phaser.Math.Between(6, 10);
      const h = Phaser.Math.Between(3, 5);
      const conf = this.add.rectangle(x, y, w, h, color).setDepth(5);
      conf.setAngle(Phaser.Math.Between(0, 360));
      const upHeight   = Phaser.Math.Between(60, 200);
      const upDuration = Phaser.Math.Between(300, 600);
      const dxTotal    = Phaser.Math.Between(-240, 240);
      const fallDist   = upHeight + Phaser.Math.Between(280, 480);
      const fallDur    = Phaser.Math.Between(900, 1200);
      // Phase 1 : explosion vers le haut avec drift horizontal léger.
      this.tweens.add({
        targets: conf,
        y: y - upHeight,
        x: conf.x + dxTotal * 0.3,
        duration: upDuration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!conf.active) return;
          // Phase 2 : chute accélérée + spin + fade.
          this.tweens.add({
            targets: conf,
            y: conf.y + fallDist,
            x: conf.x + dxTotal * 0.7,
            angle: Phaser.Math.Between(-720, 720),
            alpha: { from: 1, to: 0 },
            duration: fallDur,
            ease: 'Cubic.easeIn',
            onComplete: () => conf.destroy(),
          });
        },
      });
    }
  }

  // Texte flottant "+10" qui monte au-dessus du fruit et fond.
  _spawnFloatingText(x, y, text, color = '#ffd700') {
    const t = this.add.text(x, y, text, {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontStyle: 'bold',
      color,
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: t,
      y: y - 60,
      alpha: { from: 1, to: 0 },
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }
}
