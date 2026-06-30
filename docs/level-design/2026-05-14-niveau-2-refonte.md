# Spec — Refonte Niveau 2 (Pays de Bonbon)

## Intent (1 phrase)
Faire monter franchement la pression en réutilisant les acquis du niveau 1, introduire la **saw** (nouvelle mécanique) en isolation puis l'enchâsser dans un climax où fire + saw + falling_platform se combinent, le tout sur un parcours ascendant qui exige précision et choix entre route safe et route haute coûteuse.

## Thème & assets
- bgKey : `bg_purple` (déjà chargé)
- bgColor : `#2a1238`
- Tileset : kit "candy rose + sable rose" — frames TL=182, T=183, TR=184, ML=204, MC=205, MR=206
- worldWidth : 4800
- Mécaniques utilisées : trampolines, spikes, boxes (box2), fires, saws, fallingPlatforms

## ASCII map (vue de côté, échelle 1 char ≈ 64 px monde)
```
Légende : =sol  -plateforme  T=tramp  S=spike  B=box  F=fire  W=saw  X=fallingPlat  *=fruit  [F]=flag

ty=3                                                                                                  ----    (secret)
ty=4                                                                                              *
ty=5                                                                          --------                    *
ty=6                                                                                                      *  [F]?
ty=7                                                            -----   -----                                    --   route flag haute
ty=8                                          ------                                  ------
ty=9                              ------                                                        ------
ty=10                  ------                                       W (saw patrouille)
ty=11        ----                                       ----            x=2900..3060
ty=12                       ----
ty=13   ----
ty=14
ty=15                                  ----          ----                                                  ---  approche flag basse
ty=18  P====== ~~~ ============== ~~~ ===================== ~~~ ============== ~~~ ====================  ==========
       0   480 540          1600 1660           2880  2940           3680 3740                    4640
        A          B                       C                      D                  E
                T(360)   S S S(1100)              F(2200) X(2480)         F(3300) W(2950 sus.)         T(4420)
                                                  F(2260)  ↑falling      X(3560)        ↑relance secret
                                                  fire double phase     ↑falling + saw
```

Notes :
- 5 sections de sol, gaps plus larges qu'au niv 1 (jusqu'à 5-6 tuiles → exige double saut acquis).
- Sections C et D portent le climax : fire alterné + saw en suspension + falling_platforms à la chaîne.
- Approche du flag mixe route haute (plateforme [144, 7]) ou route basse safe (sol section E direct).

## Rythme — bornes en x monde
- **Intro** : 0 — 1100 (rappel des acquis : double saut, trampoline 360, plateforme-relais, **1ère saw isolée en hauteur sans piège associé**)
- **Développement** : 1100 — 2700 (spikes en triplet au sol, box premium en altitude, fire seul en début de section C)
- **Climax** : 2700 — 3900 (LE morceau : fire alterné en phase opposée 2200/2260 + falling_platforms 2480 et 3560 + saw suspendue 2950 qui patrouille horizontalement au-dessus d'un sol étroit)
- **Respiration → flag** : 3900 — 4800 (sol large, trampoline 4420 vers route haute + secret, drapeau au sol pour route safe)

Justification : le niv 1 a tout introduit ; le niv 2 monte le curseur. La saw est la SEULE nouvelle mécanique, elle apparaît d'abord seule (intro à x≈900 en hauteur, joueur la voit patrouiller sans avoir à la croiser) puis devient un obstacle réel au climax. Climax = empilement de 3 mécaniques apprises = pic de difficulté volontaire.

## Layout complet (objet LEVELS proposé)

```js
LEVELS[2] = {
  name: 'Niveau 2 — Pays de Bonbon',
  bgKey: 'bg_purple',
  bgColor: '#2a1238',
  tiles: {
    topLeft: 182, top: 183, topRight: 184,
    midLeft: 204, midMid: 205, midRight: 206,
  },
  worldWidth: 4800,
  playerStart: { x: 80, y: 480 },
  flag: { x: 4720, y: 520 },

  // Sections sol niveau 2 :
  //   A : 0    – 480    (tx 0..14)
  //   B : 540  – 1600   (tx 17..49)
  //   C : 1660 – 2880   (tx 52..89)
  //   D : 2940 – 3680   (tx 92..114)
  //   E : 3740 – 4800   (tx 117..149)
  // Gaps : 480-540 (60px = 2 tuiles), 1600-1660 (60px), 2880-2940 (60px), 3680-3740 (60px).
  // Gaps étroits MAIS plateformes intermédiaires obligent à varier hauteurs → climax = circulation verticale.
  layout: [
    // --- Sections de sol (ty=18..19) ---
    [0,   18, 15, 2],     // A : 0–480
    [17,  18, 33, 2],     // B : 544–1600
    [52,  18, 38, 2],     // C : 1664–2880
    [92,  18, 23, 2],     // D : 2944–3680
    [117, 18, 33, 2],     // E : 3744–4800

    // --- Plateformes intro (section A → B, ty=13..10, escalier ascendant doux) ---
    [4,   13, 4, 1],      // x=128..256, plateforme intro (rappel double saut)
    [9,   11, 4, 1],      // x=288..416, escalier
    [20,  10, 4, 1],      // x=640..768, après trampoline 360
    [28,  12, 4, 1],      // x=896..1024, suite

    // --- Plateforme "vitrine saw" (section B, ty=10) ---
    //     La saw patrouille EN HAUTEUR ici, visible mais SANS chemin obligé qui la croise.
    //     Le joueur la voit, comprend qu'elle se déplace, puis la rencontre vraiment plus loin.
    [37,  9,  4, 1],      // x=1184..1312, route haute B, fruit premium au-dessus
    [44,  12, 4, 1],      // x=1408..1536, redescente

    // --- Plateformes dev (section C, ty=8..11) ---
    [55,  10, 4, 1],      // x=1760..1888, après le gap B-C
    [63,  8,  4, 1],      // x=2016..2144, route haute (skip fire 2200)
    [72,  10, 4, 1],      // x=2304..2432, atterrissage après fire
    [80,  7,  4, 1],      // x=2560..2688, route haute climax

    // --- Plateformes climax (section D, ty=7..5, dispersion verticale) ---
    [88,  7,  4, 1],      // x=2816..2944, juste avant gap C-D
    [97,  5,  5, 1],      // x=3104..3264, route haute SOUS la saw 2950 (passage tendu)
    //     ⚠ La saw 2950 est suspendue à y=320 (≈ ty=10), elle patrouille en-dessous
    //     de cette plateforme [97,5,5,1] qui est à ty=5 (y=160). Aucun chevauchement.
    [108, 8,  4, 1],      // x=3456..3584, sortie climax

    // --- Plateformes respiration / route flag (section E, ty=10..7) ---
    [120, 10, 4, 1],      // x=3840..3968
    [128, 8,  4, 1],      // x=4096..4224
    [136, 6,  4, 1],      // x=4352..4480, route haute approche flag
    [144, 7,  5, 1],      // x=4608..4768, plateforme finale au-dessus du flag (route haute)

    // --- Plateforme SECRET (au-dessus, ty=3 = 15 tuiles au-dessus du sol) ---
    //     Accessible uniquement par : trampoline 4420 + double saut depuis [136,6]
    //     Boost trampoline = ~12 tuiles → atteignable.
    [142, 3,  4, 1],      // x=4544..4672, fruit secret + bonus visuel
  ],

  // Fruits structurés par phase. Total = 23 fruits (cible 18-24).
  fruitPositions: [
    // --- Intro (0 – 1100) : 5 fruits ---
    [180, 384],   // au-dessus plateforme [4,13]
    [340, 320],   // au-dessus plateforme [9,11]
    [680, 288],   // au-dessus plateforme [20,10], après trampoline
    [950, 352],   // au-dessus plateforme [28,12]
    [1100, 480],  // sol section B, transition vers spikes

    // --- Développement (1100 – 2700) : 7 fruits ---
    [1240, 256],  // au-dessus plateforme [37,9] (route haute B)
    [1380, 480],  // sol, juste avant les spikes (signal visuel)
    [1480, 352],  // au-dessus plateforme [44,12]
    [1820, 288],  // au-dessus plateforme [55,10]
    [2080, 224],  // au-dessus plateforme [63,8] (route haute = skip fire 2200)
    [2360, 288],  // au-dessus plateforme [72,10] (après fire)
    [2620, 192],  // au-dessus plateforme [80,7] (route haute climax)

    // --- Climax (2700 – 3900) : 6 fruits, dont route haute exclusive ---
    [2880, 192],  // au-dessus plateforme [88,7], juste avant le gap dangereux
    [3180, 128],  // au-dessus plateforme [97,5], route haute climax (premium)
    [3240, 128],  // suite premium
    [3500, 224],  // au-dessus plateforme [108,8], sortie climax
    [3580, 480],  // sol section D, fruit visible après falling_platform
    [3800, 480],  // sol section E, début respiration

    // --- Respiration / flag (3900 – 4800) : 4 fruits + 1 secret ---
    [4050, 480],  // sol
    [4180, 224],  // au-dessus plateforme [128,8]
    [4380, 160],  // au-dessus plateforme [136,6], route haute
    [4640, 192],  // route haute finale [144,7]
    // Secret (ty=3 → y≈96) : fruit isolé sur plateforme secrète
    [4620, 96],
  ],

  // Trampolines (x, y=548). Sections valides : A(0-480), B(544-1600), C(1664-2880), D(2944-3680), E(3744-4800).
  trampolines: [
    { x: 360,  y: 548 },   // section A → propulse vers plateforme [20,10] et franchit gap A-B
    { x: 4420, y: 548 },   // section E → relance vers route haute finale [144,7] + secret [142,3]
  ],

  // Spikes : triplet groupé sur section B (rappel niv 1, plus serré).
  spikes: [
    { x: 1100, y: 560 }, { x: 1132, y: 560 }, { x: 1164, y: 560 },  // section B, triplet aligné
  ],

  // Boxes : 2 boîtes box2 (rose) en l'air, accessibles depuis sol ou plateforme.
  boxes: [
    { x: 2200, y: 380, type: 'box2' },   // section C, juste avant le fire 2200 (signal "regarde au-dessus")
    { x: 4280, y: 380, type: 'box2' },   // section E, respiration, +50 bonus optionnel
  ],

  // Fires : 2 fires en phase opposée au climax (section C).
  //   period 2000 ms, phase 0 et 0.5 = on/off alternés → fenêtre de passage permanente mais étroite.
  //   y=544 = base flamme posée sur sol.
  fires: [
    { x: 2200, y: 544, period: 2000, phase: 0   },   // fire A : on/off classique
    { x: 2260, y: 544, period: 2000, phase: 0.5 },   // fire B : phase inverse → quand A est on, B est off
  ],

  // Saws : 2 saws.
  //   1) "vitrine" en hauteur section B (introduction visuelle, ne croise pas le chemin obligé)
  //      x=1280, y=288 (en l'air, ≈ ty=9), range=80, speed=80 (lente, lisible)
  //   2) "climax" en suspension section D au-dessus du gap, plus rapide
  //      x=2950, y=320, range=120, speed=160 (passage tendu sous la plateforme [97,5])
  saws: [
    { x: 1280, y: 288, range: 80,  speed: 80  },   // vitrine, range 80 = patrouille 1200..1360
    { x: 2950, y: 320, range: 120, speed: 160 },   // climax, range 120 = patrouille 2830..3070
  ],

  // FallingPlatforms : 2 plateformes-pont, placées dans les gaps C-D et D-E.
  //   - 2480 : milieu de section C, force un saut rapide au-dessus du fire (le joueur tombe sinon)
  //     ⚠ ATTENTION : 2480 est SUR la section C (1664-2880), donc c'est une plateforme posée
  //     au sol qui s'effondre = trap au sol (le joueur la prend pour du sol normal). Cohérent.
  //   - 3560 : dans la section D (2944-3680), associée à la saw climax pour forcer le mouvement.
  fallingPlatforms: [
    { x: 2480, y: 560, delay: 400 },   // section C, juste après le fire double, force la continuité
    { x: 3560, y: 560, delay: 400 },   // section D, à la sortie du climax sous la saw 2950
  ],

  next: null,
};
```

## Diff vs version précédente

### Ajouté
- **2 fires en phase opposée** (2200 / 2260, phase 0 / 0.5) → introduit le timing alterné
- **2 saws** : une "vitrine" lente en hauteur section B (apprentissage visuel sans risque) + une "climax" rapide en suspension section D
- **2 fallingPlatforms** (2480 et 3560) qui combinent avec fire et saw pour le pic de difficulté
- **Plateforme secrète** [142, 3, 4, 1] accessible via trampoline final + double saut
- **Route haute continue** sur tout le climax (plateformes ty=8..5)
- **5 sections de sol** au lieu de 4 (gaps mieux répartis, narration plus claire)

### Retiré
- L'escalier "courbe ascendante puis descendante" du layout précédent (14 plateformes alignées sur des hauteurs croissantes) qui était joli mais répétitif
- 1 trampoline (avant 3 → maintenant 2) pour réserver le trampoline final à la révélation du secret
- 2 spikes sur section 3 (3700, 3732) qui répétaient le pattern niv 1 sans nouvelle intention
- 2 spikes sur section 4 (4200, 4232) qui rendaient l'approche du flag stressante sans raison

### Déplacé
- Triplet de spikes maintenu sur section B (1100, 1132, 1164) mais resserré : 32 px d'espacement vs 32 dans l'ancien → identique en réalité, mais sert maintenant de référence visuelle pour la pente d'esquive
- Boxes converties en box2 (cohérent thème bonbon) et déplacées à 2200 (signal fire) et 4280 (respiration récompense)

### Justification
- L'ancien niv 2 avait beaucoup de plateformes mais aucune mécanique câblée (fire/saw/falling absentes). Maintenant, chaque mécanique a un rôle narratif.
- Les 2 saws en escalier d'apprentissage (vitrine lente → climax rapide) suivent le principe "introduit en safe puis durci".
- Les 2 fires en phase opposée enseignent le timing sans frustration : il y a toujours une fenêtre de passage.

## Risk / reward & secrets

- **Route safe** : sol continu autant que possible. Esquiver les 3 spikes en sautant (largeur du triplet = 96 px = 1 saut). Au climax, attendre qu'un fire soit off puis foncer entre les deux (les phases alternées garantissent toujours une fenêtre). Sauter rapidement la falling 2480, longer le sol section D en restant à l'extrême gauche pour éviter la saw 2950 (sa range 120 → x=2830..3070, donc en bordure droite de section C 2880, on peut être au sol et la saw passe au-dessus à y=320). Falling 3560 idem : saut rapide. Drapeau au sol section E. Rapporte ~14/23 fruits.
- **Route haute** : enchaîner les plateformes [37,9] → [55,10] → [63,8] (skip fire 2200) → [72,10] → [80,7] → [88,7] → [97,5] (route premium climax, fruits 3180 et 3240) → [108,8] → [120,10] → [128,8] → [136,6] → [144,7] (route flag haute). Rapporte 7 fruits premium exclusifs.
- **Secret** : 1 fruit isolé à (4620, 96), sur plateforme [142, 3, 4, 1]. Accessible uniquement en : utiliser trampoline 4420 (boost ~12 tuiles depuis y=576 → y≈204) puis double saut depuis le pic du rebond pour atteindre ty=3 (y=96). Si raté, retombe sur plateforme [136,6] ou [144,7] sans dégât.

## Playtesting checklist

- [ ] Tous les objets reposent sur un sol existant (pas dans un gap)
  - trampolines 360 (section A), 4420 (section E) → OK
  - spikes 1100/1132/1164 (section B 544-1600) → OK
  - fires 2200/2260 (section C 1664-2880) → OK
  - saw 1280 (en l'air au-dessus section B, valide) ; saw 2950 (en l'air au-dessus du gap C-D : c'est INTENTIONNEL, la saw n'a pas besoin d'un sol sous elle, elle est suspendue)
  - falling 2480 (section C) → OK ; falling 3560 (section D 2944-3680) → OK
  - boxes 2200/4280 → OK
- [ ] Aucun saut > 10 tuiles — gaps max = 60 px (~2 tuiles) ; passages saw demandent double saut bien dosé mais pas plus
- [ ] Aucune plateforme > 6 tuiles au-dessus du sol sans trampoline en amont :
  - [97,5] = 13 tuiles au-dessus du sol → atteinte via [88,7] (Δ=2 tuiles, OK)
  - [142,3] = 15 tuiles au-dessus → atteinte via trampoline 4420 + plateforme [136,6] (Δ=3, OK)
- [ ] Mécanique saw introduite en safe avant d'être combinée — oui, saw 1280 en "vitrine" hors trajectoire, puis saw 2950 en climax
- [ ] Mécanique fire combinée ↔ falling — oui, fires 2200/2260 puis falling 2480 dans la même section
- [ ] Drapeau accessible sans dégât obligatoire — oui, route safe au sol section E + flag à x=4720 dans section E (3744-4800)
- [ ] Total fruits = 23 (cohérent ; cible 18-24)
- [ ] Variation x/y des fruits (pas alignés)
- [ ] La saw 2950 a-t-elle assez de place ? range=120, x=2950 → patrouille 2830..3070. Section C finit à 2880, section D commence à 2940. Donc la saw croise le gap C-D et menace la sortie de section C / l'entrée de section D, ce qui est l'effet souhaité. y=320 → en l'air, le joueur au sol y=540 ne la touche que s'il saute ; en saut simple il monte à y≈412 (sol -128px), donc il ne la touche pas en restant en bas. Pour passer en route haute via [97,5] à y=160, il est AU-DESSUS de la saw → safe par le haut.

## Risques / dépendances

- Aucune dépendance moteur : `bg_purple` est déjà chargé, fires/saws/fallingPlatforms sont déjà câblés en `GameScene.create()`.
- ⚠ La saw 2950 (y=320, range=120, speed=160) est le passage le plus difficile du niveau. Si en playtest elle paraît injuste, baisser speed à 130 ou réduire range à 100. Garder y=320 (entre le sol y=540 et la plateforme route haute y=160, soit à mi-hauteur → menace double).
- ⚠ Les 2 fires en phase opposée (period 2000, phase 0 / 0.5) signifient qu'à tout instant l'un des deux est on, l'autre off. La fenêtre est la transition (~200 ms de battement) → exiger un timing serré mais possible. Si trop dur, passer phase 0.4 / 0.9 ou élargir period à 2400.
- ⚠ La plateforme [142, 3, 4, 1] (secret) est à ty=3 = y monde 96. Vérifier que le sprite trampoline (qui propulse à y_min ≈ 200) + double saut (encore ~256 px de hauteur) atteint bien y=96. Calcul : depuis y=540 (sol), trampoline → y≈540 - 373 = 167 ; double saut depuis y=167 → encore ~-256 → théorique y=-89, donc largement OK. La plateforme est atteignable.
- Aucun nouvel asset à charger.
