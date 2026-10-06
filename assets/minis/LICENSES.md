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

| File | Model | Author | Source | Licence | Changes |
| ---- | ----- | ------ | ------ | ------- | ------- |
| `spider.glb` | Spider, from the Animated Enemies bundle | Quaternius | <https://poly.pizza/m/yRYJiAJyiM> | CC0 1.0 | None besides the common ones. |
| `orc.glb` | Orc | Quaternius | <https://poly.pizza/m/5vO2YJsPEf> | CC0 1.0 | None besides the common ones. |
| `mushroom-king.glb` | Mushroom King, from the Ultimate Monsters bundle | Quaternius | <https://poly.pizza/m/grnFTziU8u> | CC0 1.0 | None besides the common ones. |
| `dragon.glb` | Dragon Evolved | Quaternius | <https://poly.pizza/m/LlwD0QNUPj> | CC0 1.0 | Posed with its `Flying_Idle` clip. |
| `drake.glb` | Dragon | Quaternius | <https://poly.pizza/m/VBvzjFIYws> | CC0 1.0 | Has no idle clip, so it stands in its rest pose; every clip was removed. |
| `skeleton.glb` | Skeleton | Quaternius | <https://poly.pizza/m/yq5ATpujSt> | CC0 1.0 | None besides the common ones. |
| `zombie.glb` | Zombie | Quaternius | <https://poly.pizza/m/VlXjG0N8Eg> | CC0 1.0 | None besides the common ones. |
| `cursed-tome.glb` | Evil Book | Quaternius | <https://poly.pizza/m/8b1pEj17PF> | CC0 1.0 | None besides the common ones. |
| `mimic.glb` | Mimic | Quaternius | <https://poly.pizza/m/B8HrWzkuNp> | CC0 1.0 | None besides the common ones. |
| `tentacle.glb` | Tentacle | Quaternius | <https://poly.pizza/m/BR1vpIvvvv> | CC0 1.0 | Posed with its `Tentacle_Idle` clip. |
| `ooze.glb` | Green Blob | Quaternius | <https://poly.pizza/m/y4kJh8EeYS> | CC0 1.0 | None besides the common ones. |
| `snow-ape.glb` | Yeti | Quaternius | <https://poly.pizza/m/ceRHrn8HHE> | CC0 1.0 | None besides the common ones. |
| `demon.glb` | Demon | Quaternius | <https://poly.pizza/m/LnfIziKv4o> | CC0 1.0 | None besides the common ones. |
| `blue-imp.glb` | Blue Demon | Quaternius | <https://poly.pizza/m/S7jYW6Amye> | CC0 1.0 | None besides the common ones. |
| `tribal-mask.glb` | Tribal | Quaternius | <https://poly.pizza/m/t91lDHaqRW> | CC0 1.0 | Posed with its `Flying_Idle` clip. |
| `bat.glb` | Bat | Quaternius | <https://poly.pizza/m/hNO9XvjlKa> | CC0 1.0 | Has no idle clip, so it stands in its rest pose; every clip was removed. |
| `wolf.glb` | Wolf | Quaternius | <https://poly.pizza/m/P1gU3Qkr9r> | CC0 1.0 | None besides the common ones. |
| `rat.glb` | Rat | Quaternius | <https://poly.pizza/m/iltq5bVNaV> | CC0 1.0 | Posed with its `Rat_Idle` clip. |
| `snake.glb` | Snake | Quaternius | <https://poly.pizza/m/x9x0viZs8V> | CC0 1.0 | Posed with its `Snake_Idle` clip. |
| `toad.glb` | Frog | Quaternius | <https://poly.pizza/m/37wofOCOzG> | CC0 1.0 | None besides the common ones. |
| `landshark.glb` | Fish | Quaternius | <https://poly.pizza/m/7V4gaDMQV8> | CC0 1.0 | None besides the common ones. |
| `raptor.glb` | Dino | Quaternius | <https://poly.pizza/m/wuerCFCWNR> | CC0 1.0 | None besides the common ones. |
| `void-stalker.glb` | Alien | Quaternius | <https://poly.pizza/m/RRliSQBP7r> | CC0 1.0 | None besides the common ones. |
| `mushnub.glb` | Mushnub | Quaternius | <https://poly.pizza/m/LWKmS30Xxl> | CC0 1.0 | None besides the common ones. |
| `armabee.glb` | Armabee | Quaternius | <https://poly.pizza/m/42djT5zJnx> | CC0 1.0 | Posed with its `Flying_Idle` clip. |

Each poly.pizza page lists the licence as "CC0 1.0". More of Quaternius's free
packs: <https://quaternius.com>.
