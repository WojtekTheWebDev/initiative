# Initiative: Iteration 2 Plan (targets drive the map)

> **Completed** (T10 to T16 merged on `main`, October 2026). Kept as a record; `docs/DESIGN.md` is the current spec.

This plan turns the first round of user feedback into tasks that separate agents can pick up. The format matches `docs/PLAN.md`: each task lists what it depends on, which files it owns, the contract it must keep, and how to tell it is done.

**Every agent must first read** `AGENTS.md`, `docs/DESIGN.md`, this file, and the Next.js guides in `node_modules/next/dist/docs/` for any Next API it uses.

**Write it as if it were the first iteration.** This plan talks about "removing" and "replacing" things only so you know what to touch. The code, comments, tests, `docs/DESIGN.md` and `README.md` you leave behind must describe only the current design, with no "now", "no longer", "instead of ghosts" or "used to be". Delete what is replaced rather than deprecating it: no aliases, no shims and no commented-out code. See the first rule in `AGENTS.md`. Reviewers will reject before-and-after wording.

## Feedback being addressed

1. **The split between my work and team work is useless.** Remove the two territories (team battlefield and your keep) completely.
2. **Many-to-many targeting should shape the map.** Figures should be placed by who targets what. If hero 1 targets monsters A and B, then A and B are both pulled toward hero 1. If hero 2 also targets B, then B sits between them, and so on. A cluster of connected heroes and monsters gathers together on the map.
3. **Show targets with small arrows.** Every hero gets an arrow to each monster it targets.
4. **It should look like a tabletop game, with real miniature models.** Emoji were only for the first phase. Out of five directions the user picked **painted minis on felt**: 3D models seen from a three-quarter angle, standing on a wargame table. The mockup's felt was called a good starting point, but the finished table has to look interesting.

What the user liked and must keep working: moving around the map (pan, zoom, fly-to), dragging figures, drop-to-assign, the unfought alarm, the side panel and the trophies.

## Product decisions in this plan

The user confirmed every decision below on 2026-10-02.

| # | Topic | Decision |
| - | -------- | ------- |
| D1 | Territories | Removed from the UI, the types and the domain. `pos.x` has no meaning any more. Existing YAML stays valid and needs no migration. |
| D2 | What a stored `pos` means | It is a **home** (an anchor), for monsters and for idle heroes. Every figure with a home is held to it loosely, with the same weak spring, so clusters gather together and anything in their way is nudged aside. The drawn position is never saved. Dragging a figure moves its home. |
| D3 | Where an engaged hero stands | No stored position, as today. The layout places it between all of its targets. |
| D4 | Main vs. secondary targets | Kept. `targets[0]` is still the main target. The hero is pulled harder toward it, so it stands closer, and its arrow is solid. Secondary arrows are dashed. Plain drop and Shift+drop keep their current meaning. |
| D5 | Ghost markers | Removed. The arrows replace them. Clicking an arrow opens the popover that the ghost had (**Make main** and **Remove**). |
| D6 | Layout engine | A hand-rolled, deterministic force simulation in pure TypeScript with no library. The same world always gives the same picture. |
| D7 | Movement | When the layout changes after a drop, figures glide to their new places (about 350 ms). With `prefers-reduced-motion`, they jump. |
| D8 | Art direction | Painted minis on a felt wargame table, seen from a three-quarter angle (38° elevation). Chosen by the user. |
| D9 | Where the models come from | CC0 low-poly glTF packs (KayKit, Quaternius), recoloured in one painted style. Monsters: 4, one per size. Heroes: every fitting hero model in those packs, plus a neutral adventurer. Licences are listed in `assets/minis/LICENSES.md`. AI-generated models may be added later, so adding a model must only mean dropping in a `.glb` and rebaking. |
| D10 | How models reach the screen | Baked, never rendered live. A dev-only script renders each model once into a WebP image plus an anchor, and the output is committed. The map stays SVG with hand-rolled pan and zoom; each figure is one `<image>`. No WebGL ships to the browser. |
| D11 | Light and dark mode | The table is a physical object, so it looks the same in both. Only the UI around it (side panel, toasts, alarm) follows the theme. |
| D12 | Terrain | Generated from the world coordinates, deterministic, never stored. Biomes change slowly across the infinite map, so panning feels like exploring. Terrain is decoration only and never affects the layout. |
| D13 | Which mini a hero gets | Each hero picks its own mini: a new optional `mini: <model id>` field on the hero. A hero with no `mini`, or with an id that isn't in the roster, is drawn as the neutral adventurer. `class` stays a plain free-text label with no suggestions and no effect on the art. |
| D14 | Which mini a monster gets | Its size decides (S goblin, M orc, L troll, XL dragon). Monsters have no mini field. |

## Dependency graph

```
T10 Remove territories ──┐
T11 Force solver (pure) ─┼─► T13 Targets drive the layout ─┬─► T15 Painted minis ─────────┬─► T14 Integration pass
T12 Target arrows ───────┘                                 └─► T16 Felt table and terrain ─┘
```

T16 starts after T13 and uses T15's bake script for its terrain pieces.

| Wave | Tasks (can run in parallel) |
| ---- | --------------------------- |
| 1 | T10, T11, T12 |
| 2 | T13 |
| 3 | T15, T16 (T16 bakes its terrain pieces once T15's bake script exists) |
| 4 | T14 |

Layout lands before art, so the minis and terrain are tuned against the final layout.

In wave 1, T10 and T12 both make small edits to `components/Board.tsx`, `components/map/DragOverlay.tsx`, `components/map/useFigureDrag.ts` and `lib/map/layout.ts`. Keep those edits minimal, with the logic in your own files. If agents run in separate worktrees, merge wave 1 one task at a time (T11 first, since it only adds new files, then T10, then T12).

## Shared contracts

### Layout output (after T12 and T13)

```ts
// lib/map/layout.ts
export type PlacedMonster = {
  monster: Monster;
  pos: Pos;          // where it is drawn (may differ from monster.pos, its home)
  radius: number;
  unfought: boolean;
};                   // `territory` is gone (T10)

export type PlacedHero = {
  hero: Hero;
  pos: Pos;
  /** Living, de-duplicated targets in order; [0] = main. Empty = idle. */
  targets: string[];
};                   // replaces `mainTarget` (T12)

export type WorldLayout = { monsters: PlacedMonster[]; heroes: PlacedHero[] };
                     // `ghosts` is gone (T12)
```

### Arrows (T12)

```ts
// lib/map/links.ts
export type PlacedLink = { heroId: string; monsterId: string; main: boolean; from: Pos; to: Pos };
/** One link per (hero, living target). `from`/`to` are already trimmed to the figures' rims. */
export function linksOf(layout: WorldLayout): PlacedLink[];
```

Arrows are derived from the layout and are never stored. Anything that moves a figure, such as a live drag or the glide animation, moves its arrows for free.

### Force solver (T11)

```ts
// lib/map/force.ts
export type ForceNode = {
  id: string;
  radius: number;            // collision radius (base radius; padding is added by the solver)
  start: Pos;                // initial position
  pinned?: boolean;          // never moves (stays at `start`)
  anchor?: { pos: Pos; strength: number };   // spring toward a home point
  /** A box below the node (e.g. a monster's name label) that other nodes are pushed out of. */
  keepOut?: { width: number; height: number; gap: number };
};
export type ForceLink = { source: string; target: string; length: number; strength: number };
export type RelaxOptions = { iterations?: number };
/** Pure and deterministic. Returns the final position of every node. */
export function relax(nodes: ForceNode[], links: ForceLink[], opts?: RelaxOptions): Map<string, Pos>;
```

### Server Actions

These are unchanged. `moveMonster(id, pos)` now saves the monster's **home**, so the client must send the home and not the drawn position (see T13).

---

## T10: Remove territories

**Depends on:** nothing. **Size:** small to medium.

**Goal:** no trace of "team battlefield" or "your keep" in the UI, the types, the domain or the docs. The map is a single field.

**Do:**
1. `lib/types.ts`: delete `Territory`.
2. `lib/domain/derived.ts`: delete `territoryOf` and its tests in `derived.test.ts`. Remove it from any re-exports.
3. `lib/map/layout.ts`: remove `territory` from `PlacedMonster` and from `layoutWorld`, and update `layout.test.ts`. Touch nothing else in this file, because T12 and T13 also edit it.
4. `components/map/Territories.tsx`: delete the file, and remove `<Territories>` from `MapCanvas.tsx`. Keep the grid.
5. `components/map/MonsterFigure.tsx`: replace the per-territory `RIM` and `FILL` with one neutral palette that reads well in both light and dark mode (see `app/globals.css`). The red unfought pulse, the amber selection ring and the green or purple drop hints must still stand out against it.
6. `components/map/useFigureDrag.ts` and `components/map/DragOverlay.tsx`: remove `crossed` and `crossing`, and the border glow.
7. `components/panel/MonsterForm.tsx`: remove the "Team or Keep?" fieldset. `spawnAt` takes no argument.
8. `components/panel/helpers.ts`: replace `monsterSpawn(view, side, rand)` with `monsterSpawn(view, rand)`, the visible centre plus jitter (the same as `heroSpawn`; it is fine for one to call the other). Delete `BORDER_MARGIN`. Rewrite the `monsterSpawn` tests in `helpers.test.ts`. Update the call in `SidePanel.tsx`.
9. `components/panel/MonsterPanel.tsx`: remove the Territory row. `components/UnfoughtAlarm.tsx`: remove the Team/Keep label.
10. `lib/seed-data.test.ts`: drop the "covers both territories" check, but keep "every size".
11. `data.example/monsters.yaml`: fix the header comment, which mentions x < 0 and x ≥ 0. Positions can stay as they are.
12. Docs: in `docs/DESIGN.md`, remove Territory from Concepts, the data-model comments, the "Territory comes from the sign of `pos.x`" rule, the Map → Territories bullet, the "crossing x = 0" drag rule and the "Team or Keep?" form field. In `README.md`, remove the territory paragraph and the "across the border" sentence. In `AGENTS.md`, remove "no `layer` (comes from the sign of `pos.x`)".

**Done when:** `grep -rniE "territor|keep|team battlefield|BORDER_MARGIN" app components lib docs/DESIGN.md README.md AGENTS.md` finds nothing relevant. (The word "team" may stay where it means the engineering team.) `npm run lint`, `npx tsc --noEmit`, `npm test` and `npm run build` all pass. Checked by hand: no banners, tint or border, and a new monster appears in the middle of the view.

---

## T11: Force solver (pure)

**Depends on:** nothing. **Owns:** `lib/map/force.ts` and `lib/map/force.test.ts` (both new). Export them from `lib/map/index.ts`. **Size:** medium.

**Goal:** a small, generic, deterministic force-directed solver, using the contract above. It knows nothing about heroes or monsters. T13 maps the world onto it.

**Algorithm (keep it simple, in the style of d3-force, written by hand):**
- Positions start at `start`. Velocities start at 0.
- Run a fixed number of iterations (default 300). `alpha` decays from 1 to about 0.001 along the way. Each iteration:
  - **Links:** a spring pulls or pushes the two ends toward `length`, scaled by `strength * alpha`. Split the correction between the two ends, unless one of them is pinned, in which case the other end takes all of it.
  - **Anchors:** move each node toward `anchor.pos` by `anchor.strength * alpha`.
  - **Collision:** for every pair whose circles overlap (radius + radius + `PADDING`, an exported constant of about 10), push them apart. A pinned node never moves; the other node takes the whole push.
  - **Keep-out boxes:** push any other node out of the box below a node that has `keepOut`. The box is centred on x, its top is at `y + radius + gap`, and it has the given width and height.
  - Apply velocity with damping (about 0.6).
- Finish with a few collision-only passes at alpha 1, so the result has no overlaps even when springs fight collisions.
- **Determinism:** no `Math.random`. When two nodes sit exactly on top of each other, separate them along a direction taken from a stable hash of the two ids. Iterate over nodes in input order.
- Brute-force O(n²) collision is fine at this scale.

**Tests (Vitest):**
- The same input gives exactly the same output (`toEqual`), and re-ordering the input does not change any node's result by more than 1 unit.
- A pinned node ends exactly at `start`.
- Two linked free nodes end about `length` apart (within 5%).
- A free node with only an anchor ends on its anchor.
- **Translation:** moving every `start` and every `anchor` by (dx, dy) moves every output by (dx, dy), within 0.5 units. T13 relies on this to keep drag-and-drop predictable.
- No overlaps: 40 nodes started on the same point, plus 20 random links (from a seeded generator inside the test), end with every pair at least `r1 + r2` apart.
- Keep-out: a free node started inside a pinned node's box ends outside it.
- Speed: 80 nodes and 120 links relax in under 15 ms (measure the median of a few runs, and keep the limit generous so CI does not flake).

**Done when:** all of the above pass, along with lint and `tsc`. No UI changes.

---

## T12: Target arrows (replace ghost markers)

**Depends on:** nothing. It works on today's ring layout and gets the force layout later from T13 for free. **Size:** medium.

**Owns:** `lib/map/links.ts` and `links.test.ts` (new), `components/map/TargetArrows.tsx` (new), and `components/map/GhostPopover.tsx` (rename it to `TargetPopover.tsx`). It deletes `components/map/GhostMarker.tsx`. It makes small edits to `lib/map/layout.ts`, `components/map/drag.ts`, `components/map/useFigureDrag.ts`, `components/map/DragOverlay.tsx`, `components/map/HeroFigure.tsx` and `components/Board.tsx`.

**Do:**
1. **Layout:** in `layout.ts`, delete `PlacedGhost`, `ghosts`, `GHOST_RADIUS`, `ghostRingRadius` and the ghost arc. Replace `PlacedHero.mainTarget` with `targets: string[]`, which holds only living targets, de-duplicated and in order. Heroes still stand on the main-target arc for now. Update `layout.test.ts`, `drag.ts` (`layoutWithDrag`) and `drag.test.ts`. `HeroFigure` uses `targets.length === 0` for idle.
2. **`linksOf(layout)`:** returns one `PlacedLink` per hero and target. `from` is on the hero's rim and `to` is on the monster's rim, each pulled back by a small gap (about 4 units), so the arrowhead touches the base without covering it. Skip a link whose figures overlap. The output order is stable: by hero id, then by the hero's target order. Write tests for the trimming, for the main flag, for links to unknown monsters being skipped, and for the order.
3. **`<TargetArrows>`:** drawn in world space after the grid and **before** the figures, so figures sit on top of arrows.
   - **Main arrow:** a solid line about 2 screen px wide, with a filled arrowhead.
   - **Secondary arrow:** a dashed line about 1.5 screen px wide, fainter, with an arrowhead.
   - Line widths, dashes and arrowhead size stay the same on screen at any zoom, using the existing `px = 1 / scale` pattern. Draw the arrowhead as an inline polygon rather than an SVG `<marker>`, so it scales the same way as the line.
   - **Focus:** when a hero is selected, its arrows turn amber (`SELECTED`) and other arrows fade. When a monster is selected, the arrows pointing at it get the same treatment. On hover over a hero or monster figure, do the same lightly (optional).
   - **Hit area:** an invisible stroke about 12 screen px wide along each arrow, with `data-figure` set so the canvas does not start a pan from it.
4. **Popover:** rename `GhostRef`, `bindGhost` and `ghost` in `useFigureDrag` to `TargetRef`, `bindLink` and `link`. Clicking an arrow opens `TargetPopover` at the arrow's midpoint, worded as "*Ana* → *Search Rewrite*". It shows **Make main**, which is hidden when the arrow is already the main one, and **Remove target**. Both call the existing `makeMain` and `removeTarget` ops, which already handle every case, including removing the main target or the last target.
5. **Board:** remove `GhostMarker` and render `<TargetArrows>`. While a hero is being dragged, its arrows follow it, because `layoutWithDrag` moves its position.
6. **Wording:** user-facing text says "secondary target" instead of "ghost". Domain function names such as `addGhost` stay as they are to avoid churn. Update the ghost wording in `docs/DESIGN.md` (Concepts, the layout rule, Map → Figures and Interactions → Heroes).

**Done when:** lint, `tsc`, tests and build all pass. Checked by hand with the seed data: Ana has a solid arrow to Search Rewrite and a dashed one to Flaky CI. Clicking the dashed arrow and choosing **Make main** makes Ana stand at Flaky CI, with the arrow styles swapped. **Remove target** deletes the arrow. Selecting Ana highlights only her arrows.

---

## T13: Targets drive the layout

**Depends on:** T10, T11 and T12 merged. **Owns:** `lib/map/layout.ts` (rewrite of `layoutWorld`), `components/map/drag.ts`, the drag parts of `components/map/useFigureDrag.ts`, and `components/map/useGlide.ts` (new). **Size:** large. This is the core of the feedback.

**Goal:** figures are placed from the target graph. Connected heroes and monsters gather together. Everything with a home stays near it.

**Do:**
1. **Map the world onto `relax()`**, in a new function `layoutWorld(world)` in `layout.ts`:
   - **Living monster (engaged or unfought):** free, with `start = monster.pos` and `anchor = { pos: monster.pos, strength: ANCHOR }`, kept weak (about 0.03), so fighters can pull it away from home and clusters can nudge it aside. Set `keepOut` to roughly the name label's size: a width taken from the name length × about 8 units, capped, and a height of about 22.
   - **Idle hero:** free, with `start` and `anchor` at `hero.pos` and the same `ANCHOR` strength.
   - **Engaged hero:** free, with no anchor. `start` = the mean of its targets' homes, plus a small offset taken from a hash of its id, so heroes that share targets don't start on the same point.
   - **Links:** one per hero and living target. A main link has `length = monsterR + heroR + 28` and `strength = MAIN` (about 0.6). A secondary link has `length = monsterR + heroR + 70` and `strength = SECONDARY` (about 0.2). Tune these constants until the user's example looks right (see the tests).
   - Export the tuning constants, so they can be adjusted in one place.
   - `PlacedMonster.pos` and `PlacedHero.pos` come from the solver output. `openingPoints` is unchanged.
2. **Dragging a monster**, in `drag.ts` and `useFigureDrag.ts`:
   - While dragging, the dragged monster is **pinned at the cursor** and the rest of its cluster re-relaxes on every pointer move. Run the full relax if it stays under the frame budget. Otherwise add `start` positions from the previous frame and fewer iterations, by extending `RelaxOptions`.
   - **On drop, save the home, not the drawn position:** `newHome = oldHome + (dropPos - pressPos)`. The translation test in T11 is what makes the monster settle close to where it was let go. Write a test for this rule in `drag.test.ts`.
   - Every monster uses this rule, unfought or not, because a nudged monster's drawn position can differ from its home.
3. **Dragging a hero:** the hero follows the cursor and its arrows follow it. Dropping an idle hero on empty ground saves its home with the same offset rule. **Nothing else re-lays out until the drop**, so monsters never move out from under the cursor. Hit-testing keeps using the layout captured when the press started, as it does today.
4. **Glide**, with `useGlide(layout)` in a new file: when the layout changes from anything other than a live drag (a drop, an optimistic update, server data arriving), animate every figure from its old drawn position to its new one over about 350 ms with ease-out, using `requestAnimationFrame`. During a live drag, do no gliding and apply positions directly. Respect `prefers-reduced-motion`. Figures that are new or have just been removed appear or disappear without animation. Hit-testing and drop logic always use the target layout, never the in-between frames.
5. **Fly-to and alarms:** wherever the code flies to or points at a monster using `monster.pos` (`Board.flyTo`, `EdgeArrows`, `SidePanel` after create), use the **drawn** position from the layout instead. The two differ whenever a figure has been pulled or nudged.
6. **Slay, delete and remove the last target:** a hero left with no targets goes idle at the monster's home. That is the current domain rule, so keep it. With the glide, the hero visibly walks there.
7. **Docs:** in `docs/DESIGN.md`, replace the "Engaged hero position is on an arc…" rule with the new rules. A stored `pos` is a home. Every figure with a home is held loosely by it. Engaged figures are pulled together by their targets, main targets pull harder, and clusters nudge other figures aside. Dragging a figure moves its home. Also update the YAML comment on `pos` in the data model.

**Tests (Vitest, in `layout.test.ts`), with constants taken from `layout.ts`:**
- **The user's example.** M1 has its home at (-600, 0) and M2 at (600, 0). H1 targets [M1, M2] and H2 targets [M2]. After layout, M1 and M2 are much closer than 1200 apart (less than 500). H1 stands between them, closer to M1 (its main target) than to M2. H2 stands next to M2.
- **Two separate clusters stay apart.** The centres of two groups that share no links are within 150 units of the centres of their homes.
- **Unfought monsters and idle heroes** with nothing near them are drawn at their stored positions (within 1 unit). When a cluster settles on top of one, it is nudged aside until nothing overlaps, and it moves back once the cluster leaves.
- **No overlaps.** Every pair of figures is at least `r1 + r2` apart. No hero centre is inside a monster's label box.
- **Deterministic.** Two calls give equal results.
- **Hand edits.** Targets that point at slain or missing monsters are ignored, as today.
- **Speed.** `layoutWorld` on 40 monsters and 25 heroes, with 1 to 3 targets each, takes under 10 ms.

**Done when:** all tests pass, along with lint, `tsc` and build. Checked by hand with the seed data:
- Ana stands between Search Rewrite and Flaky CI, and Bartek stands at Search Rewrite.
- Shift-dropping Celine on Search Rewrite pulls the payments incident and Search Rewrite toward each other, with a smooth glide.
- Dragging Search Rewrite drags its whole cluster along, and it settles close to where it is dropped.
- Unfought monsters and idle heroes stay put unless a cluster crowds them, and drift back when it leaves.
- Panning and zooming feel the same as before.

---

## T15: Painted minis

**Depends on:** T12 and T13 merged (it changes the figures, the arrow trimming and the hit areas that those tasks own). **Size:** large.

**Owns:** `assets/minis/` (new: source `.glb` files and `LICENSES.md`), `scripts/bake-minis.ts` (new), `public/minis/` (new, generated and committed), `lib/map/minis.ts` and `minis.test.ts` (new). It deletes `lib/map/glyphs.ts` and `glyphs.test.ts`. It adds the hero `mini` field across `lib/types.ts`, `lib/domain/creation.ts` and `validate.ts`, `lib/store/sync.ts`, the Server Actions and `data.example/heroes.yaml`. It edits `components/map/MonsterFigure.tsx`, `components/map/HeroFigure.tsx`, `components/map/TargetArrows.tsx`, `lib/map/links.ts`, the hit-testing in `components/map/drag.ts`, and every component that shows a glyph (`Trophies`, `UnfoughtAlarm`, `MonsterPanel`, `MonsterForm`, `HeroPanel`, `HeroForm`).

**Goal:** every figure on the map is a painted miniature standing on the felt, as in the chosen mockup, and the map works exactly as before.

**Do:**
1. **Models (D9):** collect the models in `assets/minis/`: `goblin.glb`, `orc.glb`, `troll.glb`, `dragon.glb`, `neutral.glb`, and one file per hero model the packs offer, named after what it shows (`knight.glb`, `ranger.glb`, …). Each has a small `<id>.json` with its display name and whether it is a hero or a monster, so a new model (later, AI-generated ones) is a drop-in. Recolour them so they read as one painted set, each on a round black base with green flock, with the base radius as the model's unit. Record every source and licence in `LICENSES.md`.
2. **Bake script (D10):** `npm run bake:minis` renders every model with three.js in headless Chromium (Playwright). Both are dev dependencies only. Use an orthographic camera at 38° elevation and 18° azimuth, with the key light from the upper left so the baked shading matches the contact shadows on the map. For each model it writes `public/minis/<model>.webp` at 4 px per world unit (sharp at zoom 2 on a high-density screen) and an entry in `public/minis/manifest.json`: the image size in base radii and the anchor, which is where the base centre sits in the image. The output is committed, so neither `npm run dev` nor `npm run build` bakes anything.
3. **Lookup (`lib/map/minis.ts`):** `monsterMini(size)`, `heroMini(id)` and `HERO_MINIS` (the roster for the picker, neutral first). Each mini has its id, display name, image path, width and height in base radii, and the anchor. `heroMini` returns the neutral adventurer for a missing or unknown id. The class table, synonyms and class suggestions are deleted with `glyphs.ts`, because class no longer drives the art (D13). Test that every size and roster entry has a manifest entry, and that missing and unknown ids give the neutral mini.
4. **Hero `mini` field (D13):** an optional string in the type, the YAML read and write (`HERO_FIELDS` in `sync.ts`), create and edit, and validation (any string is valid; an unknown id only changes the drawing). Writes keep comments as usual. Add a `mini` to some heroes in `data.example/heroes.yaml` and leave at least one without, to show the neutral mini.
5. **Hero form:** the class input becomes plain free text with no datalist. The mini picker is a grid of baked mini portraits with the current pick ringed and "Neutral" as the first tile. A pick that isn't in the roster shows as "missing" with the neutral tile ringed, so you can choose again.
6. **Figures:** draw each figure as a soft contact shadow, the baked image anchored on its base centre, and its label. Base rings are ellipses squashed by `BASE_SQUASH = sin 38°`, an exported constant: the unfought pulse (red), selection (amber) and the green or purple drop hints all sit around the base. Labels are slim dark tags with gold small-caps under the base (red for unfought) and keep the never-shrink-below-readable rule. Idle heroes are slightly faded. Draw figures in order of their drawn y, so nearer minis overlap farther ones, with the dragged figure always on top.
7. **Arrows:** `linksOf` trims to the base ellipses instead of circles. Arrows look like gold cords with a soft shadow: solid for main targets, dashed for secondary ones. They stay below the figures.
8. **Hit areas:** a figure is hit on its base ellipse or on the visible body of its mini (the image's bounding box, shrunk to the model's silhouette width). Dropping a hero on a dragon's wing counts as dropping on the dragon. Update the pure hit-testing in `drag.ts` and its tests.
9. **Everywhere else:** the side panel, unfought alarm and trophies show the mini image at a small size instead of the emoji.
10. **Docs:** in `docs/DESIGN.md`, add `mini` to the hero data model, rewrite the hero form fields, rewrite Map → Figures for minis, the base ellipses, draw order and hit areas, and add the bake pipeline to a new "Art" section. In `README.md`, explain how to add a model and rebake. In `AGENTS.md`, add the rule: "Minis are baked images (`npm run bake:minis`); don't render 3D in the browser."

**Done when:** lint, `tsc`, tests and build pass; `npm run bake:minis` regenerates identical files from a clean checkout. Checked by hand with the seed data: every figure is a mini, heroes without a pick are the neutral adventurer, picking a mini in the form changes the figure and writes only `mini` to the YAML, labels stay readable from zoom 0.3 to 4, a hero dropped on the top of a tall mini assigns it, nearer minis overlap farther ones, and panning a world of 40 monsters and 25 heroes stays smooth.

---

## T16: Felt table and terrain

**Depends on:** T13 (layout first). Its terrain pieces use T15's bake script, so that part waits for T15. **Size:** large.

**Owns:** `lib/map/terrain.ts` and `terrain.test.ts` (new), `components/map/Table.tsx` (new), `assets/terrain/` and `public/terrain/` (new), and the background part of `components/map/MapCanvas.tsx`, where the felt takes the grid's place.

**Goal:** the table looks like a wargame table that someone took time to dress, and it stays interesting wherever you pan. The mockup's plain felt is the starting point, not the finish.

**Do:**
1. **Felt:** a seamless felt texture tile with visible nap, used as an SVG pattern that scales with the zoom. Don't run SVG filters on every frame. Keep a very faint grid that fades out below zoom 0.6, so distances still read.
2. **Terrain generator (D12):** `terrainChunk(cx, cy)` is a pure function that returns the terrain for one 1200 × 1200 chunk of the world, seeded only by the chunk coordinates. It covers:
   - **Biomes** that change slowly across the map and blend at their edges: meadow, autumn woods, rocky highlands and marsh. Each has its own felt tint and scatter.
   - **Ground features:** hills (lighter patches with contour lines), dirt roads and one river with a stone bridge where they cross. Roads and the river run across chunk borders without breaking.
   - **Scatter:** rocks, grass tufts, flowers, fallen logs and reeds, by biome.
   - **Raised pieces:** small woods, ruins, a watchtower, a camp with a fire, a standing-stone circle. They are rare (zero to two per chunk) and always well apart.
3. **Rendering (`<Table>`):** draw only the chunks in view, memoised per chunk. Ground features and scatter are below the arrows. Raised pieces are drawn in the same depth order as the minis, and any raised piece that a figure or its label overlaps fades to 35%, so terrain never hides the game. Below zoom 0.4, drop small scatter and keep ground features and raised pieces.
4. **Lamp light:** a warm light that falls off toward the screen edges, fixed to the viewport rather than the world, as if a lamp hung over the table.
5. **Art:** the scatter and raised pieces are baked with T15's script into `public/terrain/`, in the same style and at the same angle as the minis, with their sources added to the licence list.
6. **Docs:** add a Table section to `docs/DESIGN.md` (felt, biomes, terrain is decoration and never stored, fading rule, level of detail).

**Tests (Vitest, in `terrain.test.ts`):**
- The same chunk always gives the same terrain.
- Roads and the river leave one chunk exactly where they enter the neighbouring chunk.
- Raised pieces in a chunk are at least 300 units apart, and there are never more than two.
- Every biome appears within a 10 × 10 chunk area around the origin.
- Generating one chunk takes under 2 ms.

**Done when:** lint, `tsc`, tests and build pass. Checked by hand: panning several screens in any direction keeps finding new, natural-looking terrain; nothing pops or jumps when chunks load; minis are never hidden by terrain; panning and zooming feel as smooth as with the plain grid.

---

## T14: Integration pass

**Depends on:** T13, T15 and T16. **Size:** small.

**Do:**
1. Run the whole app against `data.example/` and against a stress world with 40 monsters, 25 heroes and many shared targets, which you can generate into a scratch `data/` copy and must not commit. Fix overlaps, jitter, slow frames while dragging, and arrows crossing labels. Tall minis need more room than flat bases: tune the force layout's collision padding and label keep-out boxes until neighbouring minis and labels don't cover each other.
2. Make sure the opening view still fits everything. Check that the unfought counter, edge arrows, side panel (fighters list, slay, delete), trophies, Esc handling and the action error toast all still work.
3. Read through `docs/DESIGN.md` and `README.md` once more for anything that still describes territories, ghosts, ring arcs, emoji or the grid. Move the "How one SVG performs" open question to the Force layout section, and record what the stress test showed.
4. Mark this plan as completed at the top, as `docs/PLAN.md` is.

**Done when:** lint, `tsc`, tests and build all pass, and the manual checklist above has been gone through, with any remaining issues written up for the user.
