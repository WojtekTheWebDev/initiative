# Terrain models: sources and licences

Every model in `models/` is released under **CC0 1.0** (public domain
dedication, <https://creativecommons.org/publicdomain/zero/1.0/>). Credit is
not required, but it is given below with thanks.

Only the models the table uses are kept, so the folder stays small. Colours
(`colors.json` and the sidecars), scale, placement and lighting are applied
when baking (`npm run bake:terrain`), not stored here. Each sidecar
`<key>.json` puts one piece of art together from these models.

## Kenney Nature Kit

| Files | Author | Source | Licence | Changes |
| ----- | ------ | ------ | ------- | ------- |
| `bridge_stoneRound`, `crops_wheatStageB`, `flower_*`, `grass`, `grass_large`, `grass_leafs`, `log`, `log_large`, `log_stack`, `plant_bush`, `plant_bushDetailed`, `plant_bushLarge`, `plant_bushSmall`, `rock_small*`, `stone_small*`, `stone_tall*`, `stump_old`, `stump_oldTall`, `stump_round`, `tent_detailedOpen`, `tent_smallOpen`, `tree_*` | Kenney (kenney.nl) | Nature Kit 2.1, <https://kenney.nl/assets/nature-kit> (`Models/GLTF format/`) | CC0 1.0 | None; the files are copied as they are. |

The kit's `License.txt` reads: "License: (Creative Commons Zero, CC0) ... This
content is free to use in personal, educational and commercial projects."

## Quaternius

| File | Model | Author | Source | Licence | Changes |
| ---- | ----- | ------ | ------ | ------- | ------- |
| `watch-tower.glb` | Watch Tower | Quaternius | <https://poly.pizza/m/cMxuj2gt7D> | CC0 1.0 | None. |
| `guard-tower.glb` | Guard Tower | Quaternius | <https://poly.pizza/m/sbaM8I229r> | CC0 1.0 | None. |
| `stone-tower.glb` | Stone Tower | Quaternius | <https://poly.pizza/m/dJLAD6p90F> | CC0 1.0 | None. |
| `bonfire.glb` | Bonfire | Quaternius | <https://poly.pizza/m/k1e0cOzi8A> | CC0 1.0 | None. |
| `ruins-*.glb` | Modular Ruins Pack | Quaternius | <https://poly.pizza/m/F2LAK03B0r> | CC0 1.0 | Each file is one piece cut out of the pack (`Wall_Broken`, `Wall_Half`, `Wall_Double_Broken`, `Wall_ArchRound_Broken`, `Arch_Round`, `Column_Round`, `Column_Round_Short`, `Column_Square`, `Bricks`, `Brick`, `Floor_Squares`, `Floor_Hole_Corner`, `DeadTree_1` to `DeadTree_3`), with only the data it uses; texture coordinates and textures were dropped, so the dead trees take their bark colour from the sidecars. |

Each poly.pizza page lists the licence as "CC0 1.0". More of Quaternius's free
packs: <https://quaternius.com>.

## Drawn as SVG

Leaf litter and puddles are flat marks on the felt, not models. They are drawn
as SVG in `components/map/TableArt.tsx`.
