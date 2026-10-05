# Mini models: sources and licences

Every model here is released under **CC0 1.0** (public domain dedication,
<https://creativecommons.org/publicdomain/zero/1.0/>). Credit is not required,
but it is given below with thanks.

Changes made to every file: all animation clips but one idle pose were removed
(the kept clip is named `Idle`), spare props were removed where noted, and
unused data was pruned, so the files stay small. Colours, scale, the base and
the lighting are applied when baking (`npm run bake:minis`), not stored here.

## Heroes

| File | Model | Author | Source | Licence | Changes |
| ---- | ----- | ------ | ------ | ------- | ------- |
| `neutral.glb` | Knight, from KayKit Character Pack: Adventurers 1.0 | Kay Lousberg (KayKit) | <https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0> (`Characters/gltf/Knight.glb`) | CC0 1.0 | Kept the round shield and one-handed sword; removed the helmet, cape and other props. Baked in flat primer grey (`"primer"` in `neutral.json`). |
| `knight.glb` | Knight, KayKit Adventurers | Kay Lousberg (KayKit) | same pack, `Characters/gltf/Knight.glb` | CC0 1.0 | Kept the badge shield and one-handed sword; removed the other shields, the off-hand and two-handed swords. |
| `barbarian.glb` | Barbarian, KayKit Adventurers | Kay Lousberg (KayKit) | same pack, `Characters/gltf/Barbarian.glb` | CC0 1.0 | Removed the off-hand axe, two-handed axe and mug. |
| `mage.glb` | Mage, KayKit Adventurers | Kay Lousberg (KayKit) | same pack, `Characters/gltf/Mage.glb` | CC0 1.0 | Kept the staff; removed the spellbooks and wand. |
| `rogue.glb` | Rogue, KayKit Adventurers | Kay Lousberg (KayKit) | same pack, `Characters/gltf/Rogue.glb` | CC0 1.0 | Kept both knives; removed the crossbows and throwable. |
| `hooded-rogue.glb` | Rogue (Hooded), KayKit Adventurers | Kay Lousberg (KayKit) | same pack, `Characters/gltf/Rogue_Hooded.glb` | CC0 1.0 | Kept the one-handed crossbow; removed the knives, two-handed crossbow and throwable. |

The KayKit pack's licence file reads: "License: (Creative Commons Zero, CC0)
... This content is free to use in personal, educational and commercial
projects." See also <https://kaylousberg.itch.io/kaykit-adventurers>.

## Monsters

| File | Size | Model | Author | Source | Licence | Changes |
| ---- | ---- | ----- | ------ | ------ | ------- | ------- |
| `spider.glb` | S | Spider, from the Animated Enemies bundle | Quaternius | <https://poly.pizza/m/yRYJiAJyiM> | CC0 1.0 | None besides the common ones. |
| `orc.glb` | M | Orc | Quaternius | <https://poly.pizza/m/5vO2YJsPEf> | CC0 1.0 | None besides the common ones. |
| `mushroom-king.glb` | L | Mushroom King, from the Ultimate Monsters bundle | Quaternius | <https://poly.pizza/m/grnFTziU8u> | CC0 1.0 | None besides the common ones. |
| `dragon.glb` | XL | Dragon Evolved | Quaternius | <https://poly.pizza/m/LlwD0QNUPj> | CC0 1.0 | Posed with its `Flying_Idle` clip. |

Each poly.pizza page lists the licence as "CC0 1.0". More of Quaternius's free
packs: <https://quaternius.com>.
