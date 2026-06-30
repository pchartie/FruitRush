// Configuration des niveaux du jeu.
//
// tiles : indices de frames dans le tileset 'terrain' (22 cols × 11 rows).
//   topLeft / top / topRight : rangée du haut (avec "herbe" sur le dessus).
//   midLeft / midMid / midRight : rangée(s) du corps (matériau dessous).
// layout : tableau de [tx, ty, tw, th] en tuiles de 32 unités monde.
// fruitTypes (optionnel) : sous-ensemble des 8 fruits dispos à spawner sur ce
//   niveau. Si absent, les 8 sont cyclés. Liste valide : 'apple', 'bananas',
//   'cherries', 'kiwi', 'melon', 'orange', 'pineapple', 'strawberry'.
//
// Plateformes flottantes (niv 1+2) = PILIERS style SMB. Deux variantes selon la position :
//   - Plateforme au-dessus d'un sol : th = 18 - ty (la masse de terre se fond avec le sol).
//   - Plateforme au-dessus d'un gap : th = 20 - ty (colonne longue qui descend jusqu'au bas
//     du viewport y=640, suggère une structure ancrée plutôt qu'une plateforme isolée flottante).
//   - Cas mixte (chevauche sol ET gap) : th = 20 - ty (la décoration superpose la rangée de
//     sol sur la partie posée, sans impact gameplay).
// Niv 3+4 : plateformes minces th=1 (convention "ambiance sombre"), comportement solide toutes faces.
//
// Pièges optionnels (tous facultatifs, par défaut absents) :
//   trampolines      : [{ x, y }]                     y=548 => sur le sol top y=576
//   spikes           : [{ x, y }]                     y=560 => pointes émergent du sol
//   boxes            : [{ x, y, type }]               type = 'box1' | 'box2', taper PAR DESSOUS pour +50
//   fires            : [{ x, y, period?, phase? }]    cycle on/off, period ms (def 2000), phase 0..1
//                                                     y=544 => flamme posée sur le sol (h=64 visible)
//   saws             : [{ x, y, range?, speed? }]     patrouille horizontale ±range px (def 80) à speed px/s (def 120)
//                                                     toujours active, contact = dégât
//   fallingPlatforms : [{ x, y, delay? }]             solide jusqu'au contact, puis shake delay ms (def 500), puis chute
//                                                     y=560 => posée au niveau du sol (h=20 visible avec scale 2)

export const LEVELS = {
  1: {
    name: 'Niveau 1 — Plaine verte',
    bgKey: 'bg_yellow',
    bgColor: '#a86b1a',
    tiles: {
      topLeft:  6, top:   7, topRight:  8,
      midLeft: 28, midMid: 29, midRight: 30,
      // Petit bloc décoratif 2×2 (à droite du kit vert) tamponné dans les colonnes.
      detail: { topLeft: 9, topRight: 10, botLeft: 31, botRight: 32 },
    },
    worldWidth: 4800,
    // Petits blocs "vivants" çà et là dans les grandes colonnes de terre
    // (coin haut-gauche du bloc 2×2, en grille tuile). La rangée du haut est une
    // vraie plateforme jump-through (on peut se poser dessus).
    dirtDecals: [
      // Surface d'appui (jump-through) = y monde (ty+1)*32, centrée x=(tx+1)*32, large ~26 px.
      // Chaque bloc 2×2 est entièrement contenu dans la terre d'un pilier (déco calée en profondeur).
      // On n'en met que là où aucun trampoline ne rend déjà la zone accessible (2-3 max par niveau).
      [41, 13],   // pilier [40,10,4,8] (dev B) → appui x=1344 / y=448 : palier qui casse le
                  //   double-saut sec vers le fruit [1328,272] (loin de tout trampoline).
      [83, 11],   // pilier [82,8,4,10] (climax C) → appui x=2688 / y=384 : débloque le fruit
                  //   premium [2688,208] (sommet y=256 sinon hors portée) via une montée en 2 temps.
    ],
    playerStart: { x: 80, y: 480 },
    flag: { x: 4680, y: 520 },
    // Fruits visibles ce niveau : rouges/frais pour la plaine verte.
    fruitTypes: ['apple', 'strawberry', 'cherries'],

    // Sections sol niveau 1 (patch playtest : gaps élargis à ≥3 tuiles ; gap D-E réélargi 3→6 tuiles) :
    //   A : 0    – 608    (tx 0..18, w=19)
    //   B : 736  – 2016   (tx 23..62, w=40)
    //   C : 2176 – 3008   (tx 68..93, w=26)
    //   D : 3232 – 4320   (tx 101..134, w=34)
    //   E : 4512 – 4800   (tx 141..149, w=9, sous le flag)
    // Gaps :
    //   A-B : 608  – 736  = 128 px = 4 tuiles  (saut simple confort)
    //   B-C : 2016 – 2176 = 160 px = 5 tuiles  (saut simple, sentiment de trou)
    //   C-D : 3008 – 3232 = 224 px = 7 tuiles  (CLIMAX, falling_platform à x=3120 en relais)
    //   D-E : 4320 – 4512 = 192 px = 6 tuiles  (saut simple confort avant flag — élargi de 3 à 6 tuiles
    //                                            pour rendre la respiration finale plus tangible visuellement
    //                                            sans empiéter sur le climax C-D 7-tuiles)
    //
    // Patch "moins de piliers, plus larges" + "pas de pilier au-dessus d'un gap" :
    //   - Piliers passés de 20 → 15 (-25 %).
    //   - Tous les piliers à tw=4 (sauf fusion [124,8,7,10] tw=7).
    //   - Anciens piliers [21,8,3,10], [137,6,4,12], [138,4,4,14] (mass dans gap A-B ou D-E)
    //     repassés en plateformes aériennes th=1 (relais sans masse de terre dans le gap).
    //   - Fusion [124,8,3,10] + [128,10,3,8] → [124,8,7,10] (ty du plus haut, emprise des 2).
    //   - Suppressions : [33,13,3,5] supprimé ; [128,10,3,8] absorbé par fusion ci-dessus.
    //   - Décalage : [9,13,3,5] → [8,13,4,5] et [13,11,3,7] → [12,11,4,7] pour reformer staircase
    //     adjacent (steps 2 tuiles) sans débordement et préserver marge tramp 576.
    //   - Piliers à ty>7 → tw=4 ; piliers à ty≤7 → tw=4 conservé (cas [124,8,7,10] = ty=8 fusion).
    layout: [
      // --- Sections de sol (ty=18..19) ---
      [0,   18, 19, 2],     // section A : 0–608
      [23,  18, 40, 2],     // section B : 736–2016
      [68,  18, 26, 2],     // section C : 2176–3008
      [101, 18, 34, 2],     // section D : 3232–4320 (raccourcie tw 37→34 pour élargir gap D-E à 6 tuiles)
      [141, 18, 9,  2],     // section E : 4512–4800 (sous le flag)

      // --- Piliers intro (escalier ascendant sur section A, tuto saut + double saut) ---
      // Patch "chevauchement esthétique" : 3-marches imbriquées en chaîne, overlap 2 tuiles entre marches
      // adjacentes. Depth par ty fait passer la petite marche devant la grande (feuilleté SMB).
      [4,   15, 4, 3],      // x=128..256, pilier ty=15..17, tw=4 (préservé, ancre la base de l'escalier)
      [6,   13, 4, 5],      // x=192..320, pilier ty=13..17, tw=4 (décalé tx=8→6 : overlap 2 tuiles avec [4,15])
      [8,   11, 4, 7],      // x=256..384, pilier ty=11..17, tw=4 (décalé tx=12→8 : overlap 2 tuiles avec [6,13]). Margin tramp 576 : right=384 vs cône left=560 → 176 px ✓

      // --- Plateforme aérienne route haute au-dessus du gap A-B (cible du trampoline x=576) ---
      // ANCIEN : [21,8,4,1] plateforme fine flottante au-dessus du gap → converti en colonne longue
      //   (variante "au-dessus d'un gap" de la convention pilier : th = 20 - ty pour descendre
      //    jusqu'au bas du viewport y=640 et éviter l'effet "plateforme isolée qui flotte").
      [21,  8,  4, 12],     // x=672..800, pilier ty=8..19, hauteur 384 px, descend jusqu'au bas du viewport (gap A-B)

      // --- Piliers développement (section B) — 5 → 4 piliers (drop [33,13,3,5]) ---
      [27,  11, 4, 7],      // x=864..992, pilier ty=11..17, tw=4 (élargi)
      [40,  10, 4, 8],      // x=1280..1408, pilier ty=10..17, tw=4 (élargi)
      [48,  12, 4, 6],      // x=1536..1664, pilier ty=12..17, tw=4 (élargi)
      [56,  10, 4, 8],      // x=1792..1920, pilier ty=10..17, tw=4 (élargi)

      // --- Piliers climax (section C, route haute = relais sur les sommets) ---
      // Patch "chevauchement esthétique" : [69,12] et [73,10] se touchaient (gap=0) → overlap 1 tuile.
      [69,  12, 4, 6],      // x=2208..2336, pilier ty=12..17, tw=4 (préservé)
      [72,  10, 4, 8],      // x=2304..2432, pilier ty=10..17, tw=4 (décalé tx=73→72 : overlap 1 tuile avec [69,12])
      [82,  8,  4, 10],     // x=2624..2752, pilier ty=8..17, tw=4 (inchangé)
      [89,  11, 4, 7],      // x=2848..2976, pilier ty=11..17, tw=4 (élargi)

      // --- Pilier atterrissage après falling (entrée section D) ---
      [101, 12, 4, 6],      // x=3232..3360, pilier ty=12..17, tw=4 (élargi)

      // --- Piliers respiration (section D) — fusion [124,8] + [128,10] ---
      [108, 12, 4, 6],      // x=3456..3584, pilier ty=12..17, tw=4 (inchangé)
      [116, 10, 4, 8],      // x=3712..3840, pilier ty=10..17, tw=4 (inchangé)
      [124, 8,  7, 10],     // x=3968..4192, pilier ty=8..17, tw=7 (FUSION de [124,8,3,10] + [128,10,3,8], ty du plus haut)

      // --- Plateformes route haute finale (cible du trampoline x=4256, offset 4 tuiles) ---
      // ANCIEN : [137,6,4,1] et [138,4,4,1] plateformes fines au-dessus du gap D-E
      //   → converti en colonnes longues (variante "au-dessus d'un gap" : th = 20 - ty).
      //   La masse de terre descend jusqu'au bas du viewport y=640 pour suggérer une structure
      //   ancrée plutôt qu'une plateforme isolée flottante.
      // Post-élargissement gap D-E (3→6 tuiles, section D right=4320) : les deux piliers flottent
      //   désormais entièrement au-dessus du gap (sauf bord droit [138,4] qui chevauche bord E).
      //   th=20-ty conservé (descente jusqu'au bas du viewport) — la convention "au-dessus d'un gap"
      //   reste appliquée à l'identique.
      [137, 6,  4, 14],     // x=4384..4512, pilier ty=6..19, hauteur 448 px (entièrement au-dessus du gap D-E, cible route haute après tramp 4256)
      [138, 4,  4, 16],     // x=4416..4544, pilier ty=4..19, hauteur 512 px (SECRET, cas mixte gap D-E ↔ E ; hors cône tramp)
    ],

    // Fruits structurés par phase de rythme. Total = 21 (était 22 ; -1 sur drop [33,13]).
    fruitPositions: [
      // --- Intro (0 – 800) : 5 fruits sur trajectoires guidées ---
      [160, 432],   // au-dessus pilier [4,15,4,3] (top y=480, fruit 48 px au-dessus)
      [272, 368],   // au-dessus pilier [6,13,4,5] (fruit suit le décalage escalier -64 px)
      [320, 304],   // au-dessus pilier [8,11,4,7] (fruit suit le décalage escalier -144 px, centré sur nouveau sommet x=256..384)
      [720, 240],   // au-dessus plateforme [21,8,4,1] (route haute après tramp 576)
      [800, 380],   // entrée section B au sol (entre piliers)

      // --- Développement (800 – 2100) : 6 fruits (drop fruit ex-[33,13]) ---
      [912,  304],  // au-dessus pilier [27,11,4,7]
      [1328, 272],  // au-dessus pilier [40,10,4,8]
      [1480, 480],  // sol, à proximité spike pour signaler
      [1584, 320],  // au-dessus pilier [48,12,4,6]
      [1840, 272],  // au-dessus pilier [56,10,4,8]
      [1980, 360],  // box signal section B (entre piliers)

      // --- Climax (2100 – 3300) : 6 fruits, route haute exclusive ---
      [2240, 320],  // au-dessus pilier [69,12,4,6], entrée C
      [2368, 272],  // au-dessus pilier [72,10,4,8] (sommet route haute, fruit suit décalage -32 px)
      [2688, 208],  // au-dessus pilier [82,8,4,10] (premium)
      [2900, 304],  // au-dessus pilier [89,11,4,7]
      [3120, 432],  // récompense après falling_platform
      [3280, 320],  // au-dessus pilier [101,12,4,6] (atterrissage section D)

      // --- Respiration / flag (3300 – 4800) : 4 fruits dont route haute + 1 secret ---
      [3520, 320],  // au-dessus pilier [108,12,4,6]
      [3792, 272],  // au-dessus pilier [116,10,4,8] (déplacé de 3780→3792, marge ≥16 px avec sommet)
      [4144, 208],  // au-dessus pilier fusionné [124,8,7,10] (centre du sommet large)
      [4480, 96],   // SECRET au-dessus plateforme [138,4,4,1]
    ],

    // Trampolines (x, y=548). Sections valides : A(0-608), B(736-2016), C(2176-3008), D(3232-4320), E(4512-4800).
    //   576  → section A. Cône x±16=560..592 ; [8,11,4,7] right=384 (marge BB 176 ✓ après imbrication escalier), [21,8,4,12] left=672 (marge 68 ✓).
    //   4256 → section D (déplacé de 4288→4256 suite à raccourcissement section D : tw 37→34, right=4320).
    //          Cône x±16=4240..4272 ; [124,8,7,10] right=4192 (marge BB 36 ✓),
    //          [137,6,4,14] left=4384 (marge BB 84 ✓, hor. offset 4 tuiles >2 ✓),
    //          [138,4,4,16] ty=4 hors range ty=5..16 ✓.
    //          Marge BB droite (4284) vs section D right=4320 = 36 px ✓ (≥32 px du bord gap).
    trampolines: [
      { x: 576,  y: 548 },
      { x: 4256, y: 548 },
    ],

    // Spikes : triplet sur sol section B (introduction "calme" du danger statique).
    //   Patch "piliers larges" : avec [48,12] élargi à tw=4 (right=1664) et [56,10] tw=4 (left=1792),
    //   zone libre se rétrécit à 1664..1792 (128 px). Triplet décalé de 4px vers la gauche pour
    //   marges ≥16 px aux deux piliers voisins.
    spikes: [
      { x: 1696, y: 560 }, { x: 1728, y: 560 }, { x: 1760, y: 560 },  // section B, triplet décalé -4
    ],

    // Boxes : 2 boxes en l'air.
    //   Box 1980 : zone libre [56,10,4,8] right=1920 → bord section B 2016 (96 px). Marge box=32 px ✓.
    //   Box 3648 : zone libre [108,12,4,6] right=3584 → [116,10,4,8] left=3712 (128 px). Marges 36 px ✓.
    boxes: [
      { x: 1980, y: 420, type: 'box1' },   // section B (fin dev), taper par dessous
      { x: 3648, y: 380, type: 'box1' },   // section D (entre [108,12,4,6] et [116,10,4,8]) — taper par dessous
    ],

    // Fires : 1 fire en isolation, sur sol section C.
    //   Patch pilier : fire déplacé de 2350 (DANS pilier [72,10]) → 2544 (zone libre 2432..2624 entre piliers post-imbrication).
    //   Route haute via sommet pilier [72,10] permet de SKIP en passant au-dessus du fire.
    fires: [
      { x: 2544, y: 544, period: 2200, phase: 0 },   // section C, entre piliers [72,10] et [82,8]
    ],

    // FallingPlatforms : 1 plateforme-relais dans le gap C-D (3008-3232, 7 tuiles).
    fallingPlatforms: [
      { x: 3120, y: 560, delay: 500 },
    ],

    next: 2,
  },

  2: {
    name: 'Niveau 2 — Pays de Bonbon',
    bgKey: 'bg_purple',
    bgColor: '#2a1238',
    tiles: {
      // Kit "candy rose + sable rose" : row 8 (top candy) + row 9 (body sable).
      topLeft: 182, top:   183, topRight: 184,
      midLeft: 204, midMid: 205, midRight: 206,
      // Petit bloc décoratif/plateforme 2×2 (à droite du kit rose).
      detail: { topLeft: 185, topRight: 186, botLeft: 207, botRight: 208 },
    },
    worldWidth: 4800,
    // Petits blocs "vivants" tamponnés dans les grandes colonnes de terre.
    // Surface d'appui (jump-through) = y monde (ty+1)*32, centrée x=(tx+1)*32, large ~26 px.
    // Bloc 2×2 entièrement contenu dans la terre d'un pilier. 2-3 max, jamais près d'un trampoline.
    // Trampolines de ce niveau : x=400 (sert route-haute A-B / [17,8]) et x=4480 (sert finale [144,7] + secret).
    dirtDecalOffsetX: 1,   // décale les blocs d'1px vers la droite (alignement colonne)
    dirtDecals: [
      [41, 13],   // pilier [43,12,4,6]/[40,10,4,8] (dev B, tx 40..43) → appui x=1344 / y=448 : palier qui
                  //   casse le double-saut SEC vers le sommet [40,10] (y=320, exactement 256 px = limite).
                  //   Découpe en 2 sauts simples confort. Fruit [1340,272] guide. Tramps 400/4480 très loin.
    ],
    playerStart: { x: 80, y: 480 },
    flag: { x: 4720, y: 520 },
    // Fruits visibles ce niveau : tropicaux jaunes/orange pour le pays de bonbon.
    fruitTypes: ['pineapple', 'orange', 'bananas'],

    // Sections sol niveau 2 :
    //   A : 0    – 448    (tx 0..13, w=14)
    //   B : 576  – 1568   (tx 18..48, w=31)
    //   C : 1760 – 2784   (tx 55..86, w=32)
    //   D : 3040 – 3616   (tx 95..112, w=18)
    //   E : 3872 – 4800   (tx 121..149, w=29)
    // Gaps :
    //   A-B : 448  – 576  = 128 px = 4 tuiles
    //   B-C : 1568 – 1760 = 192 px = 6 tuiles
    //   C-D : 2784 – 3040 = 256 px = 8 tuiles (CLIMAX, falling_platform à x=2912, saw au-dessus)
    //   D-E : 3616 – 3872 = 256 px = 8 tuiles (CLIMAX bis, falling_platform à x=3744)
    //
    // Patch "moins de piliers, plus larges" + "pas de pilier au-dessus d'un gap" :
    //   - Piliers passés de 21 → 15 (-28,6 %).
    //   - Tous les piliers à tw=4 (uniformisation).
    //   - Anciens piliers [17,8,3,10] et [85,11,3,7] (mass dans gaps A-B / C-D) repassés en th=1.
    //   - Suppressions : [9,9,2,9] (overlap [7,11]), [22,11,3,7] (relais redondant après élargissement),
    //                    [34,13,3,5] (redescente non-essentielle), [56,11,3,7] suppr ? NON gardé en relais
    //                    sinon [63,9] inatteignable depuis sol C — finalement [108,8,3,10] supprimé à la place.
    //   - Décalages : [46,12,3,6]→[45,12,4,6] pour éviter débordement de masse dans gap B-C ;
    //                 [128,8,3,10]→[127,8,4,10] pour préserver zone box 4240 entre [127,8] et [134,6].
    layout: [
      // --- Sections de sol (ty=18..19) ---
      [0,   18, 14, 2],     // A : 0–448
      [18,  18, 31, 2],     // B : 576–1568
      [55,  18, 32, 2],     // C : 1760–2784
      [95,  18, 18, 2],     // D : 3040–3616
      [121, 18, 29, 2],     // E : 3872–4800

      // --- Piliers intro (section A, escalier ascendant doux) — 3 → 2 piliers ---
      // SUPPRESSION : [9,9,2,9] (recouvrait [7,11] à tx=9, doublon visuel ; tramp 400 suffit comme défi).
      // Patch "chevauchement esthétique" : [3,13] et [7,11] se touchaient (gap=0) → overlap 1 tuile.
      [3,   13, 4, 5],      // x=96..224, pilier ty=13..17, tw=4 (préservé)
      [6,   11, 4, 7],      // x=192..320, pilier ty=11..17, tw=4 (décalé tx=7→6 : overlap 1 tuile avec [3,13])

      // --- Plateforme route haute après gap A-B (cible du trampoline x=400) ---
      // ANCIEN : [17,8,4,1] plateforme fine au-dessus du gap A-B (448-576) → converti en colonne longue
      //   (variante "au-dessus d'un gap" : th = 20 - ty pour descendre jusqu'au bas du viewport).
      //   Cas mixte : x=544..576 dans gap A-B, x=576..672 sur section B (la décoration superpose
      //   la rangée de sol sur la partie B sans impact gameplay).
      [17,  8,  4, 12],     // x=544..672, pilier ty=8..19, hauteur 384 px, descend jusqu'au bas du viewport (cas mixte gap A-B ↔ B)

      // --- Piliers dev (section B) — 5 → 3 piliers (drop [22,11] et [34,13]) ---
      // SUPPRESSION [22,11,3,7] : redondant après élargissement de [17,8,4,1] (le saut [17,8]→[28,9] reste OK).
      // SUPPRESSION [34,13,3,5] : redescente non-essentielle, sol B reste continu.
      [28,  9,  4, 9],      // x=896..1024, pilier ty=9..17, tw=4 (élargi)
      [40,  10, 4, 8],      // x=1280..1408, pilier ty=10..17, tw=4 (inchangé)
      // Patch "chevauchement esthétique" v2 : [40,10] right=44 et [44,12] gap=0 (touche) → corrigé en overlap 1 tuile.
      [43,  12, 4, 6],      // x=1376..1504, pilier ty=12..17, tw=4 (décalé tx=44→43 : overlap 1 tuile réel avec [40,10]). Saw 1280 BB y 244..300 vs top y=384 (marge 84 px ✓, pas d'intersect malgré BB x s'étendant à 1388)

      // --- Piliers dev (section C, montée vers climax) ---
      [56,  11, 4, 7],      // x=1792..1920, pilier ty=11..17, tw=4 (élargi). Relais OBLIGATOIRE (sinon [63,9] sommet hors portée double saut depuis sol C).
      [63,  9,  4, 9],      // x=2016..2144, pilier ty=9..17, tw=4 (élargi)
      [72,  11, 4, 7],      // x=2304..2432, pilier ty=11..17, tw=4 (élargi)
      [80,  8,  4, 10],     // x=2560..2688, pilier ty=8..17, tw=4 (élargi)

      // --- Pilier sortie C avant gap climax ---
      // ANCIEN : [85,11,4,1] plateforme fine au-dessus du gap C-D → puis [84,11,4,9] cas mixte (gap=0 avec [80,8])
      //   → patch v2 chevauchement esthétique : décalé à [83,11] pour overlap 1 tuile RÉEL avec [80,8].
      //   Le pilier repasse alors entièrement sur section C (right=2784 = bord C right), th repassé à 7
      //   (convention "au-dessus d'un sol" : th = 18 - ty). La saw 2912 reste nettement au-dessus du sommet.
      // Patch "chevauchement esthétique" v2 : [80,8] right=84 et [84,11] gap=0 (touche) → corrigé en overlap 1 tuile.
      // ANCIEN [84,11,4,9] (th=9, cas mixte gap C-D) → après décalage tx=84→83, le pilier est entièrement
      //   sur section C (tx 83..86, x 2656..2784, right=2784=bord C). th repassé à 7 (convention sol : th=18-ty).
      [83,  11, 4, 7],      // x=2656..2784, pilier ty=11..17, tw=4 (décalé tx=84→83 : overlap 1 tuile réel avec [80,8] ; th 9→7 car repasse en sol). Saw 2912 BB y 276..332 vs sommet y=352 : marge 20 px ✓. Saw BB x ∈ [2764,3060] vs pillar x ∈ [2656,2784] : intersect x [2764,2784]=20px mais sommet y=352 > BB y=332 ✓

      // --- Pilier climax (section D — [97,5] très haut, route SOUS la saw 2912) ---
      // SUPPRESSION [108,8,3,10] : [97,5,4,13] sert de pilier dominant section D, descente directe vers sol D fine.
      [97,  5,  4, 13],     // x=3104..3232, pilier ty=5..17, tw=4 (inchangé)

      // --- Piliers respiration / route flag (section E) ---
      // Patch "chevauchement esthétique" v2 : [122,10] right=126 et [126,8] gap=0 (touche) → corrigé en overlap 1 tuile.
      [122, 10, 4, 8],      // x=3904..4032, pilier ty=10..17, tw=4 (préservé)
      [125, 8,  4, 10],     // x=4000..4128, pilier ty=8..17, tw=4 (décalé tx=126→125 : overlap 1 tuile réel avec [122,10]). Zone box 4240 préservée : right=4128 vs box BB left=4212 → marge 84 px ✓
      [134, 6,  4, 12],     // x=4288..4416, pilier ty=6..17, tw=4 (inchangé). Gap [125,8] right=4128 → [134,6] left=4288 = 5 tuiles ✓

      // --- Pilier route haute finale (cible du trampoline x=4480, offset 2 tuiles) ---
      [144, 7,  4, 11],     // x=4608..4736, pilier ty=7..17, tw=4 (inchangé)

      // --- Pilier SECRET (ty=3, hors cône du tramp 4480) ---
      [142, 3,  4, 15],     // x=4544..4672, pilier ty=3..17, tw=4 (inchangé)
    ],

    // Fruits structurés par phase. Total = 24 (relocations sur piliers supprimés).
    fruitPositions: [
      // --- Intro (0 – 700) : 5 fruits ---
      [144, 368],   // au-dessus pilier [3,13,4,5]
      [240, 304],   // au-dessus pilier [6,11,4,7] (fruit suit décalage -32 px après imbrication)
      [400, 240],   // RELOCATED (ex-[9,9] supprimé) : fruit guide tramp 400, atteignable au bounce
      [592, 208],   // au-dessus plateforme [17,8,4,1] (route haute après tramp 400)
      [700, 480],   // sol B entrée

      // --- Développement (700 – 1900) : 7 fruits ---
      [780,  432],  // RELOCATED (ex-[22,11] supprimé) : breadcrumb mid-air entre [17,8,4,1] et [28,9]
      [944,  240],  // au-dessus pilier [28,9,4,9] (route haute B)
      [1100, 480],  // sol, juste avant les spikes (signal préservé)
      [1200, 432],  // RELOCATED (ex-[34,13] supprimé) : breadcrumb mid-air entre [28,9] et [40,10]
      [1340, 272],  // au-dessus pilier [40,10,4,8] (route haute saw vitrine)
      [1424, 320],  // au-dessus pilier [43,12,4,6] (fruit suit décalage -32 px supplémentaire après correction v2 imbrication réelle avec [40,10])
      [1840, 304],  // au-dessus pilier [56,11,4,7]

      // --- Climax (1900 – 3300) : 6 fruits, dont route haute exclusive ---
      [2064, 240],  // au-dessus pilier [63,9,4,9] (route haute)
      [2200, 320],  // box signal au-dessus du fire 2200 (zone libre entre piliers)
      [2350, 304],  // au-dessus pilier [72,11,4,7] (après fires)
      [2608, 208],  // au-dessus pilier [80,8,4,10] (route haute climax)
      [2704, 304],  // au-dessus pilier [83,11,4,7] (fruit suit décalage -32 px supplémentaire après correction v2 imbrication réelle avec [80,8])
      [3160, 128],  // au-dessus pilier [97,5,4,13] (route haute climax premium)

      // --- Respiration / flag (3300 – 4800) : 6 fruits ---
      [3400, 432],  // RELOCATED (ex-[108,8] supprimé) : sol D breadcrumb, route safe après climax
      [3952, 272],  // au-dessus pilier [122,10,4,8]
      [4080, 208],  // au-dessus pilier [125,8,4,10] (fruit suit décalage -32 px supplémentaire après correction v2 imbrication réelle avec [122,10])
      [4360, 160],  // au-dessus pilier [134,6,4,12], route haute
      [4660, 192],  // au-dessus pilier [144,7,4,11] route haute finale
      [4608, 64],   // SECRET sur pilier [142,3,4,15]
    ],

    // Trampolines (x, y=548).
    //   400  → section A. Cône x±16=384..416 ; [6,11,4,7] right=320 (marge BB 52 ✓ après imbrication), [17,8,4,12] left=544 (marge 116 ✓).
    //   4480 → section E. Cône x±16=4464..4496 ; [134,6,4,12] right=4416 (marge BB 36 ✓), [142,3,4,15] left=4544 (marge 36 ✓).
    trampolines: [
      { x: 400,  y: 548 },
      { x: 4480, y: 548 },
    ],

    // Spikes : 3 groupes au sol + 2 pièges sur sommets de piliers (intro douce de la mécanique "sommet piégé").
    //   Triplet 1 (section B early) : zone libre 576..896 entre bord B left et pilier [28,9] left.
    //     Triplet (608, 640, 672) préservé.
    //   Triplet 2 (section B late) : zone libre 1024..1280 entre [28,9] right et [40,10] left (256 px).
    //     Triplet (1100, 1132, 1164) : spike BB left 1084 vs [28,9] right=1024 (marge 60 ✓),
    //     spike BB right 1180 vs [40,10] left=1280 (marge 100 ✓).
    //   Doublet 3 (section C) : zone libre 1920..2016 entre [56,11] right et [63,9] left (96 px).
    //     Doublet (1952, 1984) : spike BB left 1936 vs [56,11] right=1920 (marge 16 ✓),
    //     spike BB right 2000 vs [63,9] left=2016 (marge 16 ✓). Pré-signal de la zone fires 2200/2260.
    //   Spike sommet 1 : piège sur sommet pilier [56,11,4,7] (dev section C).
    //     Formule sommet : y = 11*32 - 16 = 336. Sommet x=1792..1920, spike x=1872 BB x 1856..1888 (centré).
    //     Fruit [1840, 304] : sep y=16 px ✓, sep x=32 px ✓. Skip path : pilier [63,9] adjacent (clean) ou sol C en dessous.
    //   Spike sommet 2 : piège sur sommet pilier [125,8,4,10] (route haute respiration E).
    //     Formule sommet : y = 8*32 - 16 = 240. Sommet x=4000..4128, spike x=4112 BB x 4096..4128 (droite du sommet).
    //     Fruit [4080, 208] : sep y=16 px ✓, sep x=32 px ✓. Skip path : pilier [122,10] adjacent (clean), pilier
    //     [134,6] plus loin, ou sol E (3872-4800) en dessous.
    spikes: [
      // Triplet section B early — zone libre 576..896 (préservé)
      { x: 608, y: 560 }, { x: 640, y: 560 }, { x: 672, y: 560 },
      // Triplet section B late — zone libre 1024..1280 entre [28,9] et [40,10]
      { x: 1100, y: 560 }, { x: 1132, y: 560 }, { x: 1164, y: 560 },
      // Doublet section C — zone libre 1920..2016 entre [56,11] et [63,9], avant fires 2200/2260
      { x: 1952, y: 560 }, { x: 1984, y: 560 },
      // Piège sur sommet de [56,11,4,7] — y = 11*32 - 16 = 336 (dev C, intro mécanique sommet piégé)
      { x: 1872, y: 336 },
      // Piège sur sommet de [125,8,4,10] — y = 8*32 - 16 = 240 (respiration E, route haute piégée)
      { x: 4112, y: 240 },
    ],

    // Boxes : 2 boîtes box2 en l'air.
    //   Box 2200 : zone libre [63,9,4,9] right=2144 → [72,11,4,7] left=2304 (160 px). Marges 28+ px ✓.
    //   Box 4240 : zone libre [126,8,4,10] right=4160 → [134,6,4,12] left=4288 (128 px). Marges 52+20 px ✓.
    boxes: [
      { x: 2200, y: 380, type: 'box2' },   // section C, zone libre entre [63,9,4,9] et [72,11,4,7]
      { x: 4240, y: 380, type: 'box2' },   // section E, zone libre entre [126,8,4,10] et [134,6,4,12]
    ],

    // Fires : 2 fires en phase opposée au climax (section C).
    //   Position préservée — fire BB hors masse des piliers (zone libre 2144..2304 entre [63,9,4,9] et [72,11,4,7]).
    fires: [
      { x: 2200, y: 544, period: 2000, phase: 0   },
      { x: 2260, y: 544, period: 2000, phase: 0.5 },
    ],

    // Saws : 2 saws.
    //   1) "vitrine" section B — y remontée 288→272 pour marge ≥16 px avec [40,10,4,8] sommet (y=320).
    //   2) "climax" gap C-D — y remontée 320→304 pour marge ≥16 px avec [84,11,4,9] sommet (y=352).
    saws: [
      { x: 1280, y: 272, range: 80,  speed: 80  },   // BB y 244..300 vs [40,10] top y=320 (marge 20 ✓). BB x [1172,1388] vs [44,12,4,6] left=1408 → marge 20 ✓
      { x: 2912, y: 304, range: 120, speed: 160 },   // BB y 276..332 vs [84,11,4,9] top y=352 (marge 20 ✓). BB x [2764,3060] vs pilier x [2688,2816] : pas d'intersect en y ✓
    ],

    // FallingPlatforms : 2 plateformes-relais, chacune au CENTRE d'un gap de 8 tuiles.
    fallingPlatforms: [
      { x: 2912, y: 560, delay: 400 },   // gap C-D, sous la saw
      { x: 3744, y: 560, delay: 400 },   // gap D-E
    ],

    next: 3,
  },

  3: {
    name: 'Niveau 3 — Cavernes oubliées',
    bgKey: 'bg_gray',
    bgColor: '#3a3a44',
    tiles: {
      topLeft:  0, top:   1, topRight:  2,
      midLeft: 22, midMid: 23, midRight: 24,
    },
    worldWidth: 5120,
    playerStart: { x: 80, y: 480 },
    flag: { x: 5040, y: 520 },
    // Fruits visibles ce niveau : verts qui ressortent sur la grotte grise.
    fruitTypes: ['kiwi', 'melon', 'apple'],

    // Sections sol niveau 3 :
    //   A : 0    – 416    (tx 0..12, w=13)
    //   B : 512  – 1280   (tx 16..39, w=24)
    //   C : 1472 – 1856   (tx 46..57, w=12)
    //   D : 2048 – 2912   (tx 64..90, w=27)    ← couloir de fires (réduit à 2 post-pilier)
    //   E : 3168 – 3744   (tx 99..116, w=18)
    //   F : 4032 – 4192   (tx 126..130, w=5)
    //   G : 4480 – 4768   (tx 140..148, w=9)
    //   H : 4992 – 5120   (tx 156..159, w=4)
    // Gaps :
    //   A-B : 416 – 512  = 96 px  = 3 tuiles
    //   B-C : 1280 – 1472 = 192 px = 6 tuiles
    //   C-D : 1856 – 2048 = 192 px = 6 tuiles
    //   D-E : 2912 – 3168 = 256 px = 8 tuiles (CLIMAX, falling 3040)
    //   E-F : 3744 – 4032 = 288 px = 9 tuiles (CLIMAX, 2 fallings 3840 + 3936)
    //   F-G : 4192 – 4480 = 288 px = 9 tuiles (fallings 4288 + 4384)
    //   G-H : 4768 – 4992 = 224 px = 7 tuiles
    layout: [
      // --- Sections de sol (ty=18..19) ---
      [0,   18, 13, 2],     // A : 0–416
      [16,  18, 24, 2],     // B : 512–1280
      [46,  18, 12, 2],     // C : 1472–1856
      [64,  18, 27, 2],     // D : 2048–2912
      [99,  18, 18, 2],     // E : 3168–3744
      [126, 18, 5,  2],     // F : 4032–4192
      [140, 18, 9,  2],     // G : 4480–4768
      [156, 18, 4,  2],     // H : 4992–5120

      // --- Plateformes intro (section A → B) ---
      // Tailles variées pour casser la monotonie du début + pièges sur les grandes.
      [3, 12, 2, 1],      // x=96..160, plateforme étroite (tw=2 précision) ty=12
      [6, 10, 5, 1],      // x=192..352, GRANDE plateforme (tw=5) ty=10 — porte spike sommet
      [17, 11, 3, 1],      // x=544..640, plateforme normale (tw=3) ty=11 (après gap A-B)

      // --- Plateforme route haute B (cible du trampoline 384) ---
      [21, 8, 2, 1],     // x=672..736, plateforme étroite (tw=2 précision) ty=8 (fruits premium)

      // --- Plateformes dev (section B) ---
      [25, 10, 4, 1],      // x=800..928, plateforme moyenne (tw=4) ty=10
      [30, 12, 5, 1],      // x=960..1120, GRANDE plateforme (tw=5) ty=12 — porte fire sommet
      [35, 9, 3, 1],      // x=1120..1216, plateforme normale (tw=3) ty=9 (route haute, sous saw vitrine)

      // --- Piliers section C ---
      [49, 11, 3, 1],      // x=1568..1664, pilier ty=11..17
      [54, 8, 3, 1],     // x=1728..1824, pilier ty=8..17 (route haute)

      // --- Piliers couloir de feu (section D) ---
      [66, 11, 3, 1],      // x=2112..2208, pilier ty=11..17 (entrée D)
      [70, 8, 3, 1],     // x=2240..2336, pilier ty=8..17 (route haute "skip fires")
      [76, 10, 3, 1],      // x=2432..2528, pilier ty=10..17 (après fires)
      [83, 7, 4, 1],     // x=2656..2784, pilier ty=7..17 (route haute D, premium)
      [88, 10, 3, 1],      // x=2816..2912, pilier ty=10..17 (sortie D)

      // --- Piliers climax (section E) ---
      [101, 12, 3, 1],      // x=3232..3328, pilier ty=12..17 (atterrissage après falling 3040)
      [108, 8, 4, 1],     // x=3456..3584, pilier ty=8..17 (route haute SOUS saw climax)

      // --- Pilier relais fallings (section F étroite) ---
      [126, 11, 3, 1],      // x=4032..4128, pilier ty=11..17

      // --- Piliers respiration (section G → H) ---
      [141, 12, 3, 1],      // x=4512..4608, pilier ty=12..17 (après falling 4384)
      [146, 9, 3, 1],      // x=4672..4768, pilier ty=9..17 (cible avant tramp)

      // --- Pilier route haute finale (cible du trampoline 4640) ---
      [154, 7, 4, 1],     // x=4928..5056, pilier ty=7..17 (route flag haute)

      // --- Pilier SECRET (ty=3) ---
      [152, 3, 4, 1],     // x=4864..4992, pilier ty=3..17 (15 tuiles, secret tendu)
    ],

    // Fruits structurés par phase. Total = 24 fruits.
    fruitPositions: [
      // --- Intro (0 – 1280) : 5 fruits ---
      [128, 336],   // au-dessus plateforme [3,12,2] (recentré sur la nouvelle largeur tw=2, span x=96..160)
      [240, 272],   // au-dessus plateforme [6,10,5] côté gauche (évite spike sommet x=304, sep x=64 ✓)
      [592, 304],   // au-dessus pilier [17,11]
      [704, 208],   // au-dessus plateforme [21,8,2] (recentré sur la nouvelle largeur tw=2, span x=672..736)
      [1180, 240],  // au-dessus pilier [35,9] route haute B

      // --- Développement (1280 – 2048) : 4 fruits ---
      [1616, 304],  // au-dessus pilier [49,11]
      [1696, 480],  // sol C (déplacé de 1800 — l'ancien était DANS pilier [54,8]). Marges ≥16 aux piliers voisins.
      [1776, 208],  // au-dessus pilier [54,8] route haute C
      [2080, 480],  // sol D, entrée du couloir de feu (signal)

      // --- Climax (2048 – 4480) : 10 fruits ---
      [2160, 304],  // au-dessus pilier [66,11], avant fires
      [2288, 208],  // au-dessus pilier [70,8] route haute (au-dessus fires)
      [2480, 272],  // au-dessus pilier [76,10]
      [2720, 176],  // au-dessus pilier [83,7] route haute climax (premium)
      [2864, 272],  // au-dessus pilier [88,10] sortie D
      [3040, 460],  // sur la falling 3040
      [3280, 336],  // au-dessus pilier [101,12]
      [3552, 80],   // RELOCATED (ex-[3520, 240]) : déplacé hors de BB du fire-sommet ajouté sur [108,8] (BB y 192..256), au-dessus de saw 3360 BB y top=148. Sep saw BB right x=3516 → fruit x=3552 = 36 px ✓, sep saw BB y 148 → fruit y=80 = 68 px ✓.
      [4064, 304],  // au-dessus pilier [126,11] section F
      [4288, 460],  // sur la falling 4288

      // --- Respiration / flag (4480 – 5120) : 5 fruits + 1 secret ---
      [4560, 336],  // au-dessus pilier [141,12]
      [4720, 240],  // au-dessus pilier [146,9]
      [5024, 176],  // au-dessus pilier [154,7] route haute finale (déplacé de 4992 — l'ancien touchait bord droit pilier [152,3])
      [5040, 432],  // sol H, juste avant le flag (route safe)
      [4960, 96],   // SECRET au-dessus pilier [152,3]
    ],

    // Trampolines (x, y=548).
    //   384  → section A, propulse vers pilier [21,8] B.
    //   4640 → section G. Position préservée — marges 32 px aux piliers voisins (cône libre).
    trampolines: [
      { x: 384,  y: 548 },
      { x: 4640, y: 548 },
    ],

    // Spikes : 3 groupes au sol + 3 pièges sur sommets de plateformes.
    //   Doublet B (sol) : ancien (1024, 1056). Déplacé en zone 1056..1120. ATTENTION : la nouvelle [30,12,5,1]
    //     s'étend jusqu'à x=1120 mais sommet à y=384 vs spikes au sol y=560 → sep y=176 px ✓, pas de conflit.
    //   Doublet C (ex-triplet) : ancien (1600, 1632, 1664) DANS pilier [49,11]. Réduit à doublet en zone 1664..1728.
    //   Triplet D (sol) : (2560, 2592, 2624) préservé en zone libre 2528..2656 entre piliers [76,10] et [83,7].
    //   Spike sommet INTRO : piège sur sommet plateforme [6,10,5,1] (variation taille — grande = piégée).
    //     Formule sommet : y = 10*32 - 16 = 304. Sommet x=192..352, spike x=304 BB x 288..320 (centre-droite).
    //     Fruit [240, 272] guide vers landing safe à gauche (sep x=64 px, sep y=32 px ✓).
    //     Marges : trampoline 384 BB left=356 → sep x=36 px ✓. Plateforme [3,12,2,1] right=160 → sep x=128 px ✓.
    //     Skip path : sol A (clean, sans spike avant gap A-B).
    //   Spike sommet 1 : piège sur sommet pilier [70,8,3,1] (route haute "skip fires" empoisonnée).
    //     Formule sommet : y = 8*32 - 16 = 240. Sommet x=2240..2336, spike x=2320 BB x 2304..2336 (droite).
    //     Fruit [2288, 208] : sep y=16 px ✓, sep x=32 px ✓. Skip path : sol D + traverser les fires
    //     2368/2400 au sol, OU pilier [66,11] adjacent (clean) puis [76,10] pour bypass.
    //   Spike sommet 2 : piège sur sommet pilier [88,10,3,1] (sortie D booby-trapped).
    //     Formule sommet : y = 10*32 - 16 = 304. Sommet x=2816..2912, spike x=2832 BB x 2816..2848 (gauche).
    //     Fruit [2864, 272] : sep y=16 px ✓, sep x=32 px ✓. Skip path : pilier [83,7,4,1] route haute D premium
    //     (clean, déjà la route alt), ou drop au sol D et marcher vers gap D-E.
    spikes: [
      // Doublet section B — zone libre entre [30,12,5] right=1120 et [35,9] left=1120 (au sol sous le toucher)
      { x: 1072, y: 560 }, { x: 1104, y: 560 },
      // Doublet section C — zone libre entre piliers [49,11] right=1664 et [54,8] left=1728
      { x: 1680, y: 560 }, { x: 1712, y: 560 },
      // Triplet climax section D — zone libre entre [76,10] right=2528 et [83,7] left=2656 (marges 16 px ✓)
      { x: 2560, y: 560 }, { x: 2592, y: 560 }, { x: 2624, y: 560 },
      // Piège sur sommet de [6,10,5,1] — y = 10*32 - 16 = 304 (grande plateforme intro empoisonnée)
      { x: 304, y: 304 },
      // Piège sur sommet de [70,8,3,1] — y = 8*32 - 16 = 240 (route haute "skip fires" empoisonnée)
      { x: 2320, y: 240 },
      // Piège sur sommet de [88,10,3,1] — y = 10*32 - 16 = 304 (sortie D booby-trapped)
      { x: 2832, y: 304 },
    ],

    // Boxes : 2 boxes en l'air.
    //   Patch pilier : box [2272,400] DANS pilier [70,8]. Déplacée → 2384 (zone libre 2336..2432, marges 20 px ✓).
    boxes: [
      { x: 2384, y: 400, type: 'box3' },   // section D, déplacée du pilier [70,8] vers zone libre post-pilier
      { x: 4544, y: 240, type: 'box3' },   // section G : monté à y=240 (était y=336, inaccessible — bottom 360 dans le corps du joueur posé sur la plateforme [141,12]). Atteignable en saut simple depuis le sommet de [141,12].
    ],

    // Fires : 7 fires au sol + 2 pièges fire sur sommet de plateforme.
    //   Sol : intro B (928), section B late (1248), transition C (1504), couloir D paire (2368, 2400),
    //         section E (3392), section F (4160). Voir analyses préservées ci-dessous.
    //   Aucun fire en section A (cône tramp 384 BB ±28 occupe x 356..412, conflit avec fire BB ±12).
    //   Aucun fire en section G (tramp 4640 occupe la seule zone libre entre piliers).
    //   Fire sommet INTRO : piège sur sommet [30,12,5,1] (grande plateforme dev empoisonnée).
    //     Formule sommet : y = 12*32 - 32 = 352. Sommet x=960..1120, fire x=1056 BB x 1044..1068, y 320..384.
    //     Marges : [25,10,4,1] right=928 → sep x=116 px ✓. [35,9,3,1] left=1120 → sep x=52 px ✓.
    //     Saw 1140 BB y 148..220 vs fire BB y top=320 → sep y=100 px ✓. Spikes sol 1072/1104 y=560 → sep y=176 px ✓.
    //     Skip path : sol B (mais avec spikes 1072/1104), ou pilier [25,10,4] puis [35,9,3] en double-saut.
    //   Fire sommet CLIMAX : piège sur sommet pilier [108,8,4,1] (route haute SOUS saw climax = triple combo).
    //     Formule sommet : y = 8*32 - 32 = 224. Sommet x=3456..3584, fire x=3544 BB x 3532..3556.
    //     Vérif saw 3360 range=128 BB x 3204..3516, BB y 148..204 :
    //       - fire BB x 3532..3556 vs saw BB right=3516 → sep x = 16 px ✓ (saw n'atteint pas le fire).
    //       - fire BB y 192..256 vs saw BB y 148..204 → overlap théorique 192..204 (12 px) mais sep x=16 ✓ évite le visual artifact.
    //     Fruit relocated [3520, 240] → [3552, 80] (hors BB fire et BB saw). Skip path : sol D+E,
    //     traverser sous saw via timing (route existante), ou utiliser falling 3040 pour rejoindre sol E
    //     et marcher droit vers section F (le fire-sommet est sur route HAUTE optionnelle).
    fires: [
      // Intro section B — préservé entre piliers [25,10,4] right=928 et [30,12,5] left=960, marges 20 px ✓
      { x: 928,  y: 544, period: 2200, phase: 0    },
      // Section B late — zone libre 1216..1280 entre [35,9] et bord B right
      { x: 1248, y: 544, period: 2200, phase: 0.5  },
      // Transition section C — préservé entre bord C left=1472 et pilier [49,11] left=1568, marges 20 px ✓
      { x: 1504, y: 544, period: 2200, phase: 0.5  },
      // Couloir section D — paire phases décalées en zone libre 2336..2432 entre [70,8] et [76,10]
      { x: 2368, y: 544, period: 2000, phase: 0    },
      { x: 2400, y: 544, period: 2000, phase: 0.5  },
      // Section E (post-falling 3040) — zone libre 3328..3456 entre [101,12] et [108,8]
      { x: 3392, y: 544, period: 1800, phase: 0.25 },
      // Section F (pré-fallings F-G) — zone libre 4128..4192 entre [126,11] et bord F right
      { x: 4160, y: 544, period: 1800, phase: 0.75 },
      // Piège sur sommet de [30,12,5,1] — y = 12*32 - 32 = 352 (grande plateforme dev empoisonnée)
      { x: 1056, y: 352, period: 2000, phase: 0 },
      // Piège sur sommet de [108,8,4,1] — y = 8*32 - 32 = 224 (climax route haute SOUS saw, triple combo)
      { x: 3544, y: 224, period: 2000, phase: 0.5 },
    ],

    // Saws : 2 saws — positions préservées (y au-dessus des sommets des piliers, no y overlap).
    saws: [
      { x: 1140, y: 192, range: 80,  speed: 80  },   // vitrine, BB y 164..220 vs piliers tops y=288+ (marge ≥68 ✓)
      { x: 3360, y: 176, range: 128, speed: 160 },   // climax, BB y 148..204 vs piliers tops y=256+ (marge ≥52 ✓)
    ],

    // FallingPlatforms : 5 plateformes relais dans les gaps climax.
    fallingPlatforms: [
      { x: 3040, y: 560, delay: 500 },   // gap D-E
      { x: 3840, y: 560, delay: 400 },   // gap E-F
      { x: 3936, y: 560, delay: 400 },   // gap E-F
      { x: 4288, y: 560, delay: 400 },   // gap F-G
      { x: 4384, y: 560, delay: 400 },   // gap F-G
    ],

    next: 4,
  },

  4: {
    name: 'Niveau 4 — Forteresse maudite',
    bgKey: 'bg_brown',
    bgColor: '#2a1e16',
    tiles: {
      // Kit "brique rouge donjon" : cols 17-19 rows 4-5 (mortier noir, briques rouges).
      // TL=(17,4)=105, T=(18,4)=106, TR=(19,4)=107, ML=(17,5)=127, MC=(18,5)=128, MR=(19,5)=129.
      topLeft: 105, top:   106, topRight: 107,
      midLeft: 127, midMid: 128, midRight: 129,
    },
    worldWidth: 5280,
    playerStart: { x: 80, y: 480 },
    flag: { x: 5200, y: 520 },
    // Fruits visibles ce niveau : rouges/jaunes intenses sur le donjon brun.
    fruitTypes: ['strawberry', 'cherries', 'bananas'],

    // Sections sol niveau 4 (boss-niveau : intro HOSTILE dès section B, climax 52%, 3 vagues D/F/G) :
    //   A : 0    – 320    (tx 0..9,   w=10)   ← intro safe (spawn x=80), tramp 288 vers [14,8]
    //   B : 416  – 1120   (tx 13..34, w=22)   ← INTRO HOSTILE : 2 spikes sol + 1 fire sol + 2 spikes sommets + 1 fire sommet + saw aérienne au-dessus début
    //   C : 1248 – 1920   (tx 39..59, w=21)
    //   D : 2048 – 2624   (tx 64..81, w=18)    ← vague 1
    //   E : 2848 – 3072   (tx 89..95, w=7)
    //   F : 3296 – 3776   (tx 103..117, w=15)  ← vague 2
    //   G : 3936 – 4480   (tx 123..139, w=17)  ← vague 3
    //   H : 4672 – 4928   (tx 146..153, w=8)
    //   I : 5024 – 5280   (tx 157..164, w=8, sous le flag)
    // Gaps :
    //   A-B : 320 – 416  = 96 px  = 3 tuiles
    //   B-C : 1120 – 1248 = 128 px = 4 tuiles
    //   C-D : 1920 – 2048 = 128 px = 4 tuiles
    //   D-E : 2624 – 2848 = 224 px = 7 tuiles (CLIMAX — fallings 2720 + 2816)
    //   E-F : 3072 – 3296 = 224 px = 7 tuiles (CLIMAX — falling 3184)
    //   F-G : 3776 – 3936 = 160 px = 5 tuiles
    //   G-H : 4480 – 4672 = 192 px = 6 tuiles (CLIMAX bis — falling 4576)
    //   H-I : 4928 – 5024 = 96 px  = 3 tuiles (respiration finale)
    layout: [
      // --- Sections de sol (ty=18..19) ---
      [0,   18, 10, 2],     // A : 0–320
      [13,  18, 22, 2],     // B : 416–1120
      [39,  18, 21, 2],     // C : 1248–1920
      [64,  18, 18, 2],     // D : 2048–2624
      [89,  18, 7,  2],     // E : 2848–3072
      [103, 18, 15, 2],     // F : 3296–3776
      [123, 18, 17, 2],     // G : 3936–4480
      [146, 18, 8,  2],     // H : 4672–4928
      [157, 18, 8,  2],     // I : 5024–5280 (sous le flag)

      // --- Piliers intro (section A) ---
      [2, 12, 3, 1],      // x=64..160, pilier ty=12..17
      [5, 11, 3, 1],      // x=160..256, pilier ty=11..17

      // --- Pilier route haute après gap A-B ---
      [14, 8, 3, 1],     // x=448..544, pilier ty=8..17 (cible du tramp 288)

      // --- Piliers dev (section B) ---
      [19, 11, 3, 1],      // x=608..704, pilier ty=11..17
      [24, 9, 3, 1],      // x=768..864, pilier ty=9..17
      [29, 9, 3, 1],      // x=928..1024, pilier ty=9..17
      [33, 7, 3, 1],     // x=1056..1152, pilier ty=7..17 (route haute fin B)

      // --- Piliers section C ---
      [40, 9, 3, 1],      // x=1280..1376, pilier ty=9..17
      [46, 7, 3, 1],     // x=1472..1568, pilier ty=7..17 (route haute C)
      [52, 9, 3, 1],      // x=1664..1760, pilier ty=9..17
      [56, 11, 3, 1],      // x=1792..1888, pilier ty=11..17 (sortie C)

      // --- Piliers climax vague 1 (section D) ---
      [65, 9, 3, 1],      // x=2080..2176, pilier ty=9..17 (entrée D)
      [69, 5, 3, 1],     // x=2208..2304, pilier ty=5..17 (13 tuiles, ROUTE HAUTE D premium)
      [75, 9, 3, 1],      // x=2400..2496, pilier ty=9..17
      [79, 6, 3, 1],     // x=2528..2624, pilier ty=6..17 (sortie D haute)

      // --- Pilier climax (section E îlot étroit) ---
      [89, 9, 3, 1],      // x=2848..2944, pilier ty=9..17

      // --- Piliers climax vague 2 (section F) ---
      [104, 8, 3, 1],     // x=3328..3424, pilier ty=8..17 (entrée F)
      [109, 6, 3, 1],     // x=3488..3584, pilier ty=6..17 (route haute F)
      [114, 8, 3, 1],     // x=3648..3744, pilier ty=8..17 (sortie F)

      // --- Piliers climax vague 3 (section G) ---
      [124, 9, 3, 1],      // x=3968..4064, pilier ty=9..17 (entrée G)
      [129, 7, 3, 1],     // x=4128..4224, pilier ty=7..17 (route haute G)
      [135, 9, 3, 1],      // x=4320..4416, pilier ty=9..17 (atterrissage post-saw)

      // --- Piliers respiration (section H) ---
      [146, 12, 2, 1],      // x=4672..4736, pilier ty=12..17 (2 tuiles large)
      [151, 9, 3, 1],      // x=4832..4928, pilier ty=9..17 (cible avant tramp)

      // --- Pilier route haute finale (cible du tramp 4768) ---
      [158, 6, 4, 1],     // x=5056..5184, pilier ty=6..17

      // --- Pilier SECRET (ty=3) ---
      [157, 3, 3, 1],     // x=5024..5120, pilier ty=3..17 (15 tuiles, secret donjon ultime)
    ],

    // Fruits structurés par phase. Total = 22 fruits (réduction de 27 → 22, dans la fourchette 21-23 ciblée) :
    //   - 2 breadcrumbs intro/dev retirés sous les nouveaux pièges sommet ([976,240] et [1104,176])
    //   - 2 fruits "récompenses gratuites" retirés ([1320,240], [2440,240])
    //   - 1 breadcrumb sortie G retiré ([4368,240]).
    fruitPositions: [
      // --- Intro (0 – 1120) : 5 fruits (was 6, -1 sous fire sommet [29,9]) ---
      [112, 336],   // au-dessus pilier [2,12]
      [240, 304],   // au-dessus pilier [5,11]
      [496, 208],   // au-dessus pilier [14,8] (route haute B après tramp 288)
      [656, 304],   // au-dessus pilier [19,11] — fruit GARDÉ malgré spike sommet x=624 (sep y=32, sep x=18, route haute risquée assumée)
      [816, 240],   // au-dessus pilier [24,9]
      // [976, 240] SUPPRIMÉ : la position passait sous le nouveau fire sommet [29,9].
      // [1104, 176] SUPPRIMÉ : la position passait sous le nouveau spike sommet [33,7] x=1088.

      // --- Développement (1120 – 2048) : 4 fruits (was 5, -1 récompense gratuite) ---
      // [1320, 240] SUPPRIMÉ : breadcrumb sol facile, redondant avec autres fruits sol C.
      [1520, 176],  // au-dessus pilier [46,7] route haute C
      [1612, 480],  // sol C (déplacé de 1700 — l'ancien était DANS pilier [52,9]). Zone libre 1568..1664.
      [1840, 304],  // au-dessus pilier [56,11] sortie C

      // --- Climax (2048 – 4672) : 9 fruits (was 11, -2 redondants D et G) ---
      [2096, 240],  // RELOCATED (ex-[2128, 240]) : décalé -32 px en x pour libérer zone du spike-sommet ajouté sur [65,9] à x=2160 (BB x 2144..2176). Sep x = 48 px ✓.
      [2256, 96],   // au-dessus pilier [69,5] ROUTE HAUTE PREMIUM
      // [2440, 240] SUPPRIMÉ : breadcrumb intermédiaire vague 1 D, redondant avec [2096,240] et [2256,96].
      [2576, 144],  // au-dessus pilier [79,6] sortie D
      [2720, 460],  // SUR la falling 2720
      [2896, 240],  // au-dessus pilier [89,9] îlot E
      [3376, 80],   // RELOCATED (ex-[3376, 208]) : remonté hors BB du fire-sommet ajouté sur [104,8] (BB y 192..256). Au-dessus de saw 3520 BB y top=116 → sep y = 36 px ✓.
      [3536, 80],   // au-dessus pilier [109,6] route haute F
      [3696, 208],  // au-dessus pilier [114,8] sortie F
      [4176, 80],   // au-dessus pilier [129,7] route SOUS saw climax G
      // [4368, 240] SUPPRIMÉ : breadcrumb sortie G redondant avec [4176, 80] et fruits respiration.

      // --- Respiration / flag (4672 – 5280) : 4 fruits + 1 secret ---
      [4704, 352],  // au-dessus pilier [146,12]
      [4880, 240],  // au-dessus pilier [151,9]
      [5152, 144],  // au-dessus pilier [158,6] route haute finale (déplacé de 5120 — l'ancien touchait bord droit pilier [157,3])
      [5200, 432],  // sol I, juste avant flag (route safe)
      [5072, 96],   // SECRET au-dessus pilier [157,3]
    ],

    // Trampolines (x, y=548).
    //   288  → section A. Marge ≥16 px au cône, BB ±28 a 4 px de marge au pilier [5,11] (toléré, identique à patch playtest).
    //   4768 → section H. BB ±28 a 4 px de marge au pilier [146,12] (toléré, cône ±16 libre).
    trampolines: [
      { x: 288,  y: 548 },
      { x: 4768, y: 548 },
    ],

    // Spikes : 4 spikes intro (2 sol B + 2 sommets piliers intro) + 4 vagues climax au sol (total 10 spikes)
    // + 3 pièges sur sommets de piliers climax (forteresse hostile). Total = 17 spikes.
    //
    // === Pièges intro (boss-niveau : hostilité immédiate dès section A/B) ===
    //   Spike sol B early : x=576, zone libre 544..608 entre [14,8] et [19,11].
    //     BB 560..592, sep [14,8] right=544 → 16 ✓, sep [19,11] left=608 → 16 ✓.
    //     Isolé mais clusterisé avec fire x=736 et spike x=896 voisins (lecture intro hostile).
    //   Spike sol B mid : x=896, zone libre 864..928 entre [24,9] et [29,9].
    //     BB 880..912, sep [24,9] right=864 → 16 ✓, sep [29,9] left=928 → 16 ✓.
    //   Spike sommet intro 1 : piège sur sommet [19,11,3,1] (route haute B early).
    //     Formule sommet : y = 11*32 - 16 = 336. Sommet x=608..704, spike x=624 BB x 608..640.
    //     Fruit [656, 304] GARDÉ : BB fruit ±14 → 642..670, sep x=2 (limite, fruit à droite du spike),
    //     sep y=18 (fruit y=304 BB 290..318 vs spike BB y 320..352) ✓.
    //     Skip path : sol B en dessous (joueur traverse la tige du pilier en niv 4 ? NON, niv 4 = th=1
    //     plateformes minces SOLIDES toutes faces → le pilier [19,11] ici utilise th=1 donc TRAVERSABLE
    //     par le dessous mais bloque les côtés. Confirmé ligne 664). Route safe : skip pilier en marchant
    //     au sol B (608..704 de sol existe sous le pilier).
    //   Spike sommet intro 2 : piège sur sommet [33,7,3,1] (route haute fin B avant gap B-C).
    //     Formule sommet : y = 7*32 - 16 = 208. Sommet x=1056..1152, spike x=1088 BB x 1072..1104.
    //     Sep pilier left=1056 → 16 ✓. Fruit [1104, 176] SUPPRIMÉ (était pile au-dessus).
    //     Saw 1320 BB x 1212..1428 → sep x=108 ✓.
    //     Skip path : sol B sous le pilier (1056..1120 partie de sol B), ou route basse traverse gap B-C
    //     via simple saut (128 px = 4 tuiles).
    //
    // === Pièges climax (positions inchangées) ===
    //   Vague 1 D : zone libre 2304..2400 entre [69,5] et [75,9].
    //   Vague 1 bis E : SUPPRIMÉE (zone E trop occupée par pilier [89,9] + box déplacée vers section E).
    //   Vague 2 bis F (entrée) : zone 3424..3488 entre [104,8] et [109,6].
    //   Vague 2 F : doublet zone 3584..3648 entre [109,6] et [114,8].
    //   Vague 3 G : zone 4224..4320 entre [129,7] et [135,9].
    //   Spike sommet 1 (climax) : piège sur sommet [65,9,3,1] (entrée D, force commit forward).
    //     Formule sommet : y = 9*32 - 16 = 272. Sommet x=2080..2176, spike x=2160 BB x 2144..2176 (droite).
    //   Spike sommet 2 (climax) : piège sur sommet [79,6,3,1] (sortie D haute).
    //     Formule sommet : y = 6*32 - 16 = 176. Sommet x=2528..2624, spike x=2608 BB x 2592..2624 (droite).
    //   Spike sommet 3 (climax) : piège sur sommet [129,7,3,1] (route SOUS saw G = double combo).
    //     Formule sommet : y = 7*32 - 16 = 208. Sommet x=4128..4224, spike x=4176 BB x 4160..4192.
    spikes: [
      // --- Intro hostile (section B) ---
      // Spike sol B early — zone libre 544..608 (entre [14,8] et [19,11])
      { x: 576, y: 560 },
      // Spike sol B mid — zone libre 864..928 (entre [24,9] et [29,9])
      { x: 896, y: 560 },
      // Piège sur sommet de [19,11,3,1] — y = 11*32 - 16 = 336 (route haute B early)
      { x: 624, y: 336 },
      // Piège sur sommet de [33,7,3,1] — y = 7*32 - 16 = 208 (route haute fin B avant gap B-C)
      { x: 1088, y: 208 },

      // --- Climax (positions préservées) ---
      // Vague 1 — zone libre 2304..2400 (entre piliers [69,5] et [75,9])
      { x: 2320, y: 560 }, { x: 2352, y: 560 }, { x: 2384, y: 560 },
      // Vague 2 bis — zone libre 3424..3488 (entre piliers [104,8] et [109,6])
      { x: 3440, y: 560 }, { x: 3472, y: 560 },
      // Vague 2 — zone libre 3584..3648 (entre piliers [109,6] et [114,8]), doublet
      { x: 3600, y: 560 }, { x: 3632, y: 560 },
      // Vague 3 — zone libre 4224..4320 (entre piliers [129,7] et [135,9])
      { x: 4240, y: 560 }, { x: 4272, y: 560 }, { x: 4304, y: 560 },
      // Piège sur sommet de [65,9,3,1] — y = 9*32 - 16 = 272 (entrée D, force commit forward)
      { x: 2160, y: 272 },
      // Piège sur sommet de [79,6,3,1] — y = 6*32 - 16 = 176 (sortie D haute)
      { x: 2608, y: 176 },
      // Piège sur sommet de [129,7,3,1] — y = 7*32 - 16 = 208 (route SOUS saw G, double combo)
      { x: 4176, y: 208 },
    ],

    // Boxes : 2 boîtes box2 en l'air.
    //   Patch pilier : box [2208,380] DANS pilier [69,5]. Déplacée → section E (3008, zone libre post-[89,9]).
    boxes: [
      { x: 3008, y: 380, type: 'box2' },   // section E (déplacée du pilier [69,5]). Marges [89,9] 36, bord E right 36 ✓.
      { x: 4736, y: 320, type: 'box2' },   // section H, position préservée (y au-dessus du sommet du pilier [146,12])
    ],

    // Fires : 2 nouveaux fires intro (sol B + sommet [29,9]) + 2 paires climax au sol (vague 1 D, vague 2 F)
    // + 1 piège fire sur sommet pilier climax (entrée F donjon). Total = 7 fires.
    //
    // === Pièges intro ===
    //   Fire sol B : x=736, zone libre 704..768 entre [19,11] et [24,9].
    //     BB ±12 → 724..748, sep [19,11] right=704 → 20 ✓, sep [24,9] left=768 → 20 ✓.
    //     Period 1800 ms (cycle court mais > 1500 minimum). Phase 0 (allume au start = signalé tôt).
    //     Force le joueur à timer le passage entre 2 piliers sur sol B.
    //   Fire sommet intro : piège sur sommet pilier [29,9,3,1] (breadcrumb route haute B fin).
    //     Formule sommet : y = 9*32 - 32 = 256. Sommet x=928..1024, fire x=976 BB x 964..988.
    //     Sep pilier left=928 → 36 ✓, sep pilier right=1024 → 36 ✓.
    //     Period 2000, phase 0.3 (déphasé du fire sol 736 pour ne pas synchroniser).
    //     Fruit [976, 240] SUPPRIMÉ (était sous le fire). Saw 1320 BB x 1212..1428 → sep x=224 ✓.
    //     Skip path : sol B sous le pilier [29,9] (zone libre 928..1024 du sol B), ou route haute via
    //     pilier voisin [24,9] (clean) puis saut sur [33,7] (avec spike sommet x=1088 = challenge enchaîné).
    //
    // === Pièges climax (positions inchangées) ===
    //   Paire D : 2064 (avant [65,9]), 2192 (entre [65,9] et [69,5]).
    //   Paire F : 3616 (entre [109,6] et [114,8]), 3760 (post-[114,8] zone libre 3744..3776).
    //   Fire sommet climax : piège sur sommet pilier [104,8,3,1] (entrée F donjon, atterrissage post-falling 3184 piégé).
    //     Formule sommet : y = 8*32 - 32 = 224. Sommet x=3328..3424, fire x=3376 BB x 3364..3388.
    fires: [
      // --- Intro hostile (section B) ---
      // Fire sol B — zone libre 704..768 (entre [19,11] et [24,9])
      { x: 736, y: 544, period: 1800, phase: 0    },
      // Piège fire sur sommet de [29,9,3,1] — y = 9*32 - 32 = 256 (route haute B fin)
      { x: 976, y: 256, period: 2000, phase: 0.3 },

      // --- Climax (positions préservées) ---
      // Paire D — zones libres section D
      { x: 2064, y: 544, period: 1800, phase: 0    },
      { x: 2192, y: 544, period: 1800, phase: 0.5  },
      // Paire F — zone libre entre [109,6]/[114,8] et zone libre post-[114,8]
      { x: 3616, y: 544, period: 1800, phase: 0.25 },
      { x: 3760, y: 544, period: 1800, phase: 0.75 },
      // Piège sur sommet de [104,8,3,1] — y = 8*32 - 32 = 224 (entrée F donjon, atterrissage piégé)
      { x: 3376, y: 224, period: 2000, phase: 0.5 },
    ],

    // Saws : 5 saws — 1 nouvelle saw aérienne intro + 4 saws climax (positions préservées).
    //
    // === Saw intro ===
    //   Saw aérienne intro : x=368, y=160, range=64, speed=100 (modéré, signalée visuellement).
    //     Survole gap A-B (320..416) et début B. BB trajectoire x : 368-64-28=276 .. 368+64+28=460.
    //     BB y : 132..188.
    //     - Pilier [5,11] x=160..256, top y=352 → pas overlap x (256 < 276) ✓.
    //     - Pilier [14,8] x=448..544, top y=256 → overlap x 448..460 (12 px), sep y = 256-188 = 68 ✓.
    //     - Tramp 288 BB x 260..316 : saw BB x min=276 → overlap horizontal 276..316 (40 px). Saw BB y top=132,
    //       tramp y=548 → saw bien au-dessus du trampoline (sep 360 px). N'interfère pas avec le bounce.
    //     - Fruit [496, 208] BB ±14 → x 482..510, y 194..222 → saw BB right=460 < 482 → sep x=22 ✓.
    //     - Fruit [240, 304] BB ±14 → x 226..254, y 290..318 → saw BB left=276 > 254 → sep x=22 ✓.
    //     Effet : force le joueur à timer le saut tramp 288 vers pilier [14,8] (route haute intro).
    //     Skip path : drop au sol A (0..320) puis saut horizontal au sol B (416..) en simple saut (gap 3 tuiles).
    //     La saw n'est PAS au-dessus du sol marchable (le sol B left=416, saw BB right=460 → saw déborde
    //     12 px au-dessus du sol B early, mais y=132..188 = bien plus haut que le joueur au sol).
    saws: [
      // Saw aérienne intro (gap A-B / début B)
      { x: 368,  y: 160, range: 64,  speed: 100 },   // intro hostile, BB y 132..188 vs piliers tops y=256+ (marge ≥68 ✓)
      // Saws climax (positions préservées)
      { x: 1320, y: 192, range: 80,  speed: 80  },   // vitrine B, BB y 164..220 vs piliers tops y=288+ (marge ≥68 ✓)
      { x: 2912, y: 192, range: 80,  speed: 140 },   // écho gap D-E, BB y 164..220 vs [89,9] y=288 (marge 68 ✓)
      { x: 3520, y: 144, range: 128, speed: 180 },   // climax F, BB y 116..172 vs piliers F tops y=192+ (marge 20+ ✓)
      { x: 4192, y: 144, range: 128, speed: 180 },   // climax G, BB y 116..172 vs [129,7] y=224 (marge 52 ✓)
    ],

    // FallingPlatforms : 4 plateformes — relais sur les grands gaps climax.
    fallingPlatforms: [
      // Relais au-dessus des trous du niveau 4 (gaps D-E, E-F, G-H).
      { x: 2720, y: 560, delay: 400 },   // gap D-E (2624–2848) — relais 1
      { x: 2816, y: 560, delay: 400 },   // gap D-E — relais 2
      { x: 3184, y: 560, delay: 400 },   // gap E-F (3072–3296)
      { x: 4576, y: 560, delay: 400 },   // gap G-H (4480–4672)
    ],

    next: 5,
  },

  5: {
    name: 'Niveau 5 — Terres Brûlées',
    bgKey: 'bg_pink',
    bgColor: '#7a2e1a',
    tiles: {
      // Kit "herbe ORANGE" (frames vérifiés 100% opaques, symétriques au kit vert).
      topLeft:  94, top:   95, topRight:  96,
      midLeft: 116, midMid: 117, midRight: 118,
      // Petit bloc décoratif/plateforme 2×2 (à droite du kit orange).
      detail: { topLeft: 97, topRight: 98, botLeft: 119, botRight: 120 },
    },
    worldWidth: 7200,
    // Petits blocs "vivants" tamponnés dans les grandes colonnes de terre.
    // Surface d'appui (jump-through) = y monde (ty+1)*32, centrée x=(tx+1)*32, large ~26 px.
    // Bloc 2×2 entièrement contenu dans la terre d'un pilier. 2-3 max, jamais près d'un trampoline.
    // Trampolines de ce niveau : x=272 (sert route-haute A / [9,9]) et x=5696 (sert relais gap I-J vers J).
    playerStart: { x: 80, y: 480 },
    flag: { x: 7120, y: 520 },
    // Fruits visibles ce niveau : oranges/rouges chaudes qui ressortent sur le fond rosé.
    fruitTypes: ['orange', 'apple', 'cherries'],

    // Sections sol niveau 5 (DERNIER niveau = LE PLUS DUR ET LE PLUS LONG : durci/allongé,
    //   feux et scies densifiés, timer 60 s rend chaque hésitation coûteuse). A–G inchangées (0–4576).
    //   A : 0    – 320    (tx 0..9,   w=10)   ← intro safe (spawn x=80), tramp 272 vers [9,9]
    //   B : 448  – 1088   (tx 14..33, w=20)   ← intro mécaniques (spike+fire sol, box, saut piliers)
    //   C : 1280 – 1856   (tx 40..57, w=18)   ← développement (2 saws : vitrine basse + haute, spike+fire combo)
    //   D : 2048 – 2528   (tx 64..78, w=15)   ← CLIMAX vague 1
    //   E : 2848 – 3040   (tx 89..94, w=6)    ← îlot étroit climax (fire sommet)
    //   F : 3360 – 3840   (tx 105..119, w=15) ← CLIMAX vague 2
    //   G : 4096 – 4576   (tx 128..142, w=15) ← CLIMAX vague 3 (saw + fire sol)
    //   H : 4800 – 5152   (tx 150..160, w=11) ← CLIMAX vague 4 (NOUVEAU : 2 fires sol + saw)
    //   I : 5440 – 5728   (tx 170..178, w=9)  ← îlot étroit climax (NOUVEAU : fire sommet + saw + tramp relais)
    //   J : 6016 – 6432   (tx 188..200, w=13) ← CLIMAX vague 5 (NOUVEAU : 2 fires sol + saw + spike sommet)
    //   K : 6592 – 6848   (tx 206..213, w=8)  ← respiration
    //   L : 6944 – 7200   (tx 217..224, w=8, sous le flag x=7120)
    // Gaps :
    //   A-B : 320  – 448  = 128 px = 4 tuiles  (saut simple confort)
    //   B-C : 1088 – 1280 = 192 px = 6 tuiles  (saut simple, sentiment de trou)
    //   C-D : 1856 – 2048 = 192 px = 6 tuiles  (saut simple, entrée climax)
    //   D-E : 2528 – 2848 = 320 px = 10 tuiles (CLIMAX, fallings relais 2640 + 2752)
    //   E-F : 3040 – 3360 = 320 px = 10 tuiles (CLIMAX, fallings relais 3152 + 3264)
    //   F-G : 3840 – 4096 = 256 px = 8 tuiles  (CLIMAX, falling relais 3936 + double saut)
    //   G-H : 4576 – 4800 = 224 px = 7 tuiles  (CLIMAX, falling relais 4688)
    //   H-I : 5152 – 5440 = 288 px = 9 tuiles  (CLIMAX, fallings relais 5264 + 5376) [NOUVEAU]
    //   I-J : 5728 – 6016 = 288 px = 9 tuiles  (CLIMAX, tramp 5696 sur I + falling relais 5872) [NOUVEAU]
    //   J-K : 6432 – 6592 = 160 px = 5 tuiles  (double saut confort) [NOUVEAU]
    //   K-L : 6848 – 6944 = 96 px  = 3 tuiles  (respiration finale, saut simple) [NOUVEAU]
    layout: [
      // --- Sections de sol (ty=18..19) ---
      [0,   18, 10, 2],     // A : 0–320
      [14,  18, 20, 2],     // B : 448–1088
      [40,  18, 18, 2],     // C : 1280–1856
      [64,  18, 15, 2],     // D : 2048–2528
      [89,  18, 6,  2],     // E : 2848–3040 (îlot étroit)
      [105, 18, 15, 2],     // F : 3360–3840
      [128, 18, 15, 2],     // G : 4096–4576
      [150, 18, 11, 2],     // H : 4800–5152 (NOUVEAU, climax vague 4)
      [170, 18, 9,  2],     // I : 5440–5728 (NOUVEAU, îlot étroit climax)
      [188, 18, 13, 2],     // J : 6016–6432 (NOUVEAU, climax vague 5)
      [206, 18, 8,  2],     // K : 6592–6848 (NOUVEAU, respiration)
      [217, 18, 8,  2],     // L : 6944–7200 (NOUVEAU, sous le flag)

      // --- Piliers intro (section A, escalier ascendant, tuto saut/double-saut) ---
      // Chaîne imbriquée, overlap 2 tuiles entre marches (feuilleté SMB par depth ty).
      [1,  14, 4, 4],       // x=32..160, pilier ty=14..17, tw=4 (base escalier)
      [3,  12, 4, 6],       // x=96..224, pilier ty=12..17, tw=4 (overlap 2 avec [1,14])

      // --- Pilier route haute après gap A-B (cible du trampoline x=272) ---
      // Variante "au-dessus d'un gap" : th = 20 - ty (colonne descend jusqu'au bas du viewport y=640).
      [9,  9,  4, 11],      // x=288..416, pilier ty=9..19, hauteur 352 px (cible tramp 272, cas mixte gap A-B ↔ B)

      // --- Piliers dev (section B) — larges, overlaps esthétiques ---
      [16, 11, 4, 7],       // x=512..640, pilier ty=11..17, tw=4
      [23, 9,  4, 9],       // x=736..864, pilier ty=9..17, tw=4
      [29, 11, 4, 7],       // x=928..1056, pilier ty=11..17, tw=4 (sortie B)


      // --- Piliers dev (section C, vers climax) ---
      [42, 11, 4, 7],       // x=1344..1472, pilier ty=11..17, tw=4
      [49, 9,  4, 9],       // x=1568..1696, pilier ty=9..17, tw=4 (route haute C, sous saw vitrine)
      // Pilier de sortie C "à cheval" sur le bord du gap C-D (modèle [21,8,4,12] niv 1) :
      //   décalé tx=54→56, th passé à 20-11=9 (terre plonge jusqu'à y=640). x=1792..1920 :
      //   tuiles 1792..1856 sur le sol C, tuiles 1856..1920 au-dessus du gap C-D. Sommet y=352 (jump-through).
      [56, 11, 4, 9],       // x=1792..1920, pilier ty=11..19, à cheval bord C / gap C-D (sommet y=352)

      // --- Piliers climax vague 1 (section D) ---
      [64, 11, 4, 7],       // x=2048..2176, pilier ty=11..17, tw=4 (entrée D)
      [70, 7,  4, 11],      // x=2240..2368, pilier ty=7..17, tw=4 (ROUTE HAUTE D premium, sommet piégé spike)
      // Pilier de sortie D "à cheval" sur le bord du gap D-E (modèle [21,8,4,12] niv 1) :
      //   décalé tx=75→77, th passé à 20-11=9. x=2464..2592 : tuiles 2464..2528 sur le sol D,
      //   tuiles 2528..2592 au-dessus du gap D-E. Sommet y=352, au-dessus des fallings 2640/2752 (y=560).
      [77, 11, 4, 9],       // x=2464..2592, pilier ty=11..19, à cheval bord D / gap D-E (sommet y=352)

      // --- Pilier climax (section E, îlot étroit) ---
      [89, 9,  4, 9],       // x=2848..2976, pilier ty=9..17, tw=4 (îlot E ; sommet piégé fire)

      // --- Piliers climax vague 2 (section F) ---
      // Pilier d'entrée F "à cheval" sur le bord du gap E-F (modèle [21,8,4,12] niv 1) :
      //   décalé tx=105→103, th passé à 20-10=10. x=3296..3424 : tuiles 3296..3360 au-dessus du gap E-F,
      //   tuiles 3360..3424 sur le sol F. Sommet y=320 (jump-through), au-dessus des fallings 3152/3264.
      //   Le spike de sommet suit le pilier (recentré à x=3360).
      [103, 10, 4, 10],     // x=3296..3424, pilier ty=10..19, à cheval gap E-F / bord F (sommet y=320, spike)
      [111, 7,  4, 11],     // x=3552..3680, pilier ty=7..17, tw=4 (route haute F, sous saw)
      // Pilier de sortie F "à cheval" sur le bord du gap F-G (modèle [21,8,4,12] niv 1) :
      //   décalé tx=116→118, th passé à 20-10=10. x=3776..3904 : tuiles 3776..3840 sur le sol F,
      //   tuiles 3840..3904 au-dessus du gap F-G. Sommet y=320, au-dessus du falling 3936 (y=560).
      [118, 10, 4, 10],     // x=3776..3904, pilier ty=10..19, à cheval bord F / gap F-G (sommet y=320)

      // --- Piliers climax vague 3 (section G) ---
      [128, 11, 4, 7],      // x=4096..4224, pilier ty=11..17, tw=4 (entrée G)
      [134, 7,  4, 11],     // x=4288..4416, pilier ty=7..17, tw=4 (route SOUS saw G, sommet piégé spike)
      // Pilier de sortie G "à cheval" sur le bord du gap G-H (modèle [21,8,4,12] niv 1) :
      //   décalé tx=139→141, th passé à 20-11=9. x=4512..4640 : tuiles 4512..4576 sur le sol G,
      //   tuiles 4576..4640 au-dessus du gap G-H. Sommet y=352, au-dessus du falling 4688 (y=560).
      [141, 11, 4, 9],      // x=4512..4640, pilier ty=11..19, à cheval bord G / gap G-H (sommet y=352)

      // --- Piliers climax vague 4 (section H, NOUVEAU) ---
      [150, 11, 4, 7],      // x=4800..4928, pilier ty=11..17, tw=4 (entrée H)
      // Pilier de sortie H "à cheval" sur le bord du gap H-I (modèle [21,8,4,12] niv 1) :
      //   décalé tx=156→159, th passé à 20-8=12. x=5088..5216 : tuiles 5088..5152 sur le sol H,
      //   tuiles 5152..5216 au-dessus du gap H-I. Sommet y=256 (route SOUS saw H), au-dessus des fallings 5264/5376.
      [159, 8,  4, 12],     // x=5088..5216, pilier ty=8..19, à cheval bord H / gap H-I (sommet y=256)

      // --- Pilier climax (section I, îlot étroit, NOUVEAU) ---
      [170, 9,  4, 9],      // x=5440..5568, pilier ty=9..17, tw=4 (îlot I ; sommet piégé fire ; sous saw I)

      // --- Piliers climax vague 5 (section J, NOUVEAU) ---
      // Pilier d'entrée J "à cheval" sur le bord du gap I-J (modèle [21,8,4,12] niv 1) :
      //   décalé tx=188→186, th passé à 20-11=9. x=5952..6080 : tuiles 5952..6016 au-dessus du gap I-J,
      //   tuiles 6016..6080 sur le sol J. Sommet y=352 (jump-through). À droite du cône tramp 5696 (left=5952
      //   → 240 px du cône x 5680..5712, hors zone tête) ; au-dessus du falling 5872 (y=560). Fire de sommet recentré à x=6016.
      [186, 11, 4, 9],      // x=5952..6080, pilier ty=11..19, à cheval gap I-J / bord J (sommet y=352, fire)
      [194, 8,  4, 10],     // x=6208..6336, pilier ty=8..17, tw=4 (route SOUS saw J, sommet piégé spike)
      [197, 11, 4, 7],      // x=6304..6432, pilier ty=11..17, tw=4 (sortie J, overlap 1 tuile avec [194,8], right=6432=bord J)

      // --- Piliers respiration (section K, escalier montant) ---
      // Pilier d'entrée K "à cheval" sur le bord du gap J-K (modèle [21,8,4,12] niv 1) :
      //   décalé tx=206→204, th passé à 20-12=8. x=6528..6656 : tuiles 6528..6592 au-dessus du gap J-K,
      //   tuiles 6592..6656 sur le sol K. Sommet y=384 (jump-through, sous l'arc de double saut J→K).
      [204, 12, 4, 8],      // x=6528..6656, pilier ty=12..19, à cheval gap J-K / bord K (sommet y=384)
      // Pilier de sortie K "à cheval" sur le bord du gap K-L (modèle [21,8,4,12] niv 1) :
      //   décalé tx=210→212, th passé à 20-10=10. x=6784..6912 : tuiles 6784..6848 sur le sol K,
      //   tuiles 6848..6912 au-dessus du gap K-L (3 tuiles). Sommet y=320 (jump-through, sous l'arc du saut simple K-L).
      [212, 10, 4, 10],     // x=6784..6912, pilier ty=10..19, à cheval bord K / gap K-L (sommet y=320)

      // --- Pilier route haute finale + secret (section L) ---
      [219, 9,  4, 9],      // x=7008..7136, pilier ty=9..17, tw=4 (route haute avant flag)
      [217, 4,  4, 14],     // x=6944..7072, pilier ty=4..17, tw=4 (SECRET, énorme pilier ; accès double saut depuis [219,9])
    ],

    // Fruits structurés par phase. Total = 28 (proportionnel à l'allongement, breadcrumbs sur saws).
    fruitPositions: [
      // --- Intro (0 – 1088) : 6 fruits ---
      [128, 400],   // au-dessus pilier [1,14,4,4] (sommet y=448)
      [192, 336],   // au-dessus pilier [3,12,4,6] (suit décalage escalier)
      [352, 240],   // au-dessus pilier [9,9,4,11] (route haute après tramp 272)
      [576, 304],   // au-dessus pilier [16,11,4,7]
      [800, 240],   // au-dessus pilier [23,9,4,9] (route haute B)
      [992, 304],   // au-dessus pilier [29,11,4,7] (sortie B)

      // --- Développement (1088 – 2048) : 4 fruits (dont breadcrumb saw haute 1408) ---
      [1408, 192],  // breadcrumb saw HAUTE C (x=1408, marque la patrouille aérienne haute)
      [1440, 304],  // au-dessus pilier [42,11,4,7] (route basse C)
      [1632, 240],  // au-dessus pilier [49,9,4,9] (route haute C, sous saw vitrine basse)
      [1792, 304],  // au-dessus pilier de sortie C à cheval [56,11,4,9]

      // --- Climax (2048 – 6432) : 13 fruits, breadcrumbs sur chaque saw ---
      [2112, 304],  // au-dessus pilier [64,11,4,7] (entrée D)
      [2304, 144],  // au-dessus pilier [70,7,4,11] ROUTE HAUTE D PREMIUM
      [2464, 304],  // au-dessus pilier de sortie D à cheval [77,11,4,9]
      [2640, 460],  // SUR la falling 2640 (gap D-E)
      [2912, 240],  // au-dessus pilier [89,9,4,9] îlot E (à gauche du fire sommet x=2944)
      [3264, 460],  // SUR la falling 3264 (gap E-F)
      [3616, 144],  // au-dessus pilier [111,7,4,11] route haute F (breadcrumb saw F)
      [3936, 460],  // SUR la falling 3936 (gap F-G)
      [4352, 144],  // au-dessus pilier [134,7,4,11] route SOUS saw G (breadcrumb saw G)
      [5056, 144],  // breadcrumb saw H (saw x=4960), à gauche du pilier sortie H à cheval [159,8,4,12]
      [5376, 460],  // SUR la falling 5376 (gap H-I)
      [5504, 144],  // au-dessus pilier [170,9,4,9] îlot I (breadcrumb saw I, à gauche du fire sommet x=5520)
      [6272, 144],  // au-dessus pilier [194,8,4,10] route SOUS saw J (breadcrumb saw J)

      // --- Respiration / flag (6432 – 7200) : 4 fruits + 1 secret = 5 ---
      [6656, 352],  // au-dessus pilier d'entrée K à cheval [204,12,4,8]
      [6784, 272],  // au-dessus pilier de sortie K à cheval [212,10,4,10]
      [7072, 240],  // au-dessus pilier [219,9,4,9] (route haute finale)
      [7000, 64],   // SECRET au-dessus pilier [217,4,4,14]
      [7160, 432],  // sol L, juste avant le flag (route safe, récompense finale)
    ],

    // Trampolines (x, y=548). Sections valides : A(0-320), … , I(5440-5728).
    //   272  → section A. Cône x±16=256..288 ; [3,12,4,6] right=224 (marge BB 48 ✓).
    //          Le tramp sert d'ascenseur vers le pilier-cible [9,9] (left=288, sommet jump-through).
    //          Marge bord gap A-B (section A right=320) : BB right=300 → 20 px du bord.
    //   5696 → section I (îlot, NOUVEAU). Relais du gap I-J (9 tuiles). Cône x±16=5680..5712.
    //          Pilier [170,9] right=5568 (marge BB 84 ✓, hors cône). Aucune plateforme dans le cône
    //          vertical (ty 5..16) au-dessus de x=5696. Bord gap I-J (section I right=5728) : BB right=5724
    //          → 4 px du bord ; le tramp est posé contre le bord droit de l'îlot pour relancer le saut au-dessus du gap.
    trampolines: [
      { x: 272,  y: 548 },   // section A → pilier-route-haute [9,9,4,11]
      { x: 5696, y: 548 },   // section I (îlot) → relais gap I-J (9 tuiles), propulse vers J avec falling 5872 en secours
    ],

    // Spikes : groupes au sol (chaque section densément piégée) + sommets piégés (sommets de piliers).
    //   Section B : doublet sol zone libre 640..736 (entre [16,11] right=640 et [23,9] left=736).
    //   Section C : triplet sol zone libre 1472..1568 (entre [42,11] right=1472 et [49,9] left=1568) — pré-signal saw 1632.
    //   Section D : doublet sol zone libre 2176..2240 (entre [64,11] right=2176 et [70,7] left=2240).
    //   Section F : doublet sol zone libre 3488..3552 (entre [103,10] right=3424 et [111,7] left=3552).
    //   Section G : doublet sol zone libre 4224..4288 (entre [128,11] right=4224 et [134,7] left=4288).
    //   Section J : doublet sol zone libre 6080..6208 (entre [186,11] right=6080 et [194,8] left=6208).
    //   Sommets piégés (route alt toujours présente) :
    //     [16,11] y=336 ; [70,7] y=208 ; [103,10] y=304 (entrée F à cheval) ; [134,7] y=208 ; [194,8] y=8*32-16=240.
    spikes: [
      // Doublet section B — zone libre 640..736
      { x: 656, y: 560 }, { x: 688, y: 560 },
      // Triplet section C — zone libre 1472..1568 (pré-signal saw 1632)
      { x: 1488, y: 560 }, { x: 1520, y: 560 }, { x: 1552, y: 560 },
      // Doublet section D — zone libre 2176..2240
      { x: 2192, y: 560 }, { x: 2224, y: 560 },
      // Doublet section F — zone libre 3488..3552
      { x: 3504, y: 560 }, { x: 3536, y: 560 },
      // Doublet section G — zone libre 4224..4288
      { x: 4240, y: 560 }, { x: 4272, y: 560 },
      // Doublet section J — zone libre 6080..6208 (entre [186,11] et [194,8])
      { x: 6160, y: 560 }, { x: 6192, y: 560 },
      // Piège sur sommet de [16,11,4,7] — y = 11*32 - 16 = 336 (dev B)
      { x: 624, y: 336 },
      // Piège sur sommet de [70,7,4,11] — y = 7*32 - 16 = 208 (climax D premium piégé)
      { x: 2256, y: 208 },
      // Piège sur sommet de [103,10,4,10] — y = 10*32 - 16 = 304 (entrée F à cheval, atterrissage piégé ; recentré sur le sommet x=3296..3424)
      { x: 3360, y: 304 },
      // Piège sur sommet de [134,7,4,11] — y = 7*32 - 16 = 208 (route SOUS saw G, triple combo)
      { x: 4304, y: 208 },
      // Piège sur sommet de [194,8,4,10] — y = 8*32 - 16 = 240 (climax J, route SOUS saw J)
      { x: 6256, y: 240 },
    ],

    // Boxes : 2 boxes en l'air (taper PAR DESSOUS).
    //   Box 1024 (section B fin) : posée en l'air devant le pilier [29,11] (tige décorative, traversable).
    //     y=420 → bottom 444 (sous le sommet du pilier y=352), atteignable en saut simple depuis le sol B.
    //   Box 6720 (section K respiration) : y=400 → bottom 424, bien sous les sommets piliers (y=384/320),
    //     posée en l'air entre les piliers à cheval [204,12] (right=6656) et [212,10] (left=6784), marges 36 px (tiges traversables) ; tapée PAR DESSOUS depuis le sol K.
    boxes: [
      { x: 1024, y: 420, type: 'box1' },   // section B, en l'air devant [29,11] — taper par dessous
      { x: 6720, y: 400, type: 'box2' },   // section K respiration, saut simple depuis le sol K
    ],

    // Fires : 9 feux désynchronisés (sol + sommets), surtout dev + climax. Tous period ≥ 1500.
    //   y=544 (sol) / N*32-32 (sommet). Phases variées : 0 / 0.2 / 0.25 / 0.33 / 0.4 / 0.5 / 0.6 / 0.66 / 0.75.
    //   Fire sol B   : zone libre 864..928 (entre [23,9] right=864 et [29,11] left=928).
    //   Fire sol C   : zone libre 1280..1344 (entre bord C left et [42,11] left=1344).
    //   Fire sommet E: [89,9,4,9] y=9*32-32=256 (îlot ; traversé par falling/saut).
    //   Fire sol G   : zone libre 4416..4448 (entre [134,7] right=4416 et [139,11] left=4448) — étroite mais BB ±12 ✓.
    //   Fires sol H  : 4960 (zone libre 4928..4992 entre [150,11] right=4928 et [159,8] left=5088) +
    //                  5136 (fin H, zone après le sommet de [159,8], BB ±12 → 5124..5148 ✓).
    //   Fire sommet I: [170,9,4,9] y=9*32-32=256 (îlot ; sommet piégé, sous saw I).
    //   Fires sommet J: [186,11] y=11*32-32=320 (entrée à cheval) + [197,11] y=320 (sortie). Le sol J est saturé
    //                   (piliers + spike doublet 6160/6192), donc les 2 feux J sont posés en SOMMET de pilier
    //                   (route haute J piégée). Route basse sol J reste praticable (tiges traversables).
    fires: [
      // Fires sol section A — accueil brûlant dès le spawn (x=80), avant le trampoline (x=272)
      { x: 160,  y: 544, period: 1800, phase: 0    },
      { x: 216,  y: 544, period: 1800, phase: 0.5  },
      // Fire sol section B — zone libre 864..928 (entre [23,9] et [29,11])
      { x: 896,  y: 544, period: 1800, phase: 0    },
      // Fire sol section C — zone libre 1280..1344 (entre bord C left et [42,11])
      { x: 1312, y: 544, period: 2000, phase: 0.5  },
      // Piège fire sur sommet de [89,9,4,9] — y = 256 (îlot E climax)
      { x: 2944, y: 256, period: 2000, phase: 0.25 },
      // Fire sol section G — zone libre 4416..4448 (entre [134,7] et [139,11])
      { x: 4432, y: 544, period: 1900, phase: 0.4  },
      // Fires sol section H — 4960 (zone 4928..4992 entre piliers) + 5136 (fin H, zone 5120..5152)
      { x: 4960, y: 544, period: 1800, phase: 0.2  },
      { x: 5136, y: 544, period: 1800, phase: 0.66 },
      // Piège fire sur sommet de [170,9,4,9] — y = 256 (îlot I climax, sous saw I)
      { x: 5520, y: 256, period: 2000, phase: 0.33 },
      // Piège fire sur sommet de [186,11,4,9] — y = 11*32-32 = 320 (entrée J à cheval, route haute piégée ; recentré sur le sommet x=5952..6080)
      { x: 6016, y: 320, period: 1900, phase: 0.6  },
      // Piège fire sur sommet de [197,11,4,7] — y = 11*32-32 = 320 (sortie J, route haute piégée)
      { x: 6368, y: 320, period: 1700, phase: 0.75 },
    ],

    // Saws : 7 saws aériennes en patrouille, réparties C → J, chacune marquée par un fruit-breadcrumb.
    //   Vitrine C basse : x=1632, BB y 148..204 vs pilier [49,9] top y=288 (marge 84 ✓).
    //   Vitrine C haute : x=1408, range=64, BB x [1316,1500] y 100..156 vs pilier [42,11] top y=352 (marge 196 ✓).
    //   Climax F : x=3616, BB y 116..172 vs pilier [111,7] top y=224 (marge 52 ✓), fruit [3616,144]=centre.
    //   Climax G : x=4352, BB y 116..172 vs pilier [134,7] top y=224 (marge 52 ✓), au-dessus du spike sommet.
    //   Climax H : x=4960, range=112, BB x [4820,5100] y 116..172 vs pilier [159,8] top y=256 (marge 84 ✓).
    //   Climax I : x=5584, range=96, BB x [5460,5708] y 132..188 vs pilier [170,9] top y=288 (marge 100 ✓).
    //   Climax J : x=6224, range=120, BB x [6076,6372] y 116..172 vs pilier [194,8] top y=256 (marge 84 ✓).
    saws: [
      { x: 1408, y: 128, range: 64,  speed: 90  },   // dev C haute (au-dessus du sol C, hors têtes de piliers)
      { x: 1632, y: 176, range: 80,  speed: 100 },   // dev C vitrine basse
      { x: 3616, y: 144, range: 120, speed: 160 },   // climax F
      { x: 4352, y: 144, range: 128, speed: 180 },   // climax G
      { x: 4960, y: 144, range: 112, speed: 170 },   // climax H
      { x: 5584, y: 160, range: 96,  speed: 160 },   // climax I (îlot)
      { x: 6224, y: 144, range: 120, speed: 180 },   // climax J
    ],

    // FallingPlatforms : 9 relais (D-E ×2, E-F ×2, F-G ×1, G-H ×1, H-I ×2, I-J ×1), chacun au-dessus d'un gap.
    //   Gap D-E (2528-2848, 10 tuiles) : relais 2640 + 2752 (sous-saut ~3.5 tuiles entre eux).
    //   Gap E-F (3040-3360, 10 tuiles) : relais 3152 + 3264.
    //   Gap F-G (3840-4096, 8 tuiles)  : relais 3936 (double saut depuis F vers relais puis vers G).
    //   Gap G-H (4576-4800, 7 tuiles)  : relais 4688.
    //   Gap H-I (5152-5440, 9 tuiles)  : relais 5264 + 5376 (NOUVEAU).
    //   Gap I-J (5728-6016, 9 tuiles)  : tramp 5696 (sur I) + falling 5872 en secours (NOUVEAU).
    fallingPlatforms: [
      { x: 2640, y: 560, delay: 500 },   // gap D-E (relais 1)
      { x: 2752, y: 560, delay: 450 },   // gap D-E (relais 2)
      { x: 3152, y: 560, delay: 500 },   // gap E-F (relais 1)
      { x: 3264, y: 560, delay: 450 },   // gap E-F (relais 2)
      { x: 3936, y: 560, delay: 450 },   // gap F-G (relais central)
      { x: 4688, y: 560, delay: 450 },   // gap G-H (relais central)
      { x: 5264, y: 560, delay: 500 },   // gap H-I (relais 1, NOUVEAU)
      { x: 5376, y: 560, delay: 450 },   // gap H-I (relais 2, NOUVEAU)
      { x: 5872, y: 560, delay: 450 },   // gap I-J (relais secours après tramp 5696, NOUVEAU)
    ],

    next: null,
  },
};
