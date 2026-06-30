# Spec — Niveau 4 (Forteresse maudite)

## Intent (1 phrase)
**Climax du jeu** : la forteresse condense tout ce que le joueur a appris en empilements méchants — saws aériennes + fires au sol + fallings au-dessus de spikes — sur des plateformes étroites de 3 tuiles, dans un parcours où chaque section de sol est elle-même une menace, mais où **la fin est apaisée** pour ne pas terminer sur la frustration.

## Thème & assets
- bgKey : `bg_brown` (déjà chargé dans GameScene.preload)
- bgColor : `#2a1e16` (fallback marron-noir donjon)
- Tileset : kit **"brique rouge-marron + corps brique"** — frames TL=11, T=12, TR=13, ML=33, MC=34, MR=35
  - Justif visuelle : cols 11-13 / rows 0-1 du tileset montrent un toit de briques avec un liseré "tuiles" et un corps de brique rouge-orange dessous → cohérent thème donjon/forteresse, contraste fort avec `bg_brown`.
  - **Candidat alternatif si playtest visuel décevant** : kit "brique pierre grise (donjon froid)" cols 11-13 / rows 3-4 → TL=77, T=78, TR=79, ML=99, MC=100, MR=101. Tradeoff : plus "donjon humide médiéval", moins chaleureux que la brique rouge, mais peut mieux contraster avec `bg_brown` qui est déjà chaud. **Le user choisira** — par défaut je pars sur le candidat brique rouge (TL=11).
- worldWidth : **5280** (66 segments de 80, niveau légèrement plus long que niv 3, < 5400)
- Mécaniques utilisées : trampolines, spikes, boxes (box2), fires, saws, fallingPlatforms

## ASCII map (vue de côté, échelle 1 char ≈ 64 px monde)

```
Légende : =sol  -plateforme  T=tramp  S=spike  B=box  F=fire  W=saw  X=fallingPlat  *=fruit  [F]=flag  ~ =gap

ty=3                                                                                                                            ---    (secret pénible)
ty=5                                                                  ---             ---                                                  (route haute climax)
ty=6                                                                          ---                       ---                                       *  [F]?
ty=7                            ----              ----                                          ----              ----                                      (route flag haute)
ty=8                  ----                                  ---       ---             ---                       
ty=9                                  *  *  W       W                          ---                                       ---     ----   *
ty=10                                              (saw)  (saw)
ty=11        ---                  ----                                                                                   
ty=12  ---                                                                                                          ----
ty=14                                          S S S        S S         S S S                          S S S
ty=18  P==== ~~~ ============= ~~~ ============ ~~~ =========== ~~~~~~~ ==== ~~~~~~~~ ========= ~~~~~~~ ======= ~~~~~~~~~~ ===== ~~~~~~~ ==========
       0   320 416         1120 1248        1920 2048      2624 2848  3072 3296    3776 3936    4480  4672  4928 5024
        A                B                  C            D          E           F          G       H        I (flag)

                  T(288)        W(saw vit. 1320)             F(2160)  F(2240)        F(3712)  F(3792)         T(4768)
                                                              X(2720,2816 sus.) au-dessus de SPIKES
                                                                       saw cli. 3104                  saw cli. 4192
                                                                                  X(3344 relais)             X(4384,4480 chaînés au-dessus spikes)

Sections de sol :
 A : 0    – 320    (tx 0..9,   w=10)
 B : 416  – 1120   (tx 13..34, w=22)
 C : 1248 – 1920   (tx 39..59, w=21)
 D : 2048 – 2624   (tx 64..81, w=18)        ← 1ère vague climax (fires + spikes)
 E : 2848 – 3072   (tx 89..95, w=7)         ← plateforme étroite intermédiaire
 F : 3296 – 3776   (tx 103..117, w=15)      ← 2e vague climax
 G : 3936 – 4480   (tx 123..139, w=17)      ← 3e vague climax
 H : 4672 – 4928   (tx 146..153, w=8)       ← respiration courte
 I : 5024 – 5280   (tx 157..164, w=8)       ← socle du flag

Gaps (tous adoucis par soit relais soit alternative) :
 A-B : 320 – 416  = 96 px  = 3 tuiles  ✓ intro confort
 B-C : 1120 – 1248 = 128 px = 4 tuiles
 C-D : 1920 – 2048 = 128 px = 4 tuiles
 D-E : 2624 – 2848 = 224 px = 7 tuiles  (CLIMAX — falling 2720 + 2816 au-dessus spikes)
 E-F : 3072 – 3296 = 224 px = 7 tuiles  (CLIMAX — falling 3184 au-dessus vide + saw)
 F-G : 3776 – 3936 = 160 px = 5 tuiles  (5 tuiles = double saut serré + saw au-dessus)
 G-H : 4480 – 4672 = 192 px = 6 tuiles  (CLIMAX bis — falling 4576 + saw)
 H-I : 4928 – 5024 = 96 px  = 3 tuiles  ✓ respiration finale courte
```

Notes :
- 8 sections de sol, 9 gaps. Section E très étroite (7 tuiles = 224 px) = "îlot" entre deux climax.
- Sections D, F, G chacune portent **un combo de pièges** : spikes au sol + fire ou saw au-dessus.
- 2 saws climax (3104 et 4192) en hauteur + 1 saw vitrine 1320 + 1 saw écho 2912.
- 5 fallingPlatforms réparties : 2 au-dessus de spikes (au-dessus du gap D-E), 1 relais (E-F), 2 chaînées (G-H).

## Rythme — bornes en x monde

- **Intro** : 0 — 1120 (sections A + B, 1 trampoline 288, escalier doux, **saw vitrine 1320 visible en hauteur** au lointain)
- **Développement** : 1120 — 2048 (section C, premier triplet de spikes au sol, box premium signalée)
- **Climax** : 2048 — 4672 (52% du niveau — le pic est très long et brutal, 3 vagues de pièges combinés sur D / F / G)
- **Respiration → flag** : 4672 — 5280 (sections H + I, trampoline 4768 vers route haute + secret, drapeau au sol)

Justification : niv 4 est le dernier niveau du jeu. Le climax dure 2624 px (vs 2400 au niv 3) pour creuser le sentiment de "siège". Mais **la respiration finale est plus généreuse qu'au niv 3** (12% vs 12.5%, et avec un trampoline rebond final qui valorise l'effort) : on veut que le joueur termine le jeu avec un sentiment d'accomplissement, pas de soulagement amer.

## Layout complet (objet LEVELS proposé)

```js
LEVELS[4] = {
  name: 'Niveau 4 — Forteresse maudite',
  bgKey: 'bg_brown',
  bgColor: '#2a1e16',
  tiles: {
    // Kit "brique rouge-marron" : row 0 (top tuiles) + row 1 (corps brique rouge).
    // Candidat alt : 77/78/79 + 99/100/101 (brique pierre grise donjon froid).
    topLeft: 11, top:   12, topRight: 13,
    midLeft: 33, midMid: 34, midRight: 35,
  },
  worldWidth: 5280,
  playerStart: { x: 80, y: 480 },
  flag: { x: 5200, y: 520 },

  // Sections sol niveau 4 (climax 52% du niveau, 3 vagues de pièges combinés D/F/G) :
  //   A : 0    – 320    (tx 0..9,   w=10)
  //   B : 416  – 1120   (tx 13..34, w=22)
  //   C : 1248 – 1920   (tx 39..59, w=21)
  //   D : 2048 – 2624   (tx 64..81, w=18)    ← vague 1 : 2 fires + 1 spikes triplet
  //   E : 2848 – 3072   (tx 89..95, w=7)     ← îlot étroit entre 2 vagues
  //   F : 3296 – 3776   (tx 103..117, w=15)  ← vague 2 : 2 fires + saw + spikes
  //   G : 3936 – 4480   (tx 123..139, w=17)  ← vague 3 : saw climax + spikes triplet
  //   H : 4672 – 4928   (tx 146..153, w=8)
  //   I : 5024 – 5280   (tx 157..164, w=8, sous le flag)
  // Gaps :
  //   A-B : 320 – 416  = 96 px  = 3 tuiles  (saut simple confort, intro)
  //   B-C : 1120 – 1248 = 128 px = 4 tuiles (saut simple)
  //   C-D : 1920 – 2048 = 128 px = 4 tuiles (saut simple, entrée climax)
  //   D-E : 2624 – 2848 = 224 px = 7 tuiles (CLIMAX — fallings 2720 + 2816 AU-DESSUS de spikes au sol-bas)
  //   E-F : 3072 – 3296 = 224 px = 7 tuiles (CLIMAX — falling 3184 dans le vide + saw)
  //   F-G : 3776 – 3936 = 160 px = 5 tuiles (double saut serré, saw au-dessus)
  //   G-H : 4480 – 4672 = 192 px = 6 tuiles (CLIMAX bis — fallings 4576 chaîné + saw vraie de gauche à droite)
  //   H-I : 4928 – 5024 = 96 px  = 3 tuiles (respiration finale)
  layout: [
    // --- Sections de sol (ty=18..19) ---
    [0,   18, 10, 2],     // A : 0–320
    [13,  18, 22, 2],     // B : 416–1120
    [39,  18, 21, 2],     // C : 1248–1920
    [64,  18, 18, 2],     // D : 2048–2624
    [89,  18, 7,  2],     // E : 2848–3072 (étroite)
    [103, 18, 15, 2],     // F : 3296–3776
    [123, 18, 17, 2],     // G : 3936–4480
    [146, 18, 8,  2],     // H : 4672–4928
    [157, 18, 8,  2],     // I : 5024–5280 (sous le flag)

    // --- Plateformes intro (section A, escalier serré ty=12..11) ---
    [2,   12, 3, 1],      // x=64..160, fruit visible
    [6,   11, 3, 1],      // x=192..288, relais

    // --- Plateforme route haute après gap A-B (cible du trampoline 288, offset 4 tuiles) ---
    //     Tramp x=288 → cône x ∈ 272..304. Cible à x=448 → offset 144 px = 4.5 tuiles > 2 tuiles, OK.
    [14,  8,  3, 1],      // x=448..544, route haute B

    // --- Plateformes dev (section B, ty=11..8, plateformes étroites 3 tuiles) ---
    [19,  11, 3, 1],      // x=608..704
    [24,  9,  3, 1],      // x=768..864, fruit au-dessus
    [29,  9,  3, 1],      // x=928..1024, deuxième plateforme à ty=9 (signal saw vitrine)
    [33,  7,  3, 1],      // x=1056..1152, montée route haute fin B

    // --- Plateformes dev section C (ty=11..7, transition + montée vers climax) ---
    [40,  9,  3, 1],      // x=1280..1376
    [46,  7,  3, 1],      // x=1472..1568, route haute C (skip spikes)
    [52,  9,  3, 1],      // x=1664..1760
    [56,  11, 3, 1],      // x=1792..1888, sortie C avant gap

    // --- Plateformes climax vague 1 (section D, autour des fires et spikes) ---
    [65,  9,  3, 1],      // x=2080..2176, entrée D, avant fires
    [69,  5,  3, 1],      // x=2208..2304, ROUTE HAUTE D (skip fires + spikes) — ty=5
    [75,  9,  3, 1],      // x=2400..2496, atterrissage après fires sur D
    [79,  6,  3, 1],      // x=2528..2624, sortie D haute, vers le gap D-E

    // --- Plateformes climax (section E îlot étroit) ---
    [89,  9,  3, 1],      // x=2848..2944, atterrissage après fallings sur E
    //     E est si étroite (7 tuiles sol) qu'on en met aussi une basse
    //     pour permettre 2 atterrissages (haute si on a sauté loin, basse sinon)

    // --- Plateformes climax vague 2 (section F) ---
    [104, 8,  3, 1],      // x=3328..3424, entrée F
    [109, 6,  3, 1],      // x=3488..3584, ROUTE HAUTE F (entre 2 fires)
    [114, 8,  3, 1],      // x=3648..3744, sortie F vers gap F-G

    // --- Plateformes climax vague 3 (section G) ---
    [124, 9,  3, 1],      // x=3968..4064, entrée G
    [129, 7,  3, 1],      // x=4128..4224, route haute G (SOUS saw 4192, timing requis)
    //     Saw 4192, range=128 → patrouille 4064..4320. Plateforme [129,7] est en x=4128..4224, chevauche.
    //     Saw y=224, plateforme top y=224 → exactement à hauteur saw. CORRECTION : remonter à ty=6.
    [135, 9,  3, 1],      // x=4320..4416, atterrissage post-saw

    // --- Plateformes respiration (section H) ---
    [147, 12, 3, 1],      // x=4704..4800, H
    [151, 9,  3, 1],      // x=4832..4928, cible avant tramp

    // --- Plateforme route haute finale (cible du trampoline 4768, offset 3 tuiles) ---
    //     Tramp x=4768 → cône x ∈ 4752..4784. Cible doit être hors plage horizontale.
    //     [151,9] : x=4832..4928 → offset = 64 px = 2 tuiles. OK marginal.
    [158, 6,  4, 1],      // x=5056..5184, plateforme route flag haute au-dessus de I

    // --- Plateforme SECRET (ty=3 = 12 tuiles au-dessus du sol) ---
    //     Accessible uniquement par : trampoline 4768 + double saut + bord plateforme [158,6].
    //     Difficulté supérieure à niv 1-2-3 : fenêtre horizontale serrée (cible 5040..5104).
    [157, 3,  3, 1],      // x=5024..5120, secret donjon ultime
  ],

  // Fruits structurés par phase. Total = 26 fruits (cible 22-26, max).
  fruitPositions: [
    // --- Intro (0 – 1120) : 6 fruits ---
    [112, 336],   // au-dessus [2,12]
    [240, 304],   // au-dessus [6,11]
    [496, 208],   // au-dessus [14,8] (route haute B après tramp 288)
    [656, 304],   // au-dessus [19,11]
    [816, 240],   // au-dessus [24,9]
    [976, 240],   // au-dessus [29,9]

    // --- Développement (1120 – 2048) : 5 fruits ---
    [1104, 176], // au-dessus [33,7] route haute fin B
    [1320, 240], // au-dessus [40,9]
    [1520, 176], // au-dessus [46,7] route haute C (skip spikes)
    [1700, 480], // sol C, juste avant les spikes (signal)
    [1840, 304], // au-dessus [56,11] sortie C

    // --- Climax (2048 – 4672) : 11 fruits, exigeants ---
    [2128, 240], // au-dessus [65,9] entrée D
    [2256, 96],  // au-dessus [69,5] ROUTE HAUTE PREMIUM (skip vague 1 entière)
    [2440, 240], // au-dessus [75,9] après fires
    [2576, 144], // au-dessus [79,6] sortie D
    [2720, 460], // SUR la falling 2720 (signal trap AU-DESSUS des spikes)
    [2896, 240], // au-dessus [89,9] îlot E
    [3376, 208], // au-dessus [104,8] entrée F
    [3536, 144], // au-dessus [109,6] route haute F
    [3696, 208], // au-dessus [114,8] sortie F
    [4176, 176], // au-dessus [129,7] route SOUS saw climax G (premium tendu)
    [4368, 240], // au-dessus [135,9] sortie G

    // --- Respiration / flag (4672 – 5280) : 4 fruits + 1 secret ---
    [4736, 336], // au-dessus [147,12]
    [4880, 240], // au-dessus [151,9]
    [5120, 144], // au-dessus [158,6] route haute finale
    [5200, 432], // sol I, juste avant flag (route safe finale)
    [5072, 96],  // SECRET au-dessus [157,3]
  ],

  // Trampolines (x, y=548). Sections valides : A(0-320), B(416-1120), C(1248-1920), D(2048-2624),
  //                                            E(2848-3072), F(3296-3776), G(3936-4480), H(4672-4928), I(5024-5280).
  //   288  → section A (32 px de marge avec bord A=320), propulse vers plateforme [14,8] B, franchit gap A-B route haute.
  //          Cône x ∈ 272..304 : aucune plateforme dans cette plage (vérifié).
  //   4768 → section H (96 px de marge avec bord gauche 4672 et 160 px avec bord droit 4928).
  //          Cône x ∈ 4752..4784 : aucune plateforme dans cette plage (vérifié).
  //          Atteint plateforme finale [158,6] et secret [157,3].
  trampolines: [
    { x: 288,  y: 548 },
    { x: 4768, y: 548 },
  ],

  // Spikes : 3 triplets SUR sol, alignés sous les fallingPlatforms du climax.
  //   Vague 1 (sous fallings 2720 + 2816) : spikes sur sortie de D = piège anticipation
  //   ⚠ ATTENTION : les fallings 2720 et 2816 sont DANS LE GAP D-E (2624-2848).
  //                  Les spikes doivent être sur les BORDS des sections D et E, pas dans le vide.
  //                  → spikes 2528, 2560, 2592 = fin section D ; 2848, 2880, 2912 = début section E.
  //                  Combo : si le joueur rate la falling, il tombe dans le vide. S'il atterrit mal, il prend les spikes.
  //   Vague 2 (section F, sous saw + fires) : 2 spikes 3680, 3712 sous saw climax
  //   Vague 3 (section G, sous saw 4192) : 3 spikes 4096, 4128, 4160 sous saw
  spikes: [
    // Vague 1 — bord droit section D (juste avant gap D-E)
    { x: 2528, y: 560 }, { x: 2560, y: 560 }, { x: 2592, y: 560 },
    // Vague 1 bis — bord gauche section E (juste après gap, atterrissage forcé propre)
    { x: 2848, y: 560 }, { x: 2880, y: 560 },
    // Vague 2 — section F sous saw 3520
    { x: 3392, y: 560 }, { x: 3424, y: 560 }, { x: 3456, y: 560 },
    // Vague 3 — section G sous saw 4192
    { x: 4096, y: 560 }, { x: 4128, y: 560 }, { x: 4160, y: 560 },
  ],

  // Boxes : 2 boîtes box2 en l'air (cohérent thème donjon, box2 = rose mais OK pour bonus visuel)
  boxes: [
    { x: 2208, y: 380, type: 'box2' },   // section D, signal route haute D ↑ skip vague 1
    { x: 4736, y: 400, type: 'box2' },   // section H, respiration, +50 bonus
  ],

  // Fires : 4 fires en 2 paires opposées (vague 1 = D, vague 2 = F).
  //   Vague 1 D : 2 fires period 1800, phases 0 / 0.5 (alternance serrée) — combo avec spikes en sortie
  //   Vague 2 F : 2 fires period 1800, phases 0.25 / 0.75 (décalage en quadrature) — combo avec saw 3520 + spikes
  fires: [
    { x: 2160, y: 544, period: 1800, phase: 0    },   // D fire 1
    { x: 2240, y: 544, period: 1800, phase: 0.5  },   // D fire 2 (opposé)
    { x: 3712, y: 544, period: 1800, phase: 0.25 },   // F fire 1 (sous saw 3520)
    { x: 3792, y: 544, period: 1800, phase: 0.75 },   // F fire 2 (opposé)
  ],

  // Saws : 4 saws.
  //   1) "vitrine" intro section B (rappel niv 2 — saw existe et bouge)
  //      x=1320, y=288, range=80, speed=80 → patrouille 1240..1400 (au-dessus du gap B-C, visible mais hors trajectoire obligée)
  //   2) "écho" entrée climax (x=2912, suspendue au-dessus du gap D-E) — annonce les fallings
  //      x=2912, y=320, range=80, speed=140 → patrouille 2832..2992 (au-dessus du gap, force le joueur à descendre vite)
  //   3) "climax 1" section F (x=3520, suspendue au-dessus des fires + spikes vague 2)
  //      x=3520, y=240, range=128, speed=180 → patrouille 3392..3648 (large, rapide)
  //   4) "climax 2" section G (x=4192, suspendue au-dessus des spikes vague 3)
  //      x=4192, y=224, range=128, speed=180 → patrouille 4064..4320 (large, rapide)
  //      Route haute via [129,7] (ty=7 = y monde 224, ⚠ collide exactly with saw y).
  //      CORRECTION FINALE : la plateforme [129,7] reste à ty=7 mais son top y=224 = saw center y=224.
  //                          La saw a une demi-hauteur 28 → bas saw y=252.
  //                          Le top de la plateforme à y=224 est AU-DESSUS du bas saw 252 ? NON, 224<252 → la plateforme top
  //                          est plus haute que le bas saw, donc le joueur SUR la plateforme y=224 marche AU-DESSUS de la saw.
  //                          OK : le joueur passe sur la plateforme et la saw passe sous lui. Effet visuel : la saw rase ses pieds.
  saws: [
    { x: 1320, y: 288, range: 80,  speed: 80  },   // vitrine
    { x: 2912, y: 320, range: 80,  speed: 140 },   // écho gap D-E
    { x: 3520, y: 240, range: 128, speed: 180 },   // climax 1 section F
    { x: 4192, y: 224, range: 128, speed: 180 },   // climax 2 section G
  ],

  // FallingPlatforms : 5 plateformes — relais obligés sur les grands gaps climax, plusieurs au-dessus de spikes.
  //   - 2720, 2816 : gap D-E (2624-2848, 7 tuiles). 2 relais chaînés.
  //                  Sous la 2720 : vide (y > 700). Si le joueur rate, il tombe et meurt.
  //                  La 2816 atterrit sur début E (sol à 2848). Les SPIKES bord E (2848, 2880) sont juste après.
  //   - 3184 : gap E-F (3072-3296, 7 tuiles). 1 relais central, sous saw écho 2912 (en sortie de sa patrouille).
  //   - 4576 : gap G-H (4480-4672, 6 tuiles). 1 relais central.
  fallingPlatforms: [
    { x: 2720, y: 560, delay: 400 },   // gap D-E, 1er relais (sous fire D si timing rate)
    { x: 2816, y: 560, delay: 400 },   // gap D-E, 2e relais (juste avant spikes E)
    { x: 3184, y: 560, delay: 400 },   // gap E-F, relais central
    { x: 4576, y: 560, delay: 400 },   // gap G-H, relais central (sous saw climax 4192 fin de patrouille)
  ],

  next: null,   // dernier niveau du jeu → victoire finale
};
```

## Risk / reward & secrets

- **Route safe** (~14/26 fruits) : longer le sol, double saut sur les gaps 4 tuiles, **pour le climax** : utiliser systématiquement la plateforme basse pour passer sous les saws (les saws sont toujours en hauteur ty=7..10), traverser les fires D au sol en attendant la fenêtre off de l'un puis pas-saut-pas (period 1800 = serré mais OK), franchir le gap D-E via les 2 fallings 2720+2816 en course continue (delay 400 ms → pas le temps de s'arrêter), traverser sous la saw écho 2912 en plongeant, atterrir sur E en évitant les spikes bord 2848+2880 par un saut, gap E-F via falling 3184, section F au sol en zigzaguant entre les fires alternés et SOUS la saw 3520 (saw y=240 > sol joueur y=540 → safe sans saut), sauter les spikes 3392-3456, gap F-G en double saut (5 tuiles), section G au sol en évitant la saw 4192 par le bas (y=224 OK) et le triplet de spikes 4096-4160 par un saut, gap G-H via falling 4576, respiration H, sauter gap H-I court (3 tuiles) jusqu'au flag. **Très exigeant en endurance** mais possible sans dégât.
- **Route haute** (~10 fruits premium) : exploiter [33,7] (fin B), [46,7] (skip spikes C), [69,5] (SKIP intégral vague 1 D !), [79,6] (sortie D vers gap D-E par le haut, évite saw écho), [109,6] (route haute F entre les fires), [129,7] (route SOUS saw climax G mais juste au-dessus des spikes — passage le plus tendu du niveau), [158,6] (route flag haute). Demande maîtrise totale du double saut et du timing saw.
- **Secret** (1 fruit, 5072, 96) : plateforme [157, 3, 3, 1] accessible uniquement par trampoline 4768 + plateforme [158,6] tremplin + double saut au-dessus. **Plus pénible qu'aux niveaux précédents** :
  - L'offset horizontal trampoline 4768 → secret 5072 est de 304 px ≈ 9.5 tuiles. Le rebond seul ne suffit pas, il faut atterrir sur [158,6] (= 5056..5184) qui est à ty=6 = y=192, puis depuis là, un double saut peut atteindre ty=3 = y=96 (Δ=3 tuiles = 96 px, OK).
  - Si raté, on retombe sur H ou I sans dégât (filet de sécurité).

## Playtesting checklist
- [ ] Tous les objets reposent sur un sol existant (sauf fallings et saws suspendues, qui SONT au-dessus du vide ou en l'air par design)
  - trampolines 288 (A), 4768 (H) → OK
  - spikes 2528-2592 (D), 2848-2880 (E), 3392-3456 (F), 4096-4160 (G) → tous sur leurs sections sol respectives, OK
  - boxes 2208 (D), 4736 (H) → en l'air mais au-dessus de leurs sections, OK
  - fires 2160/2240 (D), 3712/3792 (F) → OK
  - saws 1320 (au-dessus gap B-C, suspendue OK), 2912 (au-dessus gap D-E, suspendue OK), 3520 (au-dessus F, OK), 4192 (au-dessus G, OK)
  - fallings 2720/2816 (gap D-E), 3184 (gap E-F), 4576 (gap G-H) → OK, dans le vide
- [ ] Aucun saut > 10 tuiles : gaps max = 7 tuiles (D-E, E-F) mais relayés par fallings
- [ ] Aucune plateforme > 6 tuiles au-dessus du sol sans trampoline en amont
  - [14,8] = 10 tuiles → via tramp 288, OK
  - [33,7] = 11 → via [29,9] (Δ=2), OK
  - [46,7] = 11 → via [40,9] (Δ=2), OK
  - [69,5] = 13 → via [65,9] (Δ=4 limite), à valider en playtest
  - [79,6] = 12 → via [75,9] (Δ=3), OK
  - [109,6] = 12 → via [104,8] (Δ=2), OK
  - [129,7] = 11 → via [124,9] (Δ=2), OK
  - [158,6] = 12 → via tramp 4768, OK
  - [157,3] = 15 → via tramp 4768 + [158,6] tremplin + double saut (Δ=3), OK
- [ ] Mécaniques combinées introduites en safe — la première vraie combinaison (fires + spikes) est en section D, après que les fires et spikes aient été individuellement vus aux niveaux précédents
- [ ] Drapeau accessible sans dégât obligatoire — oui, route safe section I (5024-5280) flat
- [ ] **Climax très tendu en 70-85% du niveau** — vague 3 (section G, 3936..4480 = 75-85% du niveau) est le pic le plus dur, conforme à la consigne
- [ ] **Respiration mini avant flag** — section H (4672-4928) + gap court vers I, pas de piège entre saw 4192 et le flag → ne termine PAS sur frustration
- [ ] Total fruits = 26 (cible max 26)
- [ ] Variation x/y des fruits (pas alignés)
- [ ] Cône trampoline 288 (x ∈ 272..304, ty 5..16) : aucune plateforme dans cette zone (intro). OK.
- [ ] Cône trampoline 4768 (x ∈ 4752..4784, ty 5..16) : plateforme [151,9] est en x=4832..4928 (offset 64 px = 2 tuiles, OK marginal) ; [158,6] est en x=5056..5184 (offset 288 px, OK) ; [157,3] est à ty=3 hors zone tête. OK.

## Risques / dépendances
- **Aucune dépendance moteur** : `bg_brown` est déjà chargé dans GameScene.preload (ligne 62). Tous les pièges déjà câblés.
- ⚠ **Kit terrain — 2 candidats** :
  - **Choix par défaut** : TL=11, T=12, TR=13, ML=33, MC=34, MR=35 (brique rouge-marron à toit "tuiles"). Très "donjon chaleureux", contraste fort avec fond marron sombre.
  - **Candidat alternatif** : TL=77, T=78, TR=79, ML=99, MC=100, MR=101 (brique pierre grise rangée 3-4). Plus "donjon froid médiéval", moins de saturation. À choisir si la brique rouge clash trop avec le fond marron.
  - **Tradeoff** : Brique rouge = climax émotionnel chaud (forteresse maudite vivante). Brique grise = climax oppressant froid (forteresse abandonnée). Mon choix : rouge, plus expressif pour un niveau final.
- ⚠ La saw climax 4192 (y=224, range=128, speed=180) au-dessus des spikes 4096-4160 + plateforme [129,7] (top y=224) crée un passage où la saw passe AU NIVEAU des pieds du joueur sur la plateforme. C'est l'effet voulu (sensation de friction) mais doit être testé : si injuste, baisser saw y à 192 ou monter plateforme [129,7] à ty=6.
- ⚠ La plateforme [69,5] (route haute D, ty=5 = y 160) est à 13 tuiles au-dessus du sol, atteinte depuis [65,9] (ty=9 = y 288) avec Δ=4 tuiles = 128 px. Limite du double saut (max ~256 px) mais offset horizontal 4 tuiles = OK. Si trop dur, descendre [69,5] à ty=6.
- ⚠ Les 4 fires combinés avec spikes en section D et F demandent que le joueur ait bien intégré le timing fire (period 1800 = serré). Si frustrant, repasser à 2000.
- ⚠ Densité du climax : 52% du niveau (2624 px sur 5280). C'est volontaire (climax du jeu) mais à valider en playtest pour ne pas tomber dans le grind. Si négatif, élargir section E (entre D et F) à 12 tuiles pour offrir une vraie respiration intra-climax.
- ⚠ Avec 5 fallingPlatforms + 4 saws + 4 fires + 11 spikes, le niveau est très chargé visuellement. Vérifier la lisibilité runtime (Phaser peut tenir 60 FPS avec ces objets actifs simultanément, mais à confirmer).
- ⚠ Le `next: null` indique que c'est le dernier niveau. Vérifier que GameScene gère bien la fin de jeu / écran victoire (déjà câblé d'après niv 2 actuel qui a aussi `next: null`).
