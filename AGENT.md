# Fruit Rush — Guide pour assistants IA

Ce document explique l'architecture du projet pour qu'un autre agent puisse contribuer rapidement sans relire tout l'historique de développement.

## Vue d'ensemble

**Fruit Rush** est un jeu de plateforme 2D fait en **Phaser 3.80** + **Vite 5**, en JavaScript pur (ES modules, pas de TypeScript). Pixel art, 5 niveaux dessinés en cartes ASCII, pas d'ennemis (par choix produit).

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

En dev uniquement (`import.meta.env.DEV`, absent du build) : boutons **DEV 1…5** sous « Jouer » dans le
menu, et touches **1 à 5** au menu comme en jeu pour aller directement à un niveau ; `window.game` est
exposé pour la console. Une partie commencée ailleurs qu'au niveau 1 ne peut pas entrer au classement.

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
│  ├─ levels.js           Les 5 niveaux : cartes ASCII + options (temps, kit, obscurité…)
│  └─ parseLevel.js       Légende des cartes, buildLevel() → positions monde, kits du tileset, MECHANICS
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

scripts/
└─ check-levels.mjs       `npm run check-levels` : rejoue la physique du joueur et vérifie que tout est atteignable

server/                   Backend high scores (Express + SQLite, ESM)
├─ index.js               API : GET/POST /api/scores, sert dist/ en prod
└─ db.js                  better-sqlite3 : table scores, getTop/insertScore (data/ git-ignoré)

assets/                    Sprites PixelFrog (Pixel Adventure 1 pack)
├─ main_characters/        4 persos : virtual_guy, pink_man, ninja_frog, mask_dude
├─ fruits/                 8 fruits (spritesheets 17 frames) + Collected (6 frames)
├─ Terrain/                Tileset 16x16 (22 cols × 11 rows)
├─ background/             7 fonds tileables 64x64
├─ checkpoints/            end (coupe), flag (checkpoints), start (non utilisé)
├─ traps/                  spikes, trampoline, fire, saw, falling_platforms, fan, spike_head, arrow
├─ items/boxes/            Box1/2/3 (Idle, Hit, Break)
├─ enemies/                Sprite sheet 20 ennemis (NON utilisé — pas d'ennemis)
└─ menu/buttons/           Boutons pré-faits (NON utilisés — boutons générés en code)
```

## Échelles et conventions de coordonnées

C'est le piège principal du projet, comprendre ça évite 80% des bugs :

- **Rendu interne** : 1000×750 (`CONFIG.width`/`height`), upscalé par Phaser FIT au browser
- **Pas de zoom caméra** : `zoom = 1` exact, pour éviter l'aliasing fractionnaire
- **Grille monde** : 32 unités par tuile logique (constante `T = 32`, exportée par `parseLevel.js`) ; 1 caractère de carte = 1 tuile
- **Tileset terrain** : tuiles source 16×16, **rendues à `setScale(2)` = 32 unités** monde
- **Perso et fruits** : `setScale(1.75)` (32 → 56 visible)
- **Drapeau, coupe** : `setScale(1.75)` (cohérence)
- **Trampolines** : `setScale(2)` (28 → 56)
- **Pointes** : `setScale(2)` (16 → 32)
- **Boîtes** : `setScale(2)` (28×24 → 56×48)

Taille du monde = taille de la carte (`cols × 32`, `rows × 32`). Si le niveau est moins haut que la vue
(750), la caméra cale le bas du monde en bas de l'écran (ex. 20 rangées = 640 → bounds Y à -110) et ne
bouge qu'horizontalement ; sinon elle suit aussi verticalement (zone morte 80×160).

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

Chaque niveau de `LEVELS` (`src/levels/levels.js`) est un `buildLevel({ ... })` : une **carte ASCII**
(tableau de lignes de même longueur, 1 caractère = 1 tuile de 32) et quelques options. `buildLevel`
(`src/levels/parseLevel.js`) lit la carte et renvoie les positions monde attendues par `GameScene`
(`fruitPositions`, `trampolines`, `spikes`, `ceilingSpikes`, `fires`, `saws`, `fallingPlatforms`, `fans`,
`spikeHeads`, `arrows`, `checkpoints`, `playerStart`, `flag`) plus `map`, `cols`, `rows`, `width`, `height`.

Légende (détaillée en tête de `parseLevel.js`) :

| Car. | Élément | Car. | Élément |
|:-:|---|:-:|---|
| `#` | terrain plein (bords/coins auto) | `o` | fruit |
| `=` | sommet de pilier (jump-through) | `B` | caisse |
| `\|` | corps de pilier (décor) | `T` | trampoline |
| `-` | planche (jump-through) | `^` / `v` | pointes sol / plafond |
| `@` | départ | `F` / `f` | feu / feu décalé d'un demi-cycle |
| `$` | coupe | `S` + `~` / `:` | scie + sa piste horizontale / verticale |
| `C` | checkpoint | `__` | plateforme qui tombe (par paire) |
| `D` | petit bloc 2×2 dans un pilier, marchepied sur son sommet | | |
| `W` | souffleur | `H` | Spike Head |
| `A` | flèche | ` ` `.` | vide |

Les objets « posés » (`@ $ C T F W`) se placent sur la case **au-dessus** du sol. Le bas de la carte est
ouvert : un trou qui descend jusqu'en bas est mortel.

Options : `name`, `bgKey`, `bgColor`, `kit` (`green`, `pink`, `orange`, `stone`, `brick` : 9 frames du
tileset), `plank` (`wood` / `metal`), `fruitTypes`, `time` (s, défaut `CONFIG.levelTime`), `dark`
(voile noir), `boxType`, `firePeriod`, `fallDelay`, `sawSpeed`, `fanHeight`, `next` (`null` = dernier).

**Après toute modification d'une carte : `npm run check-levels`.** Le script rejoue la physique du
joueur (vitesse, saut, double saut, trampolines, souffleurs, flèches) depuis le départ et liste ce qui
est hors de portée. Repères : un saut simple monte de 4 tuiles (en pratique 3), un double saut de 8
(7 au maximum, viser 6), un saut simple franchit ~8 tuiles à plat, un double ~14.

Le serveur importe `levels.js` pour ses maxima (fruits, caisses, temps par niveau) : rien à recopier.

## Gameplay

### Player (`Player.js`)
- Spritesheets chargées par perso : `_idle`, `_run`, `_jump`, `_fall`, `_dj` (double jump)
- State machine simple : on choisit l'anim à jouer chaque frame selon vitesse et `onGround`
- **Double saut** : `MAX_JUMPS = 2`, reset au sol (`body.blocked.down` uniquement : `touching.down` est aussi levé par les overlaps — fruits, pointes… — et rendait le double saut en l'air), utilise `Phaser.Input.Keyboard.JustDown` (pas `isDown`) pour éviter le re-déclenchement avec touche maintenue
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
- **Chute** (y > hauteur du monde + 60) → `die()` → retour au dernier checkpoint (`this.respawn`, sinon le départ) + perte cœur (toujours, ignore invincibilité)
- **Piques** → `takeDamage()` → reste sur place + invincibilité

### Timer de niveau
- `time` du niveau (sinon `CONFIG.levelTime`, 60 s), dans `this.levelTime`. HUD `hudTimerText` en haut au centre (MM:SS, rouge ≤ 10 s).
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

3. **Camera bounds avec view > monde** : pour un niveau de moins de 750 de haut, bounds Y = `H - 750` (négatif) pour aligner le bas du monde au bas de l'écran et verrouiller Y.

4. **Static body et scale** : `setScale(N)` puis `refreshBody()` pour que la hitbox suive. Pour les sprites animés non-static, le body scale automatiquement.

   **Hitbox resserrée sur un body STATIQUE** : l'ordre est impératif — `setScale` → `refreshBody()` → `body.setSize(w, h, false)` → `body.setOffset(x, y)`. `refreshBody()` (via `updateFromGameObject`) **réinitialise** width/height à la frame entière, donc tout `setSize` fait AVANT est effacé. Pour un static body, `setSize`/`setOffset` sont en **pixels MONDE** (= pixels source × scale), `center=false` pour ne pas recentrer. Voir le helper `GameScene._tightBody(sprite, wSrc, hSrc, oxSrc, oySrc)`. Les tailles source proviennent des boîtes englobantes non-transparentes mesurées sur les assets (fruits dans `FRUIT_BODY`, spikes/boxes/trampoline/fire en dur). Body **dynamique** (ex. la scie) : `setSize`/`setCircle`/`setOffset` sont en pixels SOURCE (auto-scalés).

5. **La scène est réutilisée d'un niveau à l'autre** (`scene.start` relance `create()` sur la même instance) : tout champ optionnel (ex. `this.darkness`) doit être remis à zéro dans `create()`, sinon il survit au niveau précédent.

6. **Camera deadzone vs lerp** : `setDeadzone(80, 300)` + `startFollow(player, true, 0.2, 0.2)`. Lerp 0.2 évite le drift quand le perso s'arrête net (le 0.05 initial créait un glissement).

7. **Pixel art crisp** : `pixelArt: true` dans config Phaser + `image-rendering: pixelated` en CSS. Zoom caméra **doit rester entier** (1, 2, 3) pour éviter l'aliasing.

8. **Détection "tape par dessous"** : `playerSprite.body.touching.up === true` signifie le **haut** du body du joueur touche quelque chose (= il vient de cogner un plafond). Utilisé pour casser les boîtes.

## Ajouter un niveau

1. Ajouter `LEVELS[6] = buildLevel({ ... })` dans `levels.js` (carte + options) et passer le `next` du niveau 5 à 6
2. Choisir un kit (`KITS` dans `parseLevel.js`) et un fond (`assets/background/`, déjà tous préchargés)
3. `npm run check-levels 6` jusqu'à ce que tout soit atteignable, puis régler `time` (≈ 2 à 3 × le chemin le plus rapide)

## Pièges

Tous se placent dans la carte (voir la légende) ; réglages partagés dans `MECHANICS` (`parseLevel.js`) :

- **fire** (`F` / `f`) : torche posée au sol, alterne off ↔ on (`firePeriod`, défaut 2000 ms) ; dégât seulement quand elle brûle.
- **saw** (`S` sur une piste `~` ou `:`) : aller-retour entre les extrémités de la piste (`sawSpeed`), chaîne dessinée le long du trajet.
- **falling_platform** (`__`) : tremble `fallDelay` ms (défaut 500) après qu'on s'y pose, puis tombe.
- **fan** (`W`) : courant d'air de la case au-dessus jusqu'au premier plafond (`fanHeight` tuiles max, défaut 9) ; pousse vers le haut (`fanLift`) jusqu'à `fanMaxRise` px/s, d'où un vol stationnaire en haut du courant (`_applyFans`).
- **spike head** (`H`) : attend, clignote quand le joueur passe dessous, s'abat jusqu'au premier sol, reste 0,8 s, remonte (`_updateSpikeHeads`). Contact = dégât.
- **arrow** (`A`) : bulle qui relance vers le haut (`arrowBoost`) et rend les deux sauts ; réapparaît après `arrowRespawn` ms (`hitArrow`).
- **checkpoint** (`C`) : le drapeau se lève au passage et devient le point de réapparition après une chute (`_reachCheckpoint`).
- **obscurité** (option `dark`) : RenderTexture noir plein écran, troué chaque frame par des halos (joueur, fruits, feux, scies, checkpoints, coupe) dans `_updateDarkness`.

Pour un nouveau piège : charger l'asset (`preload`), créer l'anim, lire ses positions depuis la carte
(nouveau caractère dans `parseLevel.js` + `check-levels.mjs` s'il change les déplacements), ajouter le
groupe et l'overlap/collider dans `create()`.

## Conventions de style

- Pas de TypeScript, pas de framework, pas de tests (projet jeu vite-prototypé)
- Commentaires en français (l'utilisateur travaille en français)
- Fonctions camelCase, classes PascalCase, constantes UPPER_SNAKE
- Préfixe `_` pour les méthodes privées de scène (`_loseHeart`, `_spawnFloatingText`)
- Les helpers UI dans `src/ui/` sont des fonctions pures qui retournent un GameObject ou Container

## Ce qui n'est PAS utilisé (assets dispos)

- `assets/enemies/20 Enemies.png` — pas d'ennemis (décision produit)
- `assets/main_characters/*/Hit (32x32).png` et `Wall Jump (32x32).png` — non câblés
- `assets/checkpoints/start/*` — le départ n'a pas de décor
- `assets/menu/buttons/*` — boutons générés en code à la place

Ces assets sont disponibles si tu veux étendre. Pour utiliser un nouveau personnage, c'est le menu de sélection qui faut étendre (`CHARS` dans `MenuScene.js`).
