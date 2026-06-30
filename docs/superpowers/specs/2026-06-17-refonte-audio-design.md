# Refonte audio FruitHeroes — Design

**Date** : 2026-06-17
**Statut** : validé, prêt pour plan d'implémentation

## Objectif

Remplacer le son entièrement synthétisé (Web Audio « 8-bit ») par une expérience
audio plus complète :

1. Des **bruitages plus fidèles** issus de vrais fichiers audio.
2. Une **musique de fond** en boucle (menu + gameplay).
3. Un **contrôle mute** simple pour le joueur (touche M + icône).

Le moteur synthé actuel est **conservé comme fallback** : si un fichier audio
manque ou ne charge pas, le jeu retombe sur le son synthétisé et ne casse jamais.

## État actuel (avant)

- `src/audio/Sfx.js` : singleton Web Audio (OscillatorNode + enveloppe de gain),
  aucun fichier audio. Init paresseuse au premier appel.
- Sons existants : `jump`, `doubleJump`, `pickup`, `death`, `win`.
- Appels actuels :
  - `Player.js` : `Sfx.jump()`, `Sfx.doubleJump()`
  - `GameScene.js` : `Sfx.jump()`, `Sfx.pickup()` (×2), `Sfx.death()` (×2), `Sfx.win()`
- **Aucun son** pour : casser une boîte (`hitBox`), trampoline (`hitTrampoline`),
  prendre un dégât de piques (`takeDamage`).
- **Aucune musique** de fond.
- Première scène lancée : `MenuScene` (ordre dans `main.js`).

## Sources audio (toutes CC0 — domaine public, zéro attribution obligatoire)

Téléchargements **vérifiés accessibles** (HTTP 200) le 2026-06-17.

### Bruitages — packs Kenney (https://kenney.nl, CC0)

| Pack | Slug | Usage |
|------|------|-------|
| Digital Audio | `digital-audio` | saut, double-saut, pickup |
| Impact Sounds | `impact-sounds` | boîte cassée, dégât/piques |
| Music Jingles | `music-jingles` | jingle de victoire (8-bit NES) |

URLs zip (le hash de chemin peut changer dans le temps ; re-scraper la page
`https://kenney.nl/assets/<slug>` si un lien casse) :
- `https://kenney.nl/media/pages/assets/digital-audio/216eac4753-1677590265/kenney_digital-audio.zip`
- `https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip`
- `https://kenney.nl/media/pages/assets/music-jingles/f37e530b9e-1677590399/kenney_music-jingles.zip`

### Musique — « 5 Chiptunes (Action) » de Juhani Junkala (OpenGameArt, CC0)

Page : `https://opengameart.org/content/5-chiptunes-action`

| Fichier source | Usage |
|----------------|-------|
| `title screen.mp3` | musique du menu (boucle) |
| `level1.mp3` | musique du gameplay (boucle) |

URLs fichiers pleins (pas les `audio_preview/`) :
- `https://opengameart.org/sites/default/files/title%20screen.mp3`
- `https://opengameart.org/sites/default/files/level1.mp3`

## Organisation des fichiers (cible)

```
assets/audio/
├─ sfx/
│  ├─ jump.ogg
│  ├─ double_jump.ogg
│  ├─ pickup.ogg
│  ├─ box_break.ogg
│  ├─ trampoline.ogg
│  ├─ hit.ogg
│  ├─ death.ogg
│  └─ win.ogg
├─ music/
│  ├─ music_menu.mp3
│  └─ music_game.mp3
└─ CREDITS.md      # source + licence (CC0) de chaque fichier
```

Procédure : télécharger les zips/mp3 dans un dossier temporaire, sélectionner le
bon fichier de chaque pack, le copier/renommer vers `assets/audio/...`, supprimer
le temporaire. Les `.ogg` Kenney sont conservés tels quels (Phaser les décode).
Le choix exact du fichier dans chaque pack (parmi plusieurs candidats) est fait à
l'implémentation par écoute/nom, avec ce mapping indicatif :

- `jump.ogg` ← un son court montant type « jump » de `digital-audio`
- `double_jump.ogg` ← variante plus aiguë / power-up de `digital-audio`
- `pickup.ogg` ← son « coin/pickup » de `digital-audio`
- `box_break.ogg` ← impact bois/caisse de `impact-sounds`
- `hit.ogg` ← impact sec / « hurt » de `impact-sounds`
- `death.ogg` ← son descendant / négatif (digital-audio ou impact-sounds)
- `win.ogg` ← un jingle court positif de `music-jingles`

## Architecture

Principe : **changement minimal des sites d'appel existants**. On garde le nom
public `Sfx` et on l'adosse au Sound Manager global de Phaser, avec le synthé en
fallback.

### `src/audio/Sfx.js` (enrichi)

Reste un singleton, mais gagne :

- `Sfx.init(soundManager)` : appelée **une fois** avec `game.sound` (le Sound
  Manager Phaser, instance unique partagée par toutes les scènes). Capture la
  référence pour jouer les fichiers chargés dans le cache.
- Méthodes de bruitage existantes (`jump`, `doubleJump`, `pickup`, `death`,
  `win`) **gardent leur signature**. Comportement : si la clé de son
  correspondante existe dans le cache Phaser → joue le fichier ; sinon → appelle
  l'ancienne logique synthé (fallback).
- Nouvelles méthodes de bruitage : `Sfx.boxBreak()`, `Sfx.trampoline()`,
  `Sfx.hit()` (même logique fichier-sinon-synthé ; le fallback synthé de ces
  trois nouveaux sons est une variante simple des `tone()` existants).
- Musique : `Sfx.playMusic('menu' | 'game')` (joue en boucle, **stoppe d'abord
  la musique en cours** via une référence interne `currentMusic`) et
  `Sfx.stopMusic()`.
- Mute : `Sfx.toggleMute()` / `Sfx.isMuted()` agissant sur `soundManager.mute`,
  **persistance dans `localStorage`** (clé `fh_muted`). À l'init, l'état mute est
  relu depuis `localStorage` et appliqué.
- Volumes : musique jouée à `volume ~0.35`, bruitages à `volume ~0.7`. Le synthé
  fallback garde son master gain existant.

Le moteur synthé actuel (`getCtx`, `tone`, et les corps des sons) est conservé
intégralement comme implémentation de fallback.

### Chargement des assets

Helper `loadAudio(scene)` (nouveau fichier `src/audio/loadAudio.js`) qui fait les
`scene.load.audio(...)` de toutes les clés (`jump`, `double_jump`, `pickup`,
`box_break`, `trampoline`, `hit`, `death`, `win`, `music_menu`, `music_game`).

Appelé dans les `preload()` de **MenuScene** et **GameScene**. Le cache Phaser
étant global, les clés déjà chargées ne sont pas re-téléchargées : appeler le
helper dans les deux scènes garantit que l'audio est dispo même si GameScene est
relancée seule, sans coût de double chargement.

`Sfx.init(this.sound)` est appelé dans le `create()` de MenuScene (première scène)
— et défensivement aussi dans GameScene `create()` (l'init est idempotente).

### Flow musique

- `MenuScene.create()` → `Sfx.playMusic('menu')`.
- Clic « Jouer » (passage à GameScene) → `Sfx.playMusic('game')`.
- `GameScene` mort/game over → `Sfx.stopMusic()` + `Sfx.death()`.
- `VictoryScene` → `Sfx.stopMusic()` + `Sfx.win()`.
- Retour au menu depuis GameOver/Victory → `Sfx.playMusic('menu')`.

`playMusic` stoppe systématiquement la piste précédente avant d'en lancer une
nouvelle, donc les transitions de scène ne superposent jamais deux musiques.

### Contrôle mute (touche M)

Helper `setupMuteToggle(scene)` (nouveau fichier `src/ui/setupMuteToggle.js`) :

- Bind la touche **M** (`scene.input.keyboard.on('keydown-M', ...)`) → appelle
  `Sfx.toggleMute()` et met à jour l'icône.
- Affiche une petite icône texte **🔊 / 🔇** en haut à droite de la scène, rendue
  au-dessus du HUD (`setScrollFactor(0)`, `setDepth` élevé), **cliquable** aussi
  (`setInteractive`).
- L'icône reflète l'état lu via `Sfx.isMuted()` (cohérent entre scènes grâce à
  `localStorage`).

Appelé dans le `create()` de chaque scène (MenuScene, GameScene, GameOverScene,
VictoryScene).

## Sites d'appel modifiés (récapitulatif)

| Fichier | Changement |
|---------|-----------|
| `src/audio/Sfx.js` | enrichi (init, fichiers+fallback, musique, mute) |
| `src/audio/loadAudio.js` | **nouveau** helper de chargement |
| `src/ui/setupMuteToggle.js` | **nouveau** helper UI mute |
| `src/scenes/MenuScene.js` | `loadAudio` en preload ; `Sfx.init` + `playMusic('menu')` + `setupMuteToggle` en create ; `playMusic('game')` au clic Jouer |
| `src/scenes/GameScene.js` | `loadAudio` en preload ; `setupMuteToggle` en create ; ajout `Sfx.boxBreak()`/`Sfx.trampoline()`/`Sfx.hit()` ; `stopMusic()` sur game over |
| `src/scenes/GameOverScene.js` | `setupMuteToggle` ; `playMusic('menu')` si retour menu |
| `src/scenes/VictoryScene.js` | `setupMuteToggle` ; `stopMusic()` + `win()` ; `playMusic('menu')` si retour menu |
| `assets/audio/**` | **nouveaux** fichiers + `CREDITS.md` |

## Hors périmètre (YAGNI)

- Pas de sliders de volume séparés musique/effets.
- Pas de musique différente par niveau (1 seule boucle gameplay).
- Pas de nouvelle scène de preload dédiée.
- Pas de fondu enchaîné (crossfade) entre musiques — coupe nette suffisante.

## Critères de succès

1. Au lancement, la musique du menu joue en boucle.
2. En jeu, la musique gameplay joue en boucle ; saut, double-saut, pickup,
   boîte cassée, trampoline, dégât piques, mort déclenchent chacun un bruitage
   audible et distinct.
3. La victoire stoppe la musique et joue un jingle.
4. La touche M (et l'icône) coupent/réactivent tout le son ; l'état persiste
   entre scènes et après reload.
5. Si on supprime un fichier audio, le jeu continue de tourner (fallback synthé)
   sans erreur console bloquante.
6. La musique ne couvre pas les bruitages (équilibre des volumes).
