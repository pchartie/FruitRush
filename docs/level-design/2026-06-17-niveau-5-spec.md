# Spec — Niveau 5 : Terres Brûlées (révision : durci + allongé)

## Intent (1 phrase)
Pousser le climax du jeu à l'extrême : un parcours « terres brûlées » devenu le **plus long du jeu** (worldWidth 7200) saturé de feux et de scies aériennes, où le timer 60 s rend chaque hésitation coûteuse — tout en restant fair-play (route safe continue, dangers pré-signalés, franchissabilité prouvée par relais).

## Diff vs version précédente (durcissement demandé par le user)
- **worldWidth : 5600 → 7200** (le plus long du jeu).
- **Sections sol : 9 (A–I) → 12 (A–L)**. Ajout de 3 sections climax/respiration (H climax, I îlot étroit climax, J climax) + reprofilage de la queue (K respiration, L sous le flag). Sections A–G **inchangées** (0–4576).
- **Gaps : 8 → 11** (3 nouveaux gaps climax avec relais).
- **fires : 3 → 9** (répartis sol + sommets de piliers, surtout développement et climax). Tous `period ≥ 1500`, phases désynchronisées (0 / 0.2 / 0.25 / 0.33 / 0.4 / 0.5 / 0.6 / 0.66 / 0.75). Note implé : les 2 feux de la section J sont posés en SOMMET de pilier (sol J saturé piliers + spikes), pas au sol.
- **saws : 3 → 7** (patrouilles aériennes réparties C → J, plus seulement au climax). Trajectoires vérifiées (marge ≥ 32 px avec toute plateforme). Chaque saw marquée par fruits-breadcrumbs.
- **fruits : 23 → 28** (proportionnel à l'allongement, variés en x/y, breadcrumbs sur saws).
- **fallingPlatforms : 6 → 9** (relais sur les 3 nouveaux grands gaps).
- **trampolines : 1 → 2** (ajout d'un trampoline relais sur le gap I-J de 9 tuiles).
- Préservé : herbe ORANGE (94/95/96/116/117/118), PILIERS, `bg_pink`, `bgColor '#7a2e1a'`, `next: null`. `LEVELS[4].next` reste = 5.

## Thème & assets
- bgKey : `bg_pink` (déjà préchargé). bgColor `#7a2e1a`.
- Tileset : kit `herbe ORANGE` — frames TL=94, T=95, TR=96, ML=116, MC=117, MR=118.
- worldWidth : 7200.
- Convention plateformes : **PILIERS** — `th = 18 - ty` au-dessus d'un sol, `th = 20 - ty` au-dessus d'un gap. Politique « moins de piliers, plus larges » (tw ≥ 4 en majorité), overlaps esthétiques 1-2 tuiles.
- fruitTypes : `['orange', 'apple', 'cherries']`.
- Mécaniques : spikes (sol + sommets) / trampolines (relais grands gaps) / boxes / fires (sol + sommets, **densifiés**) / saws (patrouilles aériennes, **densifiées**) / fallingPlatforms (relais).

## Sections sol & gaps (bornes en x monde)

| Sec | tx | tw | px range | rôle |
|-----|----|----|----------|------|
| A | 0 | 10 | 0 – 320 | intro safe (spawn x=80) |
| B | 14 | 20 | 448 – 1088 | intro mécaniques (spike+fire sol, box) |
| C | 40 | 18 | 1280 – 1856 | développement (saws vitrine, spike+fire) |
| D | 64 | 15 | 2048 – 2528 | CLIMAX vague 1 |
| E | 89 | 6 | 2848 – 3040 | îlot étroit climax (fire sommet) |
| F | 105 | 15 | 3360 – 3840 | CLIMAX vague 2 |
| G | 128 | 15 | 4096 – 4576 | CLIMAX vague 3 |
| H | 150 | 11 | 4800 – 5152 | CLIMAX vague 4 (NOUVEAU, feux + saw) |
| I | 170 | 9 | 5440 – 5728 | îlot étroit climax (NOUVEAU, fire sommet) |
| J | 188 | 13 | 6016 – 6432 | CLIMAX vague 5 (NOUVEAU, saw + fires) |
| K | 206 | 8 | 6592 – 6848 | respiration |
| L | 217 | 8 | 6944 – 7200 | sous le flag (x=7120) |

Gaps :
- A-B 320–448 = 4 t (saut simple confort)
- B-C 1088–1280 = 6 t (saut simple)
- C-D 1856–2048 = 6 t (saut simple)
- D-E 2528–2848 = 10 t (fallings 2640 + 2752)
- E-F 3040–3360 = 10 t (fallings 3152 + 3264)
- F-G 3840–4096 = 8 t (falling 3936 + double saut)
- G-H 4576–4800 = 7 t (falling 4688)
- H-I 5152–5440 = 9 t (fallings 5264 + 5376) **NOUVEAU**
- I-J 5728–6016 = 9 t (trampoline 5696 sur I + falling 5872) **NOUVEAU**
- J-K 6432–6592 = 5 t (double saut confort) **NOUVEAU**
- K-L 6848–6944 = 3 t (saut simple, respiration finale) **NOUVEAU**

## ASCII map (P=pilier, S=spike sol, s=spike sommet, F=fire sol, f=fire sommet, W=saw, X=falling, T=tramp, B=box, *=fruit, [F]=flag)

```
            INTRO          DÉVELOPPEMENT           ------------------ CLIMAX -----------------          RESPIRATION
A   B          C        D    E    F     G       H        I       J            K    L[F]
[==]g[====B====]g[====C====]g[=D=]g[E]g[==F==]g[=G=]g[==H==]g[I]g[===J===]g[==K==]g[=L=]
 F   S F      W  S F  WW    S    f   S  W       SW   fW    Wf    W   F  F    *      *  [F]
 T              X                X X      X      X    XX    TX
fires(9): B(896) C(1312) E-top(2944) G(4432) H(4960,5136) I-top(5520) J-top(6080,6368)
saws(7): C(1632) C2(1408hi) F(3616) G(4352) H(4960) I(5584) J(6224)
```

## Rythme — bornes en x monde
- Intro : 0 – 1088 (A + B)
- Développement : 1088 – 2048 (C + saws vitrine)
- Climax : 2048 – 6432 (D, E, F, G, H, I, J + grands gaps relayés) — 60 % du niveau, le plus long du jeu
- Respiration → flag : 6432 – 7200 (K + L)

Justification : l'intro rappelle les bases (spike/fire/box/tramp/double saut) sur sol large. Le développement densifie avec **deux** saws (une vitrine basse + une haute). Le climax (le cœur du niveau, étendu de 4 à 7 sections de sol) enchaîne trous géants relayés (10/10/8/7/9/9 t), sommets de piliers piégés sous des saws, et **feux multiples désynchronisés** au sol comme en sommet. La respiration finale (K, L) ramène le calme avec des fruits faciles avant le drapeau.

## Layout — voir l'objet `LEVELS[5]` dans `src/levels/levels.js` (source de vérité)

Piliers ajoutés/conservés par section (résumé) :
- A : escalier intro [1,14,4,4] + [3,12,4,6] (overlap 2) ; pilier route-haute [9,9,4,11] (cible tramp 272).
- B : [16,11] [23,9] [29,11].
- C : pilier gap B-C [36,8,4,12] ; [42,11] [49,9] [54,11].
- D : [64,11] [70,7] (premium, sommet piégé) [75,11].
- E : [89,9] (sommet fire).
- F : [105,10] (sommet spike) [111,7] (sous saw) [116,10].
- G : [128,11] [134,7] (sous saw, sommet spike) [139,11].
- H (NOUVEAU) : [150,11] [156,8] (sous saw H, sommet fire) [162,11].
- I (NOUVEAU) : [170,9] (sommet fire).
- J (NOUVEAU) : [188,11] (sommet fire) [194,8] (sous saw J, sommet spike) [197,11] (sommet fire, overlap 1 t).
- K : [206,12] [210,10] (escalier respiration, overlap).
- L : [219,9] route haute finale ; [217,4] SECRET (pilier géant).

### Colonnes plongeantes décoratives (effet profondeur, comme le 1er trou du niv 1)
Pour donner à TOUS les trous le rendu « colonne de terre qui plonge jusqu'au bas du viewport » (variante
« au-dessus d'un gap » : `th = 20 - ty`, terre jusqu'à y=640), au lieu d'un vide plat. Les gaps A-B et B-C
l'avaient déjà via leurs piliers route-haute ([9,9,4,11] et [36,8,4,12]). Ajout de **9 colonnes** (tw=4,
`ty` haut → sommet jump-through au-dessus des trajectoires) sur les 9 gaps restants :

| Gap | Colonne | ty / th | sommet y | placement |
|-----|---------|---------|----------|-----------|
| C-D | [58,9,4,11]  | 9 / 11 | 288 | bord gauche |
| D-E | [79,8,4,12]  | 8 / 12 | 256 | bord gauche (au-dessus fallings 2640/2752) |
| E-F | [95,8,4,12]  | 8 / 12 | 256 | bord gauche (au-dessus fallings 3152/3264) |
| F-G | [120,9,4,11] | 9 / 11 | 288 | bord gauche (au-dessus falling 3936) |
| G-H | [143,9,4,11] | 9 / 11 | 288 | bord gauche (au-dessus falling 4688) |
| H-I | [161,8,4,12] | 8 / 12 | 256 | bord gauche (au-dessus fallings 5264/5376) |
| I-J | [182,9,4,11] | 9 / 11 | 288 | décalée à droite du tramp 5696 (cône 5680..5712), left=5824 = 128 px de marge |
| J-K | [201,10,4,10]| 10 / 10| 320 | bord gauche |
| K-L | [214,10,4,10]| 10 / 10| 320 | cas mixte (déborde 1 t sur L, décoratif) |

Ces colonnes sont **purement décoratives** : seul le sommet (rangée d'herbe) est jump-through, placé assez
haut (ty 8..10) pour rester au-dessus des arcs de saut, des relais falling (y=560) et de l'apex du tramp 5696
(~y=175). Aucun élément gameplay existant déplacé/supprimé.

## Comptes de pièges (après révision)
- spikes : 13 sol + 5 sommets = 18 (sol : doublets/triplets B, C, D, F, G, J ; sommets : B 624, D 2256, F 3472, G 4304, J 6256).
- fires : **9** (sol : B 896, C 1312, G 4432, H 4960 + 5136 ; sommets : E 2944, I 5520, J-entrée 6080, J-sortie 6368). Tous `period ∈ [1700, 2000]`, phases variées (0 / 0.2 / 0.25 / 0.33 / 0.4 / 0.5 / 0.6 / 0.66 / 0.75).
- saws : **7** (C haute 1408, C basse 1632, F 3616, G 4352, H 4960, I 5584, J 6224). Marges ≥ 32 px vérifiées (voir inline).
- boxes : 2 (B 1024, K 6720 y=400).
- trampolines : 2 (A 272 → route haute ; I 5696 → relais gap I-J).
- fallingPlatforms : **9** (D-E ×2, E-F ×2, F-G ×1, G-H ×1, H-I ×2, I-J ×1).

## Justification de franchissabilité (gaps > 6 tuiles)
- D-E 10 t : relais 2640 + 2752 (sous-sauts ≤ 3.5 t).
- E-F 10 t : relais 3152 + 3264.
- F-G 8 t : relais 3936 + double saut depuis F.
- G-H 7 t : relais 4688 + double saut.
- H-I 9 t : relais 5264 + 5376 (sous-sauts ≤ 3.5 t).
- I-J 9 t : trampoline 5696 (sur I) propulse au-dessus, relais 5872 en secours, double saut vers J.
- J-K 5 t : double saut confort, pas de relais nécessaire.
- K-L 3 t : saut simple.

Aucun saut > 10 tuiles sans relais. Aucune plateforme > 6 t au-dessus du sol sans chaînage de piliers voisins (ty 11 → ty 7 = 4 t en double saut) ou trampoline en amont.

## Saws — vérification anti-chevauchement (marge ≥ 32 px)
- Saw C basse x=1632 y=176 range=80 : BB y 148..204 ; pilier [49,9] top y=288 → marge 84. ✓
- Saw C haute x=1408 y=128 range=64 : BB x [1316,1500] y 100..156 ; pilier [42,11] top y=352 → marge 196. ✓ (au-dessus du sol C, hors de toute tête de pilier).
- Saw F x=3616 y=144 range=120 : BB y 116..172 ; pilier [111,7] top y=224 → marge 52. ✓
- Saw G x=4352 y=144 range=128 : BB y 116..172 ; pilier [134,7] top y=224 → marge 52. ✓
- Saw H x=4960 y=144 range=112 : BB x [4820,5100] y 116..172 ; pilier [156,8] top y=256 → marge 84. ✓
- Saw I x=5584 y=160 range=96 : BB x [5460,5708] y 132..188 ; pilier [170,9] top y=288 → marge 100. ✓
- Saw J x=6224 y=144 range=120 : BB y 116..172 ; pilier [194,8] top y=256 → marge 84. ✓

## Risk / reward & secrets
- Route safe : sols A→L en sautant les gaps (simple/double), grands gaps via fallings/tramp, en marchant au sol sous les piliers (tiges traversables) pour éviter les sommets piégés. ~70 % des fruits.
- Route haute : sommets premium [70,7] [111,7] [134,7] [156,8] sous les saws (fruits 144/120 px d'altitude).
- Secret : fruit [7000,64] au sommet du pilier géant [217,4,4,14] (section L), accès en double saut latéral depuis [219,9].

## Playtesting checklist
- [ ] Tous les objets reposent sur un sol existant (sauf fallingPlatforms, au-dessus des gaps).
- [ ] Aucun saut > 10 tuiles sans relais.
- [ ] Chaque mécanique introduite safe avant combinaison (fire sol B avant fire sommet ; saw vitrine C avant saws empilées).
- [ ] Drapeau L atteignable sans dégât (K→L gap 3 t, sol L clean hors secret).
- [ ] Total fruits = 28.
- [ ] Marges anti-chevauchement saw ≥ 32 px (voir ci-dessus).
- [ ] fires `period ≥ 1500`, phases désynchronisées.

## Risques / dépendances
- Aucune dépendance moteur : `bg_pink` préchargé, frames orange dans `terrain`, tous pièges câblés.
- `LEVELS[4].next = 5` déjà en place ; `LEVELS[5].next = null`.
- Densité volontairement maximale au climax (D→J) — lisibilité assurée par fruits-breadcrumbs sur chaque saw.
