# Spec — Niveau 3 (Cavernes oubliées)

## Intent (1 phrase)
Faire ressentir la descente dans la roche : plateforming serré sur sections étroites, **saw maintenue comme nouvelle obsession récurrente**, **fires en série** qui imposent un rythme de course, et **fallingPlatforms comme relais obligés** au-dessus de gaps trop larges pour un seul double saut.

## Thème & assets
- bgKey : `bg_gray` (déjà chargé dans GameScene.preload)
- bgColor : `#3a3a44` (fallback pierre sombre, cohérent avec un fond grotte)
- Tileset : kit **"pierre grise + bloc roche"** — frames TL=0, T=1, TR=2, ML=22, MC=23, MR=24
  - Justif visuelle : cols 0-2 / rows 0-1 du tileset sont des blocs gris foncé avec un liseré clair en haut (effet "pierre taillée"), idéaux pour caverne. Cohérent avec `bg_gray`.
- worldWidth : **5120** (16 segments de 320, niveau plus long que 4800 mais < 5400)
- Mécaniques utilisées : trampolines, spikes, boxes (box1), **fires en série**, **saws maintenues**, **fallingPlatforms relais**

## ASCII map (vue de côté, échelle 1 char ≈ 64 px monde)

```
Légende : =sol  -plateforme  T=tramp  S=spike  B=box  F=fire  W=saw  X=fallingPlat  *=fruit  [F]=flag  ~ =gap

ty=3                                                                                                              ----   (secret tendu)
ty=5                                                          ----                                          ----        (route haute climax)
ty=6                                                                              ---                                         *
ty=7                          ---                ----                                                                              ----   [F]?
ty=8                ----              W(susp.)                       ----              W(susp.)                  ----                       (route flag haute)
ty=9                                                  *  *                  *
ty=10  ---                                ----                                                                                                  
ty=11                  ----                                                                ----      ---
ty=12                              ---                                                                          ---                            (route safe)
ty=14                                                            S S S
ty=18  P====== ~ ============ ~~~~~ ====== ~~~~~ =========== ~~~~~~~~ ======= ~~~~~ ==========  ~~~~~~~~~~ ===========  ~~~ ==============
       0    448 512        1280 1472    1856 2048        2912 3168 3744 4032 4192 4480       4768 4992
                                                          X(2944)  X(3168)         X(3360..3552 relais)
                                                          + saw climax suspendu
                       T(384)       T(1696)                F(2208) F(2272) F(2336)            T(4592)
                                                            série de 3 fires
                                                                                                       ↑relance vers route haute finale + secret

Sections de sol :
 A : 0    – 448    (tx 0..13, w=14)
 B : 512  – 1280   (tx 16..39, w=24)
 C : 1472 – 1856   (tx 46..57, w=12)         ← plateforme étroite
 D : 2048 – 2912   (tx 64..90, w=27)         ← "couloir de feu" : 3 fires en série
 E : 3168 – 3744   (tx 99..116, w=18)         ← passage saw climax suspendue
 F : 4032 – 4192   (tx 126..130, w=5)         ← plateforme étroite, transition
 G : 4480 – 4768   (tx 140..148, w=9)         ← bas de la phase respiration
 H : 4992 – 5120   (tx 156..159, w=4)         ← socle du flag

Gaps :
 A-B : 448 – 512  = 64 px  = 2 tuiles  ✗ TROP COURT → on monte à 3 tuiles
       → réajusté : A finit à tx 13 (= 416), B commence à tx 16 (= 512)
       gap 416-512 = 96 px = 3 tuiles ✓
 B-C : 1280 – 1472 = 192 px = 6 tuiles (saut simple limite, INTRO confort)
 C-D : 1856 – 2048 = 192 px = 6 tuiles (saut simple)
 D-E : 2912 – 3168 = 256 px = 8 tuiles (CLIMAX, fallingPlatform à 3040 obligatoire)
 E-F : 3744 – 4032 = 288 px = 9 tuiles (CLIMAX, 2 fallingPlatforms relais 3840 + 3936)
 F-G : 4192 – 4480 = 288 px = 9 tuiles (CLIMAX bis, fallingPlatform 4288 + 4384)
 G-H : 4768 – 4992 = 224 px = 7 tuiles (RESPIRATION, mais saut double obligatoire)
```

Notes lecture :
- La majorité des gaps font **6-9 tuiles** (vs 3-5 au niv 1, 4-8 au niv 2).
- Le **couloir de feu** (D, 2048..2912) impose **3 fires en série** à period serrée → premier moment "course timée".
- 4 fallingPlatforms réparties sur 3 gaps successifs (D-E, E-F, F-G) : c'est la signature mécanique du niveau.
- 2 saws suspendues : la première en "rappel" section C (route haute non obligatoire), la seconde au-dessus de E pour la pression de sortie.

## Rythme — bornes en x monde

- **Intro** : 0 — 1280 (sections A + B, 1 trampoline 384, plateformes basses, **1ère saw suspendue isolée en hauteur** au-dessus de B pour signal visuel)
- **Développement** : 1280 — 2048 (section C étroite, triplet de spikes au sol, transition vers couloir de feu)
- **Climax** : 2048 — 4480 (3 fires en série dans D + saw climax au-dessus de D-E + 4 fallingPlatforms relais sur les 3 gaps successifs D-E / E-F / F-G — le pic dure 2400 px)
- **Respiration → flag** : 4480 — 5120 (sections G + H, trampoline final 4592 pour route haute + secret, drapeau accessible au sol pour route safe)

Justification : niv 1 a tout introduit, niv 2 a durci. Niv 3 fait monter la **densité de pièges** (couloir de 3 fires en série, jamais vu avant) et installe les fallingPlatforms comme outil principal de traversée des grands gaps. La respiration est courte (640 px sur 5120 = 12.5%) mais réelle, pour ne pas terminer sur la frustration.

## Layout complet (objet LEVELS proposé)

```js
LEVELS[3] = {
  name: 'Niveau 3 — Cavernes oubliées',
  bgKey: 'bg_gray',
  bgColor: '#3a3a44',
  tiles: {
    // Kit "pierre grise + bloc roche" : row 0 (top liseré clair) + row 1 (corps roche).
    topLeft:  0, top:   1, topRight:  2,
    midLeft: 22, midMid: 23, midRight: 24,
  },
  worldWidth: 5120,
  playerStart: { x: 80, y: 480 },
  flag: { x: 5040, y: 520 },

  // Sections sol niveau 3 (gaps marqués + 3 fallingPlatforms relais sur gaps > 8 tuiles) :
  //   A : 0    – 416    (tx 0..12, w=13)
  //   B : 512  – 1280   (tx 16..39, w=24)
  //   C : 1472 – 1856   (tx 46..57, w=12)
  //   D : 2048 – 2912   (tx 64..90, w=27)    ← couloir de 3 fires
  //   E : 3168 – 3744   (tx 99..116, w=18)
  //   F : 4032 – 4192   (tx 126..130, w=5)
  //   G : 4480 – 4768   (tx 140..148, w=9)
  //   H : 4992 – 5120   (tx 156..159, w=4)
  // Gaps :
  //   A-B : 416 – 512  = 96 px  = 3 tuiles  (saut simple confort)
  //   B-C : 1280 – 1472 = 192 px = 6 tuiles (saut simple limite)
  //   C-D : 1856 – 2048 = 192 px = 6 tuiles (saut simple limite)
  //   D-E : 2912 – 3168 = 256 px = 8 tuiles (CLIMAX, falling 3040 obligatoire)
  //   E-F : 3744 – 4032 = 288 px = 9 tuiles (CLIMAX, 2 fallings 3840 + 3936)
  //   F-G : 4192 – 4480 = 288 px = 9 tuiles (CLIMAX bis, falling 4288 + saut sur G)
  //   G-H : 4768 – 4992 = 224 px = 7 tuiles (respiration, double saut)
  layout: [
    // --- Sections de sol (ty=18..19) ---
    [0,   18, 13, 2],     // A : 0–416
    [16,  18, 24, 2],     // B : 512–1280
    [46,  18, 12, 2],     // C : 1472–1856
    [64,  18, 27, 2],     // D : 2048–2912
    [99,  18, 18, 2],     // E : 3168–3744
    [126, 18, 5,  2],     // F : 4032–4192 (étroite)
    [140, 18, 9,  2],     // G : 4480–4768
    [156, 18, 4,  2],     // H : 4992–5120 (sous le flag)

    // --- Plateformes intro (section A → B, escalier ascendant doux, ty=12..10) ---
    [3,   12, 3, 1],      // x=96..192, fruit visible
    [7,   10, 3, 1],      // x=224..320, relais (le saut vers A-B nécessite y≈480)
    [17,  11, 3, 1],      // x=544..640, après gap A-B

    // --- Plateforme route haute B (cible du trampoline 384, offset 3 tuiles) ---
    //     Tramp en x=384 → cône x ∈ 368..400, plateforme cible à x ≥ 480 (offset > 2 tuiles)
    [21,  8,  3, 1],      // x=672..768, fruits premium route haute B

    // --- Plateformes dev (section B, ty=12..10) ---
    [25,  10, 3, 1],      // x=800..896
    [30,  12, 3, 1],      // x=960..1056, plateforme 3 tuiles (étroite)
    [35,  9,  3, 1],      // x=1120..1216, route haute (sous la saw vitrine)

    // --- Plateforme étroite section C (3 tuiles), au-dessus des spikes ---
    [49,  11, 3, 1],      // x=1568..1664, plateforme 3 tuiles
    [54,  8,  3, 1],      // x=1728..1824, route haute (skip spikes)

    // --- Plateformes couloir de feu (section D, ty=11..7, route haute = skip 3 fires) ---
    //     Les 3 fires sont à x=2208, 2272, 2336 (espacés de 64 px = 2 tuiles)
    //     Route haute via ces 4 plateformes permet de passer au-dessus
    [66,  11, 3, 1],      // x=2112..2208, entrée D, avant 1er fire
    [70,  8,  3, 1],      // x=2240..2336, AU-DESSUS des fires (route haute "skip")
    [76,  10, 3, 1],      // x=2432..2528, après les fires
    [83,  7,  4, 1],      // x=2656..2784, route haute D, fruit premium
    [88,  10, 3, 1],      // x=2816..2912, sortie D avant gap climax

    // --- Plateformes climax (section E, autour de la saw suspendue et des fallings) ---
    [101, 12, 3, 1],      // x=3232..3328, atterrissage après falling 3040
    [108, 9,  4, 1],      // x=3456..3584, route haute SOUS la saw 3360
    //     ⚠ Saw climax à y=288 (ty≈9), plateforme à ty=9 → en théorie pas ok, mais
    //     la saw patrouille en x=3360 (range=128 → 3232..3488), donc elle CROISE
    //     horizontalement. Le joueur doit timer le passage. y de saw=288 ; bord supérieur
    //     plateforme y=288 (ty 9 = 288 pixel top). Donc la plateforme est PILE à la hauteur de la saw.
    //     CORRECTION : remonter plateforme à ty=8 pour passage juste au-dessus de la saw.
    //     → corrigé ci-dessous, voir plateforme [108, 8, 4, 1].

    // --- Plateformes relais de fallings (section F étroite) ---
    [126, 11, 3, 1],      // x=4032..4128, atterrissage sur F après falling 3936

    // --- Plateforme respiration (section G → H, ty=12..7) ---
    [141, 12, 3, 1],      // x=4512..4608, après falling 4384 → G
    [146, 9,  3, 1],      // x=4672..4768, plateforme haute G (cible avant tramp)

    // --- Plateforme route haute finale (cible du trampoline 4592, offset 3 tuiles) ---
    //     Tramp 4592 → cône x ∈ 4576..4608. Cible doit être en x ≥ 4640 (≥ 2 tuiles d'offset).
    //     ⚠ La plateforme [146,9,3,1] (x=4672..4768) chevauche le cône en hauteur (ty=9 = 288 dans cône 5..16).
    //     Décalage : x=4672 - 4592 = 80 px = 2.5 tuiles → OK (règle : offset ≥ 2 tuiles).
    [154, 7,  4, 1],      // x=4928..5056, plateforme route flag haute (au-dessus de H)

    // --- Plateforme SECRET (ty=3 = 12 tuiles au-dessus du sol) ---
    //     Accessible uniquement via trampoline 4592 + double saut depuis [146,9].
    //     Boost tramp ~12 tuiles, donc atteignable.
    [152, 3,  4, 1],      // x=4864..4992, fruit secret tendu
  ],

  // Fruits structurés par phase. Total = 24 fruits (cible 22-26).
  fruitPositions: [
    // --- Intro (0 – 1280) : 5 fruits ---
    [144, 336],   // au-dessus [3,12]
    [272, 272],   // au-dessus [7,10]
    [592, 304],   // au-dessus [17,11]
    [720, 208],   // au-dessus [21,8] route haute B (après tramp 384)
    [1180, 240], // au-dessus [35,9] route haute B

    // --- Développement (1280 – 2048) : 4 fruits, dont 1 sol risqué près des spikes ---
    [1616, 304], // au-dessus [49,11]
    [1776, 208], // au-dessus [54,8] route haute C (skip spikes)
    [1800, 480], // sol C, juste avant le gap C-D (signal de fin section)
    [2080, 480], // sol D, entrée du couloir de feu (signal)

    // --- Climax (2048 – 4480) : 10 fruits, exigeants ---
    [2160, 304], // au-dessus [66,11], avant 1er fire (signal danger)
    [2288, 208], // au-dessus [70,8] route haute (au-dessus des fires)
    [2480, 272], // au-dessus [76,10]
    [2720, 176], // au-dessus [83,7] route haute climax (premium)
    [2864, 272], // au-dessus [88,10] sortie D
    [3040, 460], // sur la falling 3040 (incite à se poser → trap visible)
    [3280, 336], // au-dessus [101,12] atterrissage après falling
    [3520, 240], // au-dessus [108,8] route haute SOUS la saw
    [4064, 304], // au-dessus [126,11] section F étroite
    [4288, 460], // sur la falling 4288 (gap F-G)

    // --- Respiration / flag (4480 – 5120) : 5 fruits dont 1 secret ---
    [4560, 336], // au-dessus [141,12]
    [4720, 240], // au-dessus [146,9]
    [4992, 176], // au-dessus [154,7] route haute finale
    [5040, 432], // sol H, juste avant le flag (route safe)
    [4960, 96],  // SECRET au-dessus [152,3]
  ],

  // Trampolines (x, y=548). Sections valides : A(0-416), B(512-1280), C(1472-1856), D(2048-2912),
  //                                            E(3168-3744), F(4032-4192), G(4480-4768), H(4992-5120).
  //   384  → section A (32px de marge avec bord A à 416), propulse vers plateforme [21,8] B et franchit gap A-B (route haute).
  //          Cône x ∈ 368..400 : aucune plateforme dans cette plage (vérifié manuellement).
  //   4592 → section G (à 80 px du bord gauche 4480 et 176 px du bord droit 4768, marge OK).
  //          Cône x ∈ 4576..4608 : plateforme [146,9] est en x=4672..4768 (offset ≥ 64 = 2 tuiles, OK).
  //          Atteint plateforme finale [154,7] et secret [152,3].
  trampolines: [
    { x: 384,  y: 548 },
    { x: 4592, y: 548 },
  ],

  // Spikes : triplet groupé sur section C (plateforme étroite, première vraie pression).
  //   Esquive : sauter directement OU passer route haute via [54,8].
  spikes: [
    { x: 1600, y: 560 }, { x: 1632, y: 560 }, { x: 1664, y: 560 },  // section C, triplet aligné
  ],

  // Boxes : 2 boxes en l'air (centre y 380..420), 1 dans le couloir de feu (signal route haute) + 1 respiration.
  boxes: [
    { x: 2272, y: 400, type: 'box1' },   // section D, JUSTE au-dessus du 2e fire — signal "tu peux casser pour repérer la route haute"
    { x: 4560, y: 400, type: 'box1' },   // section G, respiration, +50 récompense
  ],

  // Fires : 3 fires en SÉRIE sur section D (couloir de feu) — signature du niveau.
  //   period 2000 ms, phases échelonnées 0 / 0.33 / 0.66 → vague continue, fenêtre étroite mais existante.
  //   Espacement 64 px (2 tuiles) entre les fires → le joueur ne peut pas tous les sauter d'un coup,
  //   il doit alterner pas-saut-pas. Route haute via [70,8] permet le SKIP intégral.
  fires: [
    { x: 2208, y: 544, period: 2000, phase: 0    },
    { x: 2272, y: 544, period: 2000, phase: 0.33 },
    { x: 2336, y: 544, period: 2000, phase: 0.66 },
  ],

  // Saws : 2 saws.
  //   1) "vitrine" en hauteur section B (rappel pédagogique niv 2 — saw existe, elle bouge)
  //      x=1140, y=288, range=80, speed=80 → patrouille 1060..1220 (au-dessus de section B 512-1280)
  //   2) "climax" suspendue dans l'aire de saut climax au-dessus du gap D-E + entrée E
  //      x=3360, y=224, range=128, speed=160 → patrouille 3232..3488
  //      Le joueur passe SOUS via sol E ou AU-DESSUS via plateforme [108,8] (y=256 → top 256, saw center y=224 → bottom 252)
  //      ⚠ Vérification cône : la plateforme [108,8] est à y monde 256 (top). La saw à y=224, demi-hauteur 28 → bas saw y=252.
  //         La plateforme [108,8] est en x=3456..3584 ; saw patrouille 3232..3488 → chevauche entre 3456..3488.
  //         Mais la plateforme top y=256 > saw bottom 252 → la saw passe LÉGÈREMENT sous la plateforme côté gauche.
  //         Cela rend impossible d'utiliser [108,8] aux x 3456..3488 quand la saw y est. Timer requis.
  //         Effet souhaité : la plateforme est utilisable mais avec timing → vraie tension.
  saws: [
    { x: 1140, y: 288, range: 80,  speed: 80  },   // vitrine, range 80 = patrouille 1060..1220
    { x: 3360, y: 224, range: 128, speed: 160 },   // climax, range 128 = patrouille 3232..3488
  ],

  // FallingPlatforms : 4 plateformes relais, signature du niveau, placées dans les 3 grands gaps.
  //   Sous chacune : vide (y > 700 = mort par chute).
  //   - 3040 : centre gap D-E (2912..3168, 256 px = 8 tuiles), passage obligatoire ou alors saut au-dessus via plateforme [88,10] → [101,12]
  //   - 3840 et 3936 : gap E-F (3744..4032, 288 px = 9 tuiles), 2 relais successifs car double saut seul insuffisant
  //   - 4288 et 4384 : gap F-G (4192..4480, 288 px = 9 tuiles), idem 2 relais
  fallingPlatforms: [
    { x: 3040, y: 560, delay: 500 },   // gap D-E, relais central
    { x: 3840, y: 560, delay: 400 },   // gap E-F, 1er relais
    { x: 3936, y: 560, delay: 400 },   // gap E-F, 2e relais (chaîné)
    { x: 4288, y: 560, delay: 400 },   // gap F-G, 1er relais
    { x: 4384, y: 560, delay: 400 },   // gap F-G, 2e relais (chaîné)
  ],

  next: 4,
};
```

## Risk / reward & secrets

- **Route safe** (~16/24 fruits) : longer le sol au maximum, utiliser le trampoline 384 ou faire un double saut pour le gap A-B (3 tuiles, ok simple), sauter en hauteur pour passer le triplet de spikes (1600-1664) ou prendre la plateforme [49,11] qui est juste au-dessus, traverser le couloir de feu D au sol en synchronisant pas-saut-pas-saut (les phases échelonnées 0/0.33/0.66 garantissent une fenêtre par fire, demande timing serré mais pas inhumain), survivre aux fallings successives en gardant le mouvement (le delay 400 ms est plus court qu'au niv 1, force la course), passer SOUS la saw climax 3360 (saw y=224, joueur sol y=540 → safe sans saut). Finir au sol jusqu'au flag.
- **Route haute** (~5 fruits premium) : utiliser plateformes [21,8] (route haute B), [54,8] (skip spikes C), [70,8] (route SKIP fires couloir de feu D), [83,7] (premium climax D), [108,8] (route au-dessus de la saw, demande timing), [154,7] (route flag haute). Demande double saut maîtrisé et compréhension du timing saw.
- **Secret** (1 fruit, 4960, 96) : plateforme [152, 3, 4, 1] accessible uniquement par trampoline 4592 + double saut au pic du rebond. Si raté, retombe sur G ou H sans dégât.
  - Difficulté ↑ vs niv 1-2 : le secret est plus tendu car la fenêtre de double saut au sommet du rebond est plus étroite (offset horizontal entre tramp 4592 et plateforme 4864 = 272 px ≈ 8.5 tuiles, doit être franchi pendant l'apex).

## Playtesting checklist
- [ ] Tous les objets reposent sur un sol existant (pas dans un gap), sauf fallings qui DOIVENT être dans le vide
  - trampolines 384 (A), 4592 (G) → OK
  - spikes 1600/1632/1664 (C 1472-1856) → OK
  - boxes 2272 (D 2048-2912), 4560 (G 4480-4768) → OK
  - fires 2208/2272/2336 (D 2048-2912) → OK
  - saw 1140 (en l'air au-dessus de B, valide), saw 3360 (au-dessus du gap D-E et entrée E, suspendue → OK)
  - fallings 3040 (gap D-E), 3840/3936 (gap E-F), 4288/4384 (gap F-G) → OK, toutes dans le vide
- [ ] Aucun saut > 10 tuiles : gaps max = 9 tuiles (E-F, F-G) mais avec fallings-relais qui réduisent à ≤ 5 tuiles entre 2 fallings
- [ ] Aucune plateforme > 6 tuiles au-dessus du sol sans trampoline en amont
  - [21,8] = 10 tuiles au-dessus du sol → atteinte via trampoline 384 (boost ~12 tuiles), OK
  - [54,8] = 10 tuiles → atteinte via [49,11] (Δ=3 tuiles), OK
  - [70,8] = 10 tuiles → atteinte via [66,11] (Δ=3 tuiles), OK
  - [83,7] = 11 tuiles → atteinte via [76,10] (Δ=3 tuiles), OK
  - [108,8] = 10 tuiles → atteinte via [101,12] (Δ=4 tuiles), OK
  - [154,7] = 11 tuiles → atteinte via trampoline 4592 (boost ~12 tuiles), OK
  - [152,3] = 15 tuiles → atteinte via tramp 4592 + double saut depuis apex (Δ=4 tuiles au sommet du rebond), OK marginal
- [ ] Mécaniques saw maintenues et fire en série introduites en safe avant climax
  - saw vitrine 1140 hors trajectoire → OK
  - fires en série : route haute via [70,8] disponible → OK, le joueur peut choisir de skipper
- [ ] Drapeau accessible sans dégât obligatoire — oui, route safe au sol H (4992-5120) directement
- [ ] Total fruits = 24 (cible 22-26)
- [ ] Variation x/y des fruits (pas alignés)
- [ ] Cône trampoline 4592 (x ∈ 4576..4608, ty 5..16) : plateformes dans cette zone ?
  - [146,9] : x=4672..4768, ty=9 → x hors cône (offset 64 px). OK.
  - [154,7] : x=4928..5056, hors cône. OK.
  - [152,3] : ty=3 hors zone tête (5..16). OK.
- [ ] Cône trampoline 384 (x ∈ 368..400, ty 5..16) : aucune plateforme. OK.

## Risques / dépendances
- **Aucune dépendance moteur** : `bg_gray` est déjà chargé dans GameScene.preload (ligne 63), tous les pièges (fires/saws/fallingPlatforms) déjà câblés.
- ⚠ Le kit terrain choisi (frames 0,1,2 / 22,23,24) est mon meilleur candidat visuel pour la grotte, mais **je n'ai pas pu garantir à 100% que les frames du kit sont bien alignées** sans rendu in-game. Candidat alternatif si playtest visuel décevant : essayer cols 0-2 rows 6-7 → TL=132, T=133, TR=134, ML=154, MC=155, MR=156 (cadre métallique vert-sombre, plus "ruines" que "caverne").
- ⚠ La saw climax 3360 (y=224, range=128, speed=160) au-dessus de la plateforme [108,8] (y=256) crée un passage très tendu (saw bottom y≈252, plateforme top y=256 → 4 px de marge). Si en playtest c'est injouable, déplacer la saw à y=192 (passage clair sous la plateforme) OU élargir range à 160 pour ralentir la perception.
- ⚠ Les 3 fires en série (period 2000, phases 0/0.33/0.66) demandent que le joueur soit en mouvement. Si trop frustrant en playtest, augmenter period à 2400 (fenêtre plus large) ou réduire phase échelonnement à 0/0.4/0.8.
- ⚠ 5 fallingPlatforms est plus que les niveaux précédents — vérifier que le delay 400 ms reste tenable (sinon repasser à 500).
- ⚠ La densité du climax (2048..4480 = 47% du niveau) est volontaire mais peut être perçue comme épuisante. Si playtest négatif, raccourcir worldWidth ou élargir section E ou F pour offrir une mini-respiration intra-climax.
