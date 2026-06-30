# Spec — Refonte Niveau 1 (Plaine verte)

## Intent (1 phrase)
Offrir un tuto implicite serein qui présente UNE mécanique à la fois (saut, double saut, trampoline, spike, box, fire, falling_platform), construit doucement la confiance, et récompense la curiosité avec une route haute optionnelle et un secret.

## Thème & assets
- bgKey : `bg_blue` (déjà chargé)
- bgColor : `#87CEEB`
- Tileset : kit "herbe verte + terre" — frames TL=6, T=7, TR=8, ML=28, MC=29, MR=30
- worldWidth : 4800
- Mécaniques utilisées : trampolines, spikes, boxes (box1), fires, fallingPlatforms
- Mécaniques NON utilisées au niv 1 : saws (réservées au niv 2 pour préserver la surprise)

## ASCII map (vue de côté, échelle 1 char ≈ 64 px monde)
```
Légende : =sol  -plateforme  T=trampoline  S=spike  B=box  F=fire  X=fallingPlat  *=fruit  [F]=flag  ~ =gap

ty=4                                                                                            ----------         (route haute finale)
ty=6                                                              *  *                                  *  *
ty=8                                            ------         --------                                 *  [F]?
ty=10                            -----   ----                                            --------
ty=11   *   *                  *                                                         secret au-dessus
ty=12          -----      ---                                                  --------                      ----- (route haute)
ty=14          *                                       ------                                                       (saw none ici)
ty=15      ---                                ---                                                  --
ty=18  P=========== ~~~ ==================== ~~~ ============== ~~~ ================================  =========
       0       640 700  900            2080 2150         3200  3260                             4480 4520     4800
        section A           section B            section C                   section D                section E
                    T(800)              S S(1700)        F(2350)        X(2900)         T(3700)
                                          ↑safe under   ↑fire @2350   ↑falling          ↑rebond final
                                                                       platform
```

Notes :
- 5 sections de sol séparées par 4 gaps. Tous les gaps sont franchissables en saut simple ou avec aide claire (trampoline, plateforme tremplin).
- Les pièges fire et falling_platform apparaissent dans la moitié dev/climax après tuto saut/double saut/trampoline/spike/box.

## Rythme — bornes en x monde
- **Intro** : 0 — 1100 (sol large + 1 trampoline 800 + plateformes basses ty=15..12 pour tester saut simple puis double saut)
- **Développement** : 1100 — 2700 (1ère gap notable, spikes au sol à éviter, 1ère box accessible en saut simple, introduction du fire en isolation)
- **Climax** : 2700 — 4000 (combinaison falling_platform + plateformes flottantes au-dessus d'un gap large, trampoline de relance, fruits en altitude)
- **Respiration → flag** : 4000 — 4800 (sol plat continu, route haute optionnelle accessible via plateformes-tremplin, drapeau facile, secret au-dessus à ty=4)

Justification : la difficulté monte par strate. Chaque nouvelle mécanique est **isolée** (fire seul puis falling_platform seul), puis combinée timidement (climax = falling_platform + saut). On termine sur une note positive sans piège.

## Layout complet (objet LEVELS proposé)

```js
LEVELS[1] = {
  name: 'Niveau 1 — Plaine verte',
  bgKey: 'bg_blue',
  bgColor: '#87CEEB',
  tiles: {
    topLeft: 6,  top: 7,   topRight: 8,
    midLeft: 28, midMid: 29, midRight: 30,
  },
  worldWidth: 4800,
  playerStart: { x: 80, y: 480 },
  flag: { x: 4680, y: 520 },

  // Sections sol niveau 1 :
  //   A : 0    – 640    (tx 0..19 sur 2 sous-dalles fusionnées)
  //   B : 700  – 2080   (tx 22..64)
  //   C : 2150 – 3200   (tx 67..99)
  //   D : 3260 – 4480   (tx 102..139)
  //   E : 4520 – 4800   (tx 141..149)
  // Gaps : 640-700 (60px = 2 tuiles, saut simple), 2080-2150 (70px ≈ 2 tuiles),
  //        3200-3260 (60px), 4480-4520 (40px).
  // Tous les gaps sont étroits (≤ 2 tuiles) pour rester en saut simple « confort ».
  layout: [
    // --- Sections de sol (ty=18..19) ---
    [0,   18, 20, 2],     // section A : 0–640
    [22,  18, 43, 2],     // section B : 704–2080
    [67,  18, 33, 2],     // section C : 2144–3200
    [102, 18, 38, 2],     // section D : 3264–4480
    [141, 18, 9,  2],     // section E : 4512–4800 (sous le flag)

    // --- Plateformes basses (intro : tuto saut simple, ty=15 = 3 tuiles au-dessus du sol) ---
    [7,   15, 3, 1],      // x≈224..320, fruit visible au-dessus
    [13,  15, 3, 1],      // x≈416..512, double-relais facile
    [17,  12, 3, 1],      // x≈544..640, plus haut, invite à tester double saut

    // --- Plateformes développement (section B, ty=14..12) ---
    [30,  14, 4, 1],      // x=960..1088, après trampoline
    [38,  12, 4, 1],      // x=1216..1344
    [48,  14, 4, 1],      // x=1536..1664
    [57,  12, 4, 1],      // x=1824..1952

    // --- Plateformes climax (section C, autour du fire et du falling) ---
    [73,  10, 4, 1],      // x=2336..2464, route haute au-dessus du fire (skip safe)
    [82,  8,  4, 1],      // x=2624..2752, fruit premium
    [92,  10, 4, 1],      // x=2944..3072, atterrissage après falling

    // --- Plateformes respiration / route haute finale (section D-E) ---
    [108, 12, 4, 1],      // x=3456..3584
    [116, 10, 4, 1],      // x=3712..3840 (au-dessus du box)
    [125, 8,  4, 1],      // x=4000..4128 (route haute)
    [132, 6,  5, 1],      // x=4224..4384 (route haute + fruits premium)

    // --- Plateforme secret (au-dessus, ty=4 = 6 tuiles au-dessus du sol),
    //     accessible uniquement via le trampoline final 3700 + double saut ---
    [138, 4,  4, 1],      // x=4416..4544, secret = 3 fruits cachés
  ],

  // Fruits structurés par phase de rythme. Total = 22 (cohérent niveaux existants).
  fruitPositions: [
    // --- Intro (0 – 1100) : 5 fruits sur trajectoires guidées ---
    [260, 432],   // au-dessus de la 1re plateforme basse
    [460, 432],   // 2e plateforme
    [580, 336],   // 3e plateforme (plus haut, invite double saut)
    [780, 380],   // breadcrumb après le trampoline 800
    [950, 380],   // début section B

    // --- Développement (1100 – 2700) : 7 fruits ---
    [1100, 480],  // sol
    [1280, 304],  // au-dessus de plateforme 1216
    [1480, 480],  // sol, à proximité spike pour signaler
    [1888, 304],  // route haute plateforme 1824
    [2050, 380],  // box au-dessus (signal visuel)
    [2240, 480],  // sol, juste avant le fire
    [2480, 460],  // au sol, après le fire (récompense passage timing)

    // --- Climax (2700 – 4000) : 6 fruits, route haute exclusive ---
    [2700, 240],  // au-dessus plateforme 2624 (route haute = premium)
    [2900, 240],  // suite route haute (secrets visibles)
    [3000, 380],  // récompense après falling_platform
    [3380, 460],  // section D, retour sol
    [3550, 336],  // plateforme 3456
    [3780, 304],  // au-dessus de la box d (signal)

    // --- Respiration / flag (4000 – 4800) : 4 fruits dont route haute ---
    [4080, 240],  // route haute
    [4280, 144],  // route haute premium
    [4500, 432],  // route safe au sol
    // Secret (au-dessus ty=4 = y≈80) : 1 fruit seul caché
    [4500, 80],
  ],

  // Trampolines : (x, y=548). Sections valides : A(0-640), B(704-2080), C(2144-3200), D(3264-4480), E(4512-4800).
  //   600  → section A, propulse vers plateforme [17,12] et facilite le franchissement gap A-B
  //   3700 → section D, relance de fin pour atteindre route haute + secret [138, 4]
  trampolines: [
    { x: 600,  y: 548 },
    { x: 3700, y: 548 },
  ],

  // Spikes : sol section B uniquement (introduction "calme" du danger statique).
  spikes: [
    { x: 1700, y: 560 }, { x: 1732, y: 560 }, { x: 1764, y: 560 },  // section B, triplet aligné, esquivable par saut ou par plateforme [57,12]
  ],

  // Boxes : 2 boxes en l'air (centre y 380..460), accessibles en saut simple.
  boxes: [
    { x: 2050, y: 420, type: 'box1' },   // section B, fin de dev, taper par dessous
    { x: 3780, y: 380, type: 'box1' },   // section D, sous plateforme [116,10] (combo box + plateforme)
  ],

  // Fires : 1 fire en isolation, posé sur sol section C à x=2350.
  //   period 2200 ms (1.1s off / 1.1s on), phase 0 → off à l'arrivée si timing standard.
  //   y=544 pour poser la base au sol. Route haute via plateformes [73,10] et [82,8] permet de SKIP.
  fires: [
    { x: 2350, y: 544, period: 2200, phase: 0 },
  ],

  // FallingPlatforms : 1 fallingPlatform en isolation, en plein milieu du gap C-D (3200-3260).
  //   Solide au contact, tombe après 500 ms. Force le joueur à enchaîner un saut.
  //   y=560 pour aligner au top sol. Position x=3220 = centre du gap.
  fallingPlatforms: [
    { x: 3220, y: 560, delay: 500 },
  ],

  next: 2,
};
```

## Diff vs version précédente

### Ajouté
- **5 sections de sol** au lieu de 3 (gaps plus nombreux mais moins larges → tuto progressif des sauts)
- **Fire** (x=2350, period 2200) introduit en isolation au milieu du dev/climax
- **FallingPlatform** (x=3220) sert de pont temporaire pour franchir le gap C-D
- **Plateforme secrète** [138, 4, 4, 1] au-dessus de la fin, accessible via trampoline 3700 + double saut
- **Route haute** continue (plateformes ty=10..6) sur la 2e moitié du niveau
- **Fruit secret** unique à y=80 (au-dessus du sol)

### Retiré
- Les 3 plateformes "escalier" du début (16,14 ; 22,12 ; 29,10) trop linéaires
- L'escalier double 66/79/97 (rythme plat sans intention)
- Le 2e trampoline (3300) qui faisait doublon avec le 1er
- Le 2e doublet de spikes (3700) qui répétait le pattern niv 1 sans nouveau challenge

### Déplacé
- Spike unique remplacé par triplet groupé sur section B uniquement, pour grouper le risque et libérer section C/D pour les nouveaux pièges
- Box1 #2 déplacée sous la plateforme [116,10] pour créer un combo "casser la box pour révéler un fruit / passage"

### Justification
- Avant : niveau plat avec mécaniques saupoudrées sans intention de tuto. Maintenant : chaque sous-section a UN but pédagogique clair.
- Le falling_platform comble un gap volontaire → on l'apprend en faisant.
- La route haute donne ~25% des fruits exclusivement → incitation au risk/reward.

## Risk / reward & secrets

- **Route safe** : longer le sol, sauter le trampoline 600 pour passer le 1er gap, esquiver le spike au sol (1700-1764) en allant tout droit (largeur 96 px = 1 saut simple), passer le fire 2350 au sol pendant la phase off, traverser le falling_platform 3220 rapidement, finir au sol jusqu'au drapeau. Rapporte ~16/22 fruits.
- **Route haute** : passer par les plateformes [73,10] → [82,8] pour skip totalement le fire (fruits premium 2700/2900 exclusifs), puis revenir sur [108,12] → [116,10] → [125,8] → [132,6] (4 fruits premium). Demande double saut maîtrisé. Rapporte ~5 fruits supplémentaires.
- **Secret** : 1 fruit seul à (4500, 80), sur plateforme [138, 4, 4, 1]. Accessible uniquement en se servant du trampoline 3700 puis enchaînement double saut + plateforme [132,6] tremplin. Si raté → on retombe sur sol respiration sans dégât.

## Playtesting checklist

- [ ] Tous les objets reposent sur un sol existant (pas dans un gap) — vérifié : trampolines (600, 3700) sur A et D ; spikes 1700-1764 sur B ; fire 2350 sur C ; box 2050 et 3780 en l'air au-dessus de B et D ; falling 3220 dans le gap C-D (c'est SON RÔLE)
- [ ] Aucun saut > 10 tuiles — gaps max = 70 px (~2 tuiles)
- [ ] Aucune plateforme > 6 tuiles au-dessus du sol sans trampoline en amont — la plateforme secrète ty=4 (= 14 tuiles au-dessus mais utilisée depuis [132,6] qui est à 12 tuiles, donc Δ=2 tuiles seulement)
- [ ] Mécanique fire introduite en safe avant d'être combinée — oui, isolée en section C avec route haute de skip
- [ ] Mécanique falling_platform introduite en safe — oui, isolée en gap C-D sans piège associé
- [ ] Drapeau accessible sans dégât obligatoire — oui, route safe ne croise aucun piège forcé
- [ ] Total fruits = 22 (cohérent avec niveaux existants ; cible 18-24)
- [ ] Variation x/y des fruits (pas alignés sur une horizontale)

## Risques / dépendances

- Aucune dépendance moteur : `bg_blue` est déjà chargé, fires/saws/fallingPlatforms sont déjà câblés en `GameScene.create()`.
- ⚠ La plateforme [141,18,9,2] (section E) commence à tx=141 → x=4512. Le flag est à x=4680, donc bien posé dessus. Vérifier visuellement qu'il n'y a pas de chevauchement avec la plateforme secret [138,4,4,1] (tx 138-141, ty 4-4, à 14 tuiles au-dessus → aucun chevauchement physique).
- Si en playtest le fire à period 2200 paraît trop punitif, augmenter à 2600. Si trop facile, descendre à 1800.
