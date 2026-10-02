# Initiative: Design

*Initiative - a planning playing game.*

A personal, local-only progress tracker shaped like a tabletop RPG battlefield. Work items are **monsters** and the people fighting them are **heroes**. You plan your day by moving figures around a map. The question the map answers at a glance is **who fights what**, and above all **which monsters nobody is fighting**.

It is a tool for one person (an engineering manager) to use in daily work. It is not a team tool and does not replace Jira.

## Concepts

| Concept   | Meaning                                                                 |
| --------- | ----------------------------------------------------------------------- |
| Monster   | Something to deal with: an initiative, incident, tech debt, a hire, a people issue, a stakeholder ask |
| Hero      | An engineer on the team, or you (e.g. class `commander`)                 |
| Main target | The monster that pulls a hero hardest and closest (`targets[0]`)    |
| Secondary target | Any other monster in a hero's `targets`. It pulls the hero more weakly |
| Home      | A stored `pos`: where a monster or an idle hero is held, loosely. The figure is drawn near it, not always on it |
| Target arrow | An arrow from a hero to each of its targets: solid for the main target, dashed for secondary ones |
| Unfought  | A living monster that no hero targets. It pulses red                     |
| Slain     | Done. It leaves the map and goes into the trophies strip                 |

## Data model

Plain YAML files in `data/`. The folder is **gitignored**, so it has no history and no backup by design. If `data/` is missing on startup, it is seeded from the committed `data.example/`. You or an agent can edit the files by hand. Reload the page to see the changes, since there is no file watcher.

```yaml
# data/monsters.yaml
- id: search-rewrite        # slug from name; unique suffix on clash
  name: Search Rewrite
  size: XL                  # S | M | L | XL → goblin | orc | troll | dragon
  pos: { x: -420, y: 180 }  # home: the figure is held near it; always present
  notes: |                  # optional, free text
    Next step: spike on Meilisearch
  slain: 2026-10-14         # optional; absent = alive
  externalKey: SRCH-12      # optional; reserved for a future Jira import

# data/heroes.yaml
- id: ana
  name: Ana
  class: archer             # free-text label, shown as text only
  mini: hooded-rogue        # optional; a hero mini id (public/minis/manifest.json); absent or unknown = neutral adventurer
  targets: [search-rewrite, flaky-ci]   # ordered; first = main, rest = secondary targets
  pos: { x: -600, y: 40 }   # home while idle; stored only while idle (targets empty)
```

Rules worked out from the data, not stored:
- **Engaged or unfought** depends on whether any hero has the monster in `targets`. There is no `fighters` or `status` field.
- **Creature type** comes from `size`. There is no `kind` field. The size also picks the monster's mini.
- **A hero's mini** is its `mini` pick. A hero with no `mini`, or with an id that isn't in the roster, is drawn as the neutral adventurer. `class` never affects the art.
- **Where figures are drawn** comes from the targets, through a force layout (`lib/map/layout.ts` on top of the solver in `lib/map/force.ts`). The drawn position is never saved.
  - A stored `pos` is a **home**. Every monster and every idle hero is held to its home by the same weak spring, so it stays near it but can be nudged aside, and drifts back when there is room.
  - An engaged hero has no home. A spring to each of its targets pulls it toward them and pulls them toward it, so heroes and monsters that target each other gather into a cluster: a monster that shares a hero with another is drawn between its home and theirs. The main target pulls harder and holds the hero closer than secondary targets.
  - Clusters push other figures aside, so nothing overlaps and no figure stands on a monster's name label.
  - The layout is pure and deterministic: the same files always give the same picture, in whatever order they list things. The tuning constants are exported from `lib/map/layout.ts`.
- **Target arrows** come from the layout: one per hero and living target, from the edge of the hero's base ellipse to the edge of the monster's. They are never stored, so anything that moves a figure moves its arrows too.

Rules for writing:
- Use the [`yaml`](https://eemeli.org/yaml/) package's Document API, so hand-written comments are kept.
- Every write re-reads the file first. Never overwrite the file with stale in-memory state.

## Map

- **Canvas:** infinite, built by hand with an SVG `viewBox` and pointer events, with no pan/zoom library.
  - The wheel always zooms at the cursor, and so does a trackpad pinch. Two-finger scrolling zooms too; it does not pan.
  - Dragging empty ground pans. The ground is a felt wargame table (see Table).
  - Dragging a figure moves it (see Interactions).
  - When the layout changes after a drop, an edit or new data from the server, figures glide to their new places (about 350 ms, ease-out). During a drag they follow the layout directly, and with `prefers-reduced-motion` they jump.
- **Opening view:** fits the bounding box of everything still alive.
- **Figures:** painted miniatures standing on the table, seen from a three-quarter angle (38° up, 18° around). Each is one baked image (see Art), never live 3D.
  - Every figure is a soft contact shadow on the felt, the baked mini anchored on the centre of its round base, and a name tag. The base radius is the mini's unit, so a mini scales with its base.
  - Monsters by size: S goblin, M orc, L troll, XL dragon. The base grows with size.
  - Heroes stand as the mini they picked (`mini`), or as the neutral adventurer, an unpainted grey mini. Idle heroes are slightly faded.
  - **Base rings** are ellipses squashed by `BASE_SQUASH = sin 38°` (`lib/map/rings.ts`), the way a round base looks from that angle. The unfought pulse (red), selection (amber) and the drop hints (green for a plain drop, purple with Shift) all sit around the base.
  - **Name tags** are slim dark tags with gold small capitals (Cinzel) just below the front of the base, red for an unfought monster. They never shrink below a readable size, and they are drawn above every mini, so no mini hides a name. Hero names hide when zoomed far out.
  - **Draw order:** target arrows, then contact shadows, then the minis sorted by their drawn y, so nearer minis overlap farther ones. The figure being dragged is always on top.
  - **Hit areas:** a figure is hit on its base ellipse or on the body of its mini (the box around the model's silhouette, without the base), never on the empty corners of its image. Dropping a hero on a dragon's wing or on the top of a tall mini counts as dropping on that monster. Where figures overlap, the one drawn in front wins.
  - **Target arrows** are gold cords laid on the table with a soft shadow, running from each hero to each of its targets below the figures, trimmed to the base ellipses. The main arrow is solid, secondary arrows are thinner and dashed. Line widths and heads keep the same screen size at any zoom. Selecting a hero turns its arrows amber and fades the rest; selecting a monster does the same for the arrows pointing at it.
  - The table looks the same in light and dark mode; only the UI around it follows the theme.

## Table

The map is drawn on a felt wargame table that someone took time to dress. It is a physical object, so it looks the same in light and dark mode; only the UI around it follows the theme.

- **Felt:** two seamless tiles laid over the ground colour as SVG patterns that scale with the zoom: the nap of the cloth (fading out when zoomed far out, where it would only shimmer) and a much larger, soft dye mottle so the repeat never shows. The tiles are made by `npm run make:felt` (`scripts/make-felt.mjs`) and committed in `public/terrain/`.
- **Grid:** a faint chalk grid (100 units, every fifth line stronger) so distances still read. It fades out between zoom 0.6 and 0.45.
- **Terrain is decoration only.** It is worked out from the world coordinates by `terrainChunk(cx, cy)` in `lib/map/terrain.ts`, for 1200 × 1200 chunks, and is never stored. The same chunk always looks the same. It never affects the layout or hit-testing, and nothing on the table takes pointer events.
- **Biomes:** meadow, autumn woods, rocky highlands and marsh, in regions a couple of chunks across that blend softly at their wandering edges. The region around the origin is meadow. Each biome has its own felt tint and scatter, and the ground colour is a small image per chunk that the browser smooths when it scales it up.
- **Ground features:** hills (lighter patches with contour lines, most in the highlands, almost none in the marsh), dirt roads between jittered junctions, and rivers running north to south, one every six chunks or so, with the nearest passing just east of the origin. Roads and rivers are curves in world space, cut at chunk borders, so they run on without a break. A stone bridge stands wherever a road crosses a river.
- **Scatter:** rocks, pebbles, grass tufts, flowers, fallen logs, bushes, leaf litter, puddles and reeds, picked by biome (reeds also line every riverbank). It keeps off roads, water and raised pieces.
- **Raised pieces:** small woods (green, autumn, pine or marsh trees by biome), ruins, a watchtower, a camp with a fire, and a standing-stone circle. They are rare (zero to two per chunk) and at least 300 units apart. They are drawn in depth order with the figures: a piece that no figure or label overlaps sits under the figures at full strength; a piece that one overlaps fades to 35%, staying under the figures when they stand in front of it and going over them when it stands in front of one. So terrain never hides the game.
- **Lamp:** a warm light pooled in the middle of the screen that falls off toward the edges, fixed to the viewport rather than the world, as if a lamp hung over the table.
- **Art:** scatter, raised pieces and bridges are baked 3D models, made by the same bake as the minis (same camera and light), each with its own shadow on the felt; see Art below. Every piece has three variants (and woods one set per biome), named by art key (`rock-1`, `woods-marsh-2`, `camp-0`, `bridge`). `components/map/TableArt.tsx` reads `public/terrain/manifest.json` and draws each key as one `<image>` anchored on its footprint centre; scatter is scaled a little per piece, and a bridge is turned to follow its road. Leaf litter and puddles are flat marks with no model, so they are SVG symbols placed with `<use>`. Baked art is never mirrored, because its light would then come from the wrong side. `PIECE_SIZE` in `lib/map/terrain.ts` (the footprint and height used for placement and for the fading box) leaves room for the largest baked variant of each kind, which a test checks against the manifest. A figure's fading box is the body of its own mini from the minis' manifest, plus its label.
- **Level of detail and speed:** only chunks in view (plus a small margin) are drawn, each layer of each chunk is memoised, and generated chunks are cached; the ring just outside the view is generated while the browser is idle, so nothing pops in while panning. Below zoom 0.4 the scatter is left out, and below 0.2 the contour lines too; ground features and raised pieces stay. No SVG filters are used; shadows are baked into the art.

## Interactions

**Monsters**
- **Drag** to move it. While dragging, the monster stays under the cursor and the map lays itself out around it: its fighters come along, monsters that share them are pulled after it, and anything in the way is nudged aside.
- On drop, its home moves by as much as the monster was dragged (`newHome = oldHome + (drop - press)`, measured between drawn positions), and that is saved as `pos`. A monster whose heroes fight nothing else settles exactly where it was let go; one that shares heroes with other monsters eases back toward them a little.
- **Click** to open the side panel, which has notes, fighters, edit, slay and delete.

**Heroes**
- A **plain drop on a monster** sets `targets` to just that monster. A plain drop back on the current main target changes nothing, so the secondary targets stay.
- **Shift+drop on a monster** adds it to the end of `targets` as a secondary target. The hero stays closest to its main target, the new target is pulled toward it more weakly, and it gets a dashed arrow. If the monster is already a target, nothing happens. An idle hero gets it as the main target.
- A **drop on empty ground** clears `targets` and saves `pos`. An idle hero's home moves by the drag offset, like a monster's; an engaged hero stays where it was let go.
- While a hero is dragged, nothing else moves until the drop, so monsters never slide out from under the cursor.
- A drop over the side panel, or off the map, does nothing and the hero snaps back.
- While dragging, the monster under the cursor is highlighted: green for a plain drop, purple with Shift.
- **Clicking a target arrow** opens a popover at its midpoint, worded as "Ana → Search Rewrite", with **Make main** (only on a secondary arrow) and **Remove target**. Esc or a click outside closes it.
- Changes show at once and are saved in the background. If saving fails, the change is undone and the error is shown.

**Unfought alarm**
- The monster pulses red.
- A header counter (e.g. "⚠ 3 unfought") lists them. Clicking one pans and zooms to it.
- Off-screen unfought monsters show as red arrows pinned to the edge of the view.

**Slay or delete a monster**
- Slay sets `slain: <today>` (local date) and moves the monster to the trophies strip, which sits below the canvas, newest first. Clicking a trophy shows it read-only. Slaying a monster that is already slain changes nothing. To revive one, delete its `slain` line by hand.
- Slay and delete clean up the same way. The monster is removed from every hero's `targets`.
  - If it was a hero's main target, the next target becomes main.
  - If the hero has no targets left, they go idle at the monster's home, and `pos` is saved. The figure walks there.
- Delete needs a second click on a button that says it can't be undone. That is the only safeguard, since there is no backup. Deleting a hero works the same way.

**Create, edit, delete** (side-panel forms)
- The side panel is an overlay on the right edge of the map. The map keeps its size underneath. Esc leaves an edit form first, then closes the panel.
- **Monster form:** name, size and notes. A new monster spawns at the center of the visible map (not counting the area under the panel).
- **Hero form:** name, class and mini. Class is plain free text. The mini picker is a grid of baked portraits with the current pick ringed and "Neutral" first. A pick that isn't in the roster shows as missing, with Neutral ringed, so you can choose again. Changing only the mini writes only `mini` to the YAML. A new hero spawns idle at the center of the view.
- The side panel, the unfought alarm and the trophies show each figure's mini as a small portrait.
- A new monster or hero is selected and the view flies to it. A rename never changes the id.

## Art

- **Models** are CC0 low-poly glTF files in `assets/minis/`, from KayKit (Kay Lousberg) and Quaternius. Every source and licence is listed in `assets/minis/LICENSES.md`.
- Each model is `<id>.glb` with a small sidecar `<id>.json`: its display name, its kind (`hero`, `monster` or `terrain`), a monster's `size`, and optional bake settings (pose clip, height, rotation, recolouring, primer). Adding a model, including an AI-generated one later, means dropping in the two files and rebaking.
- **Baking** (`npm run bake:minis`, `scripts/bake-minis.ts`) renders every model once with three.js in headless Chromium (Playwright), both dev dependencies only. It uses one orthographic camera (38° elevation, 18° azimuth) and one light rig, with the key light from the upper left so the shading matches the contact shadows on the map. It stands each hero and monster on a round black base with green flock (radius 1, the model's unit), scales the model onto it, and gives every material the same matte painted finish.
- The output is `public/minis/<id>.webp` at 4 px per world unit (sharp at zoom 2 on a high-density screen) and `public/minis/manifest.json`: per mini, its image size in base radii, the anchor (where the base centre sits in the image) and the body box used for hit areas. The output is committed, so neither `npm run dev` nor `npm run build` bakes anything. Rendering uses software GL, so a rebake from the same files gives the same bytes.
- **Terrain** is baked by the same script with the same camera and lighting (`npm run bake:terrain`: `assets/terrain/` to `public/terrain/`). Its models are CC0 low-poly glTF files from Kenney (Nature Kit) and Quaternius (towers, bonfire, Modular Ruins Pack) in `assets/terrain/models/`, listed in `assets/terrain/LICENSES.md`. Each art key has a sidecar `<key>.json` with `"kind": "terrain"`, a `radius` (world units per model unit; terrain keeps the size it has in its files rather than being fitted to a base) and `parts`: the models it is put together from, each placed, turned, scaled and optionally recoloured, so a small woods is a group of trees and bushes. `assets/terrain/colors.json` paints the Kenney materials once for the whole folder. Terrain gets no base; it stands on an invisible table top that keeps only its shadow, and the manifest entry also records the `radius`.
- `lib/map/minis.ts` reads the manifest: `monsterMini(size)`, `heroMini(id)` and `HERO_MINIS`, the roster for the picker, neutral first.
- No WebGL ships to the browser: the map stays SVG with hand-rolled pan and zoom, and each figure is one `<image>`.

## Technical notes (Next.js 16)

- Keep `cacheComponents` **off**. Add `export const dynamic = 'force-dynamic'` to the page that reads YAML. Without it, `next start` serves a snapshot from build time.
- Writes go through Server Actions (`'use server'`), followed by `refresh()` (new in 16) or `revalidatePath('/')`.
- In production, Next.js hides the message of an error thrown from a Server Action. So actions return `{ ok: false, error }` instead of throwing, and the client turns it back into an `Error` (`lib/action-result.ts`).
- Avoid deprecated APIs: the one-argument `revalidateTag`, and `middleware`, which is now `proxy`.
- Read `node_modules/next/dist/docs/` before relying on Next APIs.

## Testing

Use Vitest unit tests on the pure functions that change data:
- assign, Shift-add, and promoting or removing a secondary target
- the force solver and the layout: the user's example, separate clusters, homes, no overlaps, determinism and speed
- target arrows from the layout, trimmed to the base ellipses
- the mini lookup (every size and roster entry is baked, missing and unknown ids give the neutral mini), mini hit areas and draw order
- the terrain: the same chunk gives the same terrain, roads and rivers meet at chunk borders, raised pieces are rare and apart, every biome appears near the origin, a chunk is fast to generate, and how raised pieces fade among the figures
- the home after a drag
- slay and delete cleanup
- comments kept on write
- seeding from `data.example/`

The canvas is checked by hand, with no end-to-end tests for now.

## Out of scope (decided, not forgotten)

- Jira sync or OAuth. The only hook kept for it is `externalKey`.
- A database. The data stays in YAML files.
- Multiple users or logins. It runs on your machine only.
- XP, levels or scoring of people.
- Capacity, stamina or HP tracking, and burndown.
- Auto-committing data, a file watcher, or an archive file.
- Heroes in a barracks panel instead of as figures on the map.
- A fixed-size map, a minimap, a pan/zoom library or React Flow.
- Playwright end-to-end tests.

## Open questions

- How one SVG performs as the number of items grows. Revisit only if it gets slow.
