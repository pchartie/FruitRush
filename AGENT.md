# Fruit Rush — Guide pour assistants IA

Ce document explique l'architecture du projet pour qu'un autre agent puisse contribuer rapidement sans relire tout l'historique de développement.

## Vue d'ensemble

**Fruit Rush** est un jeu de plateforme 2D fait en **Phaser 3.80** + **Vite 5**, en JavaScript pur (ES modules, pas de TypeScript). Pixel art, 2 niveaux, pas d'ennemis (par choix produit).

But du jeu : ramasser des fruits, éviter pièges et chutes, casser des boîtes pour bonus, atteindre la coupe à la fin de chaque niveau.

## Lancer le projet

```bash
npm install
npm run dev      # lance Vite (front, http://localhost:3000) + API scores (http://localhost:3001)
npm run build    # build statique du front dans dist/
npm start        # serveur de prod : Express sert l'API + dist/ (un seul service)
```

`npm run dev` utilise `concurrently` pour démarrer **deux** process : le client Vite
(`dev:client`) et le serveur Express des high scores (`dev:server`, via `node --watch`).
Vite proxifie `/api` → `http://localhost:3001` (voir `vite.config.js`).

Prérequis : **Node ≥ 18** (testé sur Node 20). `better-sqlite3` est un module natif
(prebuilds téléchargés à l'`npm install`).

## Structure du code

```
src/
├─ main.js                Bootstrap Phaser, déclare les scènes
├─ config.js              Constantes globales (taille rendu, gravité, vies max, lifeBonus…)
├─ controls.js            Touches remappables (left/right/jump × 2 slots, persisté localStorage)
├─ scenes/
│  ├─ MenuScene.js        Titre, sélection de perso, bouton Jouer (+ ⚙ Réglages, 🏆 scores)
│  ├─ GameScene.js        Cœur du jeu, gameplay (input construit depuis controls.js)
│  ├─ GameOverScene.js    À la perte de toutes les vies (+ classement)
│  ├─ VictoryScene.js     Quand on finit le dernier niveau (+ bonus vies + classement)
│  ├─ SettingsScene.js    Overlay réglages : volumes + mute + remapping touches
│  └─ HighScoresScene.js  Overlay « Meilleurs scores » (bouton menu)
├─ api/
│  └─ scores.js           Client REST high scores (fetchScores/submitScore/qualifies)
├─ entities/
│  └─ player/Player.js    Classe Player (mouvement, sauts, anim state-machine)
├─ levels/
│  └─ levels.js           Configs des niveaux (LEVELS[1], LEVELS[2])
├─ audio/
│  ├─ Sfx.js              API audio unique : fichiers réels (Phaser) + fallback synthé + musique + mute
│  └─ loadAudio.js        Charge les assets audio dans le cache Phaser (appelé en preload)
└─ ui/
   ├─ buildButton.js      Bouton biseauté réutilisable (presets green/orange/gray)
   ├─ buildTitle.js       Titre stylisé avec ombre + pulsation
   ├─ buildSectionLabel.js Label encadré de filets décoratifs
   ├─ buildStatsPanel.js  Panneau de stats biseauté
   ├─ buildSlider.js      Curseur de volume réutilisable (piste + bouton draggable)
   ├─ buildScoreList.js   Rend un Top N stylé (rang · pseudo · score, surbrillance)
   ├─ buildNameEntry.js   Saisie de pseudo au clavier (curseur clignotant)
   ├─ mountHighScores.js  Orchestration fin de partie : fetch → saisie si Top 10 → POST → liste
   └─ setupMuteToggle.js  Touche M + icône 🔊/🔇 (mute global persisté localStorage)

server/                   Backend high scores (Express + SQLite, ESM)
├─ index.js               API : GET/POST /api/scores, sert dist/ en prod
└─ db.js                  better-sqlite3 : table scores, getTop/insertScore (data/ git-ignoré)

assets/                    Sprites PixelFrog (Pixel Adventure 1 pack)
├─ main_characters/        4 persos : virtual_guy, pink_man, ninja_frog, mask_dude
├─ fruits/                 8 fruits (spritesheets 17 frames) + Collected (6 frames)
├─ Terrain/                Tileset 16x16 (22 cols × 11 rows)
├─ background/             7 fonds tileables 64x64
├─ checkpoints/            end (Idle + Pressed), flag, start
├─ traps/                  spikes, trampoline, fire, saw, falling_platforms
├─ items/boxes/            Box1/2/3 (Idle, Hit, Break)
├─ enemies/                Sprite sheet 20 ennemis (NON utilisé — pas d'ennemis)
└─ menu/buttons/           Boutons pré-faits (NON utilisés — boutons générés en code)
```

## Échelles et conventions de coordonnées

C'est le piège principal du projet, comprendre ça évite 80% des bugs :

- **Rendu interne** : 1000×750 (`CONFIG.width`/`height`), upscalé par Phaser FIT au browser
- **Pas de zoom caméra** : `zoom = 1` exact, pour éviter l'aliasing fractionnaire
- **Grille monde** : 32 unités par tuile logique (constante `T = 32` dans GameScene)
- **Tileset terrain** : tuiles source 16×16, **rendues à `setScale(2)` = 32 unités** monde
- **Perso et fruits** : `setScale(1.75)` (32 → 56 visible)
- **Drapeau, coupe** : `setScale(1.75)` (cohérence)
- **Trampolines** : `setScale(2)` (28 → 56)
- **Pointes** : `setScale(2)` (16 → 32)
- **Boîtes** : `setScale(2)` (28×24 → 56×48)

Le sol est à `ty=18` dans la grille tuile = **y monde 576 (top) à 640 (bottom row 2)**. La caméra est verrouillée verticalement pour aligner ce bas de sol au bas du viewport (`CAM_TOP_Y = -110`).

## Flow des scènes

```
MenuScene  →  GameScene (level 1)  →  GameScene (level 2)  →  VictoryScene
              ↓ (mort)                ↓ (mort)
              GameOverScene           GameOverScene
              ↓ Recommencer           ↓ Recommencer
              GameScene (level 1)     GameScene (level 2)
              ↓ Menu                  ↓ Menu
              MenuScene               MenuScene
```

Le **registry Phaser** persiste `char` (perso choisi) et `currentLevel` entre scènes. Le `carryScore` et `carryLives` sont passés via `scene.start(key, data)` pour conserver les stats au passage de niveau.

## Système de niveaux

Chaque entrée dans `LEVELS` (dans `src/levels/levels.js`) contient :

```js
{
  name, bgKey, bgColor,
  tiles: { topLeft, top, topRight, midLeft, midMid, midRight },  // indices dans 'terrain'
  worldWidth,
  playerStart: { x, y },
  flag: { x, y },
  layout: [[tx, ty, tw, th], ...],     // plateformes en grille tuile
  fruitPositions: [[x, y], ...],
  trampolines: [{ x, y }, ...],
  spikes: [{ x, y }, ...],
  boxes: [{ x, y, type }, ...],         // type = 'box1' ou 'box2'
  // --- Pièges câblés mais optionnels (tableau facultatif) ---
  fires: [{ x, y, period, phase }, ...],         // period (ms) cycle on/off, phase 0..1
  saws:  [{ x, y, range, speed }, ...],          // patrouille horizontale ±range à speed px/s
  fallingPlatforms: [{ x, y, delay }, ...],      // solide → shake → chute après `delay` ms
  next: numLevel | null,                // null = victoire à ce niveau
}
```

Le kit terrain utilisé fait **3 tuiles de large** (cols 6-8 du tileset pour le grass+dirt, cols 6-8 rows 8-9 pour le pink candy). Les frames sont :
- Niveau 1 : `topLeft=6, top=7, topRight=8, midLeft=28, midMid=29, midRight=30`
- Niveau 2 : `topLeft=182, top=183, topRight=184, midLeft=204, midMid=205, midRight=206`

`pickFrame(c, r, tw)` dans `GameScene.create()` choisit la frame selon position dans la plateforme (premier/dernier col = corner, autre = middle).

## Gameplay

### Player (`Player.js`)
- Spritesheets chargées par perso : `_idle`, `_run`, `_jump`, `_fall`, `_dj` (double jump)
- State machine simple : on choisit l'anim à jouer chaque frame selon vitesse et `onGround`
- **Double saut** : `MAX_JUMPS = 2`, reset au sol, utilise `Phaser.Input.Keyboard.JustDown` (pas `isDown`) pour éviter le re-déclenchement avec touche maintenue
- **Anim de double jump** : déclenchée seulement quand le 2e saut est consommé en l'air, joue une fois puis reprend la state-machine
- `invincible: true` ignore les dégâts (utilisé après hit de piques)

### Pièges (handlers dans `GameScene`)
- `hitTrampoline` : `setVelocityY(-820)`, reset `jumpsRemaining = 2`, joue anim, garde `bouncing` pour éviter spam
- `hitSpikes` → `takeDamage()` : -1 cœur, **invincibilité 1.5s avec tween alpha**, joueur reste sur place
- `hitBox` : vérifie `playerSprite.body.touching.up` (= tapé par dessous), désactive body, anim hit→break, +50 score

### Vies et game over
- `this.lives` géré dans GameScene, max 3 (`CONFIG.maxLives`)
- HUD cœurs : objets texte séparés (♥/♡) avec alpha, animés individuellement
- `_loseHeart()` : pop + secousse + bascule en ♡ outlined
- `_freezePlayer()` : sur game over, stop velocity + gravité + anims (sinon le perso continue à courir)

### Chute vs piques
- **Chute** (y > 700) → `die()` → téléport au start + perte cœur (toujours, ignore invincibilité)
- **Piques** → `takeDamage()` → reste sur place + invincibilité

### Timer de niveau
- `CONFIG.levelTime` (défaut 60 s). HUD `hudTimerText` en haut au centre (MM:SS, rouge ≤ 10 s).
- Compte à rebours via `this.time.addEvent({delay:1000, loop:true})` → `_tickTimer()`. L'event
  se met en pause automatiquement quand la scène est en pause (overlay Réglages) car la `Clock`
  Phaser suit `PRE_UPDATE`, non émis sur une scène pausée.
- À 0 → `_onTimeout()` : perte d'un cœur (`_loseHeart`) puis **on recommence le niveau** avec
  `carryLives = lives-1` et `carryScore = levelStartScore` (évite de recompter les fruits) ;
  **game over** si c'était le dernier cœur. Figé pendant victoire/mort via le garde `isDead`.

## Audio

`src/audio/Sfx.js` expose une API unique adossée à **deux moteurs** :

1. **Fichiers réels CC0** (dans `assets/audio/`, voir `assets/audio/CREDITS.md`) chargés
   dans le cache Phaser par `loadAudio(scene)` (appelé dans les `preload()` de Menu et
   GameScene) et joués via le **Sound Manager global** (`game.sound`). C'est le chemin nominal.
2. **Synthé Web Audio** (oscillator + enveloppe) gardé en **fallback** : si une clé de son
   est absente du cache, on retombe sur le son synthétisé → le jeu ne casse jamais, même
   sans assets audio.

`Sfx.init(game.sound)` capte le Sound Manager une fois (idempotent, appelé dans le `create()`
de chaque scène). L'AudioContext étant verrouillé par le navigateur tant qu'il n'y a pas de
geste utilisateur, `playMusic` mémorise la piste désirée et la lance sur l'événement `unlocked`.

Bruitages : `Sfx.jump()`, `Sfx.doubleJump()`, `Sfx.pickup()`, `Sfx.boxBreak()`,
`Sfx.trampoline()`, `Sfx.hit()` (dégât piques), `Sfx.death()`, `Sfx.win()`.

Musique : `Sfx.playMusic('menu' | 'game')` (boucle, stoppe la précédente) et `Sfx.stopMusic()`.
Menu → **silencieux** (`stopMusic()`, pas de musique sur l'écran d'accueil) ; GameScene →
musique gameplay (continue entre niveaux) ; game over et victoire → `stopMusic()`.
Volumes par défaut : musique 0.15, bruitages 0.25 (caisse cassée boostée ×2,5).

Mute : `Sfx.toggleMute()` / `Sfx.isMuted()` agissent sur `game.sound.mute`, **persistés dans
`localStorage`** (clé `fh_muted`). UI via `setupMuteToggle(scene)` (touche M + icône cliquable).

Volumes séparés : `Sfx.setMusicVolume(v)` / `setSfxVolume(v)` (+ getters), `v ∈ [0,1]`,
**persistés** (`fh_vol_music` défaut 0.35, `fh_vol_sfx` défaut 0.70). `setMusicVolume` applique
en direct à la musique en cours ; les bruitages lisent `sfxVolume` à chaque lecture.

Réglages UI : `SettingsScene` est un **overlay** (2 curseurs `buildSlider` Musique/Effets +
toggle mute + bouton fermer). Ouvert depuis le menu (bouton ⚙) et en jeu (Échap) via le pattern
`scene.pause(caller)` + `scene.launch('SettingsScene', { returnTo, title, closeLabel })` ; la
fermeture fait `scene.resume(returnTo)` + `scene.stop()`.

## Contrôles (touches remappables)

`src/controls.js` est la **source de vérité** : 3 actions (`left`, `right`, `jump`), chacune
avec 2 emplacements `[principale, secondaire]` en keyCodes Phaser, persistés dans `localStorage`
(`fh_controls`). Défauts : Gauche `← / A`, Droite `→ / D`, Saut `Espace / W`.

- `GameScene._buildControls()` construit les objets `Key` depuis `getControls()` (`addKey` par
  binding) et les stocke dans `this.keymap`. Reconstruit au retour de pause (`'resume'`) pour
  appliquer un remapping fait pendant la partie. `Player.update(keymap)` teste `anyDown` /
  `anyJustDown` sur les touches de chaque action.
- UI de remapping dans `SettingsScene` : un bouton par (action, slot). Clic → capture la
  prochaine touche (Échap annule). Un **handler `keydown` unique** gère capture vs fermeture
  (évite tout conflit/double-traitement). Bouton « Réinitialiser les touches » → `resetControls()`.
- Pause (Échap) et Mute (M) ne sont **pas** remappables. Doublons autorisés (pas de blocage).

## High scores (centralisés serveur)

Stockage **côté serveur** (pas localStorage) : `server/` = Express + SQLite (`better-sqlite3`).
But : centraliser les scores entre joueurs au déploiement.

- API : `GET /api/scores` (Top 10), `POST /api/scores {name, score}` → `{ rank, scores }`.
  Le serveur **valide** (pseudo nettoyé 1–10 cars, score entier borné). Pas d'auth/anti-triche
  (proto — à durcir au déploiement).
- Front : `src/api/scores.js` (`fetchScores`, `submitScore`, `qualifies`). Tout est async ;
  si le serveur est hors-ligne, les écrans affichent « indisponible » sans casser le jeu.
- Fin de partie : `mountHighScores(scene, { score, x, y })` récupère le Top 10, propose la
  saisie pseudo (`buildNameEntry`) **seulement si `qualifies`**, POST, puis affiche la liste
  (`buildScoreList`) avec la nouvelle entrée en surbrillance. Utilisé par GameOver et Victory.
- Conflit clavier : sur ces écrans, `setupMuteToggle(scene, { bindKey: false })` désactive la
  touche M (sinon taper « m » dans le pseudo couperait le son) ; l'icône reste cliquable.
- Réinitialiser les scores en local : `node -e "require('better-sqlite3')('server/data/scores.db').exec('DELETE FROM scores')"`.

## UI

Tout est généré en Phaser Graphics, **pas de DOM/CSS** sauf l'index.html pour centrer le canvas. Les helpers dans `src/ui/` permettent un style cohérent :

- **Boutons biseautés** (ombre + bord sombre + face médiane + highlight) avec hover scale 1.06 + face plus claire + press scale 0.97 yoyo
- **Titre** : stroke 12px + ombre portée + pulsation 1.03×
- **Panneau stats** : variante du bouton sans interaction
- **HUD in-game** : "platformer classique" sans cadre, juste icônes + chiffres avec gros stroke noir (`★ 1230`, `♥♥♥`, `🍎 5/22`)

## Gotchas / pièges à éviter

1. **`physics.add.staticImage` ne supporte pas `.play()`**. Si tu joues une anim sur un static, utilise `physics.add.staticSprite`. (Erreur silencieuse → freeze du jeu.)

2. **Phaser anim & spritesheet chargé comme image** : si tu charges un strip horizontal avec `load.image` au lieu de `load.spritesheet`, Phaser affiche **toutes les frames côte à côte** = persos dupliqués. Toujours préciser `frameWidth/frameHeight`.

3. **Camera bounds avec view > monde** : le viewport est 750 de haut, le monde 600 → bounds Y calé à `-110` pour aligner le bas du sol au bas de l'écran et verrouiller Y.

4. **Static body et scale** : `setScale(N)` puis `refreshBody()` pour que la hitbox suive. Pour les sprites animés non-static, le body scale automatiquement.

   **Hitbox resserrée sur un body STATIQUE** : l'ordre est impératif — `setScale` → `refreshBody()` → `body.setSize(w, h, false)` → `body.setOffset(x, y)`. `refreshBody()` (via `updateFromGameObject`) **réinitialise** width/height à la frame entière, donc tout `setSize` fait AVANT est effacé. Pour un static body, `setSize`/`setOffset` sont en **pixels MONDE** (= pixels source × scale), `center=false` pour ne pas recentrer. Voir le helper `GameScene._tightBody(sprite, wSrc, hSrc, oxSrc, oySrc)`. Les tailles source proviennent des boîtes englobantes non-transparentes mesurées sur les assets (fruits dans `FRUIT_BODY`, spikes/boxes/trampoline/fire en dur). Body **dynamique** (ex. la scie) : `setSize`/`setCircle`/`setOffset` sont en pixels SOURCE (auto-scalés).

5. **Placement des objets sur le sol** : il faut vérifier qu'ils ne tombent pas dans les gaps entre les sections de plateforme. Les bornes sont commentées dans `levels.js` au-dessus de chaque section `spikes` / `trampolines`.

6. **Camera deadzone vs lerp** : `setDeadzone(80, 300)` + `startFollow(player, true, 0.2, 0.2)`. Lerp 0.2 évite le drift quand le perso s'arrête net (le 0.05 initial créait un glissement).

7. **Pixel art crisp** : `pixelArt: true` dans config Phaser + `image-rendering: pixelated` en CSS. Zoom caméra **doit rester entier** (1, 2, 3) pour éviter l'aliasing.

8. **Détection "tape par dessous"** : `playerSprite.body.touching.up === true` signifie le **haut** du body du joueur touche quelque chose (= il vient de cogner un plafond). Utilisé pour casser les boîtes.

## Ajouter un niveau 3

1. Choisir un kit terrain dans le tileset (voir cropping de chaque kit dans l'historique pour identifier les frames TL/T/TR/L/C/R)
2. Choisir un background dans `assets/background/`
3. Ajouter `LEVELS[3] = { ... }` dans `levels.js` avec `next: null`
4. Changer `LEVELS[2].next = 3` pour chaîner
5. Charger le nouveau background dans `GameScene.preload` : `this.load.image('bg_xxx', 'assets/background/Xxx.png')`

## Pièges supplémentaires (câblés)

Trois pièges déjà câblés en plus de spikes / trampolines / boxes — il suffit de
les placer dans le levelData :

- **fire** (`fires: [{ x, y, period, phase }]`) : torche posée au sol, alterne
  off ↔ on. `period` est la durée totale du cycle en ms (default 2000 = 1s off
  + 1s on). `phase` (0..1) décale le démarrage pour désynchroniser plusieurs
  feux côte à côte. Dégât uniquement quand burning. y conseillé : **544**
  (flamme posée sur top sol y=576, hauteur visible 64).

- **saw** (`saws: [{ x, y, range, speed }]`) : scie qui tourne en permanence et
  patrouille horizontalement entre `x - range` et `x + range` à `speed` px/s
  (defaults 80 / 120). Toujours dangereuse, contact = dégât. y libre selon
  l'effet voulu (au sol ~560, en hauteur sous une plateforme, en suspension).

- **falling_platform** (`fallingPlatforms: [{ x, y, delay }]`) : plateforme
  solide 64×20 visible. Au contact "par dessus", elle tremble pendant `delay`
  ms (default 500) puis tombe sous le joueur. Idéale pour forcer un saut
  rapide. y conseillé : **560** pour aligner avec le top du sol.

## Ajouter un autre piège (non câblé)

Aucun asset non câblé restant côté traps. Si tu introduis un nouveau piège
(ex: ennemi, projectile), modèle :

1. Charger asset dans `GameScene.preload`
2. Si animé : créer l'anim dans `create()`
3. Ajouter un groupe dans `create()` (`staticGroup` si immobile, `group` sinon)
4. Lire les positions depuis le levelData
5. Ajouter overlap/collider avec `this.player.sprite`
6. Handler qui appelle `this.takeDamage()` ou autre selon le piège

## Conventions de style

- Pas de TypeScript, pas de framework, pas de tests (projet jeu vite-prototypé)
- Commentaires en français (l'utilisateur travaille en français)
- Fonctions camelCase, classes PascalCase, constantes UPPER_SNAKE
- Préfixe `_` pour les méthodes privées de scène (`_loseHeart`, `_spawnFloatingText`)
- Les helpers UI dans `src/ui/` sont des fonctions pures qui retournent un GameObject ou Container

## Ce qui n'est PAS utilisé (assets dispos)

- `assets/enemies/20 Enemies.png` — pas d'ennemis (décision produit)
- `assets/main_characters/*/Hit (32x32).png` et `Wall Jump (32x32).png` — non câblés
- `assets/checkpoints/flag/*` et `start/*` — pas de checkpoints mi-niveau
- `assets/menu/buttons/*` — boutons générés en code à la place

Ces assets sont disponibles si tu veux étendre. Pour utiliser un nouveau personnage, c'est le menu de sélection qui faut étendre (`CHARS` dans `MenuScene.js`).
