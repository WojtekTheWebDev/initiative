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
| Slain     | Done. It leaves the map and becomes a trophy: a bronzed mini on the trophy shelf and a plaque in the trophy hall |
| HUD       | Everything drawn over the table: floating clusters, the figure card, dialogs, toasts. Dark glass in every theme |

## Data model

Plain YAML files in `data/`. The folder is **gitignored**, so it has no history and no backup by design. If `data/` is missing on startup, it is seeded from the committed `data.example/`. You or an agent can edit the files by hand. Reload the page to see the changes, since there is no file watcher.

```yaml
# data/monsters.yaml
- id: search-rewrite        # slug from name; unique suffix on clash
  name: Search Rewrite
  size: XL                  # S | M | L | XL → spider | orc | mushroom king | dragon
  pos: { x: -420, y: 180 }  # home: the figure is held near it; always present
  notes: |                  # optional, free text
    Next step: spike on Meilisearch
  slain: 2026-10-14         # optional; absent = alive
  slainBy: [ana, bartek]    # optional; the heroes targeting it when it was slain
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
  - Clusters push other figures aside, so no mini or name tag covers another one (see Force layout).
  - The layout is pure and deterministic: the same files always give the same picture, in whatever order they list things. The tuning constants are exported from `lib/map/layout.ts`.
- **Target arrows** come from the layout: one per hero and living target, from the edge of the hero's base ellipse toward the monster's. They are never stored, so anything that moves a figure moves its arrows too.

What is stored because it can't be worked out later:
- **`slainBy`** records who fought a monster. Slaying removes the monster from every hero's `targets`, so afterwards nothing else says who fought it. It lists the heroes that had the monster in `targets` at that moment, those with it as their main target first, then the others, each group by id. It is left out when nobody fought it. It keeps ids, not names, so a rename shows up in the trophy hall; an id whose hero was deleted is skipped when shown.

Rules for writing:
- Use the [`yaml`](https://eemeli.org/yaml/) package's Document API, so hand-written comments are kept.
- Every write re-reads the file first. Never overwrite the file with stale in-memory state.

## Force layout

`layoutWorld` in `lib/map/layout.ts` maps the world onto a small hand-rolled solver, `relax` in `lib/map/force.ts`, in the style of d3-force. The solver knows nothing about heroes or monsters: it moves nodes with springs, anchors and collisions, and returns where each settled.

- **Shapes:** every figure takes up two boxes on the table (`figureShape`): its body, the box around the mini's silhouette from the minis' manifest and its base ellipse, and its name tag. No box of one figure may overlap a box of another; the solver keeps `PADDING` (8 units) between them. Tags keep their size on screen when zoomed out, so they grow in world units; the layout keeps room for them as they are drawn at zoom `TAG_ROOM_SCALE` (0.8).
- **Side by side:** two figures that overlap are moved apart by the shortest step right, left, down or up that clears all their boxes, and a step up or down counts `SIDEWAYS` (1.6) times longer. An engaged hero also starts beside its targets rather than above them. So heroes stand next to their monsters, where both minis and tags show and the arrow lies on open felt.
- **Room for arrows:** a hero's boxes are kept at least `ARROW_ROOM` (50 units) from those of each of its targets while the simulation runs, so every arrow shows on the felt. The last collision-only passes keep only the padding, so a crowd always settles.
- **Springs:** a main target pulls a hero with `MAIN_PULL` toward `MAIN_GAP` between the bases, a secondary one more weakly (`SECONDARY_PULL`, `SECONDARY_GAP`). Every home holds its figure with the weak `ANCHOR`.
- **Steps:** a full layout cools for 300 steps, settles until nothing moves (at most 200 steps) and finishes with collision-only passes that move each pair at once, so nothing is left overlapping.
- **Dragging a monster:** every pointer move lays the map out again with the monster pinned at the cursor, starting from the previous frame with 40 cooling and 40 settling steps (`DRAG_ITERATIONS`, `DRAG_SETTLE`). While a figure is dragged, the others ease after their places (`FOLLOW_MS`, 70 ms), so a figure the cluster shoves past slides there rather than jumping. The drop lays the map out in full from the homes, and the figures glide there.
- **Name tags when zoomed out:** `shownTags` leaves out a tag that would cover one already shown at the current zoom. The selected or dragged figure keeps its tag, then unfought monsters, the other monsters from the largest down, and heroes, whose tags hide altogether below zoom 0.45. Zooming in brings them back.
- **Stress test** (October 2026): a world of 40 monsters and 25 engaged heroes with 1 to 3 targets each, six monsters shared by many heroes, and two idle heroes, in a production build in headless Chromium at 1440 x 900, twice the pixel density. `layoutWorld` takes about 4 ms in Node and leaves no box overlapping. Panning costs about 4 ms of main-thread work per pointer move and dragging the busiest monster about 12 ms, inside a 60 Hz frame, with no long tasks and at most one late frame per run. With the CPU slowed four times, a drag frame takes about 60 ms, so a slow machine lags while dragging a world this size; the layout is about a quarter of that, and the rest is React and the browser drawing every figure again. The opening view of that world is at about zoom 0.35, where the tags that would collide are left out.

## Map

- **Canvas:** infinite, built by hand with an SVG `viewBox` and pointer events, with no pan/zoom library.
  - The wheel always zooms at the cursor, and so does a trackpad pinch. Two-finger scrolling zooms too; it does not pan.
  - Dragging empty ground pans. The ground is a felt wargame table (see Table).
  - Dragging a figure moves it (see Interactions).
  - When the layout changes after a drop, an edit or new data from the server, figures glide to their new places (about 350 ms, ease-out). During a drag the dragged figure follows the cursor exactly and the others ease after their places (see Force layout). With `prefers-reduced-motion` they jump.
- **Opening view:** fits every living figure with its mini and name tag.
- **Figures:** painted miniatures standing on the table, seen from a three-quarter angle (38° up, 18° around). Each is one baked image (see Art), never live 3D.
  - Every figure is a soft contact shadow on the felt, the baked mini anchored on the centre of its round base, and a name tag. The base radius is the mini's unit, so a mini scales with its base: 22 units for a hero, and 31, 40, 52 and 68 for monsters from S to XL, so the minis, not their tags, catch the eye.
  - Monsters by size: S spider, M orc, L mushroom king, XL dragon. The base grows with size.
  - Heroes stand as the mini they picked (`mini`), or as the neutral adventurer, an unpainted grey mini. Idle heroes are slightly faded.
  - **Base rings** are ellipses squashed by `BASE_SQUASH = sin 38°` (`lib/map/rings.ts`), the way a round base looks from that angle. The unfought pulse (red), selection (amber) and the drop hints (green for a plain drop, purple with Shift) all sit around the base.
  - **Name tags** are slim dark tags with gold small capitals (Cinzel) just below the front of the base, red for an unfought monster, kept small next to the minis (11 units for monsters, 10 for heroes). They never shrink below 10 px on screen, and they are drawn above every mini, so no mini hides a name. Their size is worked out in `lib/map/tags.ts`, so the layout keeps room for them. When zoomed out far enough that tags would cover each other, the less important ones are left out (see Force layout), and hero names hide below zoom 0.45.
  - **Draw order:** target arrows, then contact shadows, then the minis sorted by their drawn y, so nearer minis overlap farther ones. The figure being dragged is always on top.
  - **Hit areas:** a figure is hit on its base ellipse or on the body of its mini (the box around the model's silhouette, without the base), never on the empty corners of its image. Dropping a hero on a dragon's wing or on the top of a tall mini counts as dropping on that monster. Where figures overlap, the one drawn in front wins.
  - **Target arrows** are gold cords with a thin dark edge, so they read on every shade of felt, laid on the table with a soft shadow below the figures. Each runs from the hero's base ellipse toward its target's and stops at whatever it meets first: the base, the monster's mini or the monster's name tag, so the arrowhead always shows. An arrow that would start under the hero's own tag starts past it. The main arrow is solid, secondary arrows are thinner and dashed. Line widths and heads keep the same screen size at any zoom. Selecting a hero turns its arrows amber and fades the rest; selecting a monster does the same for the arrows pointing at it.
  - The table and the HUD look the same in light and dark mode.

## Table

The map is drawn on a felt wargame table that someone took time to dress. It is a physical object, so it looks the same in light and dark mode.

- **Felt:** two seamless tiles laid over the ground colour as SVG patterns that scale with the zoom: the nap of the cloth (fading out when zoomed far out, where it would only shimmer) and a much larger, soft dye mottle so the repeat never shows. The tiles are made by `npm run make:felt` (`scripts/make-felt.mjs`) and committed in `public/terrain/`.
- **Grid:** a faint chalk grid (100 units, every fifth line stronger) so distances still read. It fades out between zoom 0.6 and 0.45.
- **Terrain is decoration only.** It is worked out from the world coordinates by `terrainChunk(cx, cy)` in `lib/map/terrain.ts`, for 1200 × 1200 chunks, and is never stored. The same chunk always looks the same. It never affects the layout or hit-testing, and nothing on the table takes pointer events.
- **Biomes:** meadow, autumn woods, rocky highlands and marsh, in regions a couple of chunks across that blend softly at their wandering edges. The region around the origin is meadow. Each biome has its own felt tint and scatter, and the ground colour is a small image per chunk that the browser smooths when it scales it up.
- **Ground features:** hills (lighter patches with contour lines, most in the highlands, almost none in the marsh), dirt roads between jittered junctions, and rivers running north to south, one every six chunks or so, with the nearest passing just east of the origin. Roads and rivers are curves in world space, cut at chunk borders, so they run on without a break. A stone bridge stands wherever a road crosses a river.
- **Scatter:** rocks, pebbles, grass tufts, flowers, fallen logs, bushes, leaf litter, puddles and reeds, picked by biome (reeds also line every riverbank). It keeps off roads, water and raised pieces.
- **Raised pieces:** small woods (green, autumn, pine or marsh trees by biome), ruins, a watchtower, a camp with a fire, and a standing-stone circle. They are rare (zero to two per chunk) and at least 300 units apart. They are drawn in depth order with the figures: a piece that no figure or label overlaps sits under the figures at full strength; a piece that one overlaps fades to 35%, staying under the figures when they stand in front of it and going over them when it stands in front of one. So terrain never hides the game.
- **Lamp:** a warm light pooled in the middle of the screen that falls off toward the edges, fixed to the viewport rather than the world, as if a lamp hung over the table.
- **Art:** scatter, raised pieces and bridges are baked 3D models, made by the same bake as the minis (same camera and light), each with its own shadow on the felt; see Art below. Every piece has three variants (and woods one set per biome), named by art key (`rock-1`, `woods-marsh-2`, `camp-0`). The marsh woods are painted in light olive, so they read on the dark marsh felt under the lamp. `components/map/TableArt.tsx` reads `public/terrain/manifest.json` and draws each key as one `<image>` anchored on its footprint centre; scatter is scaled a little per piece. A bridge is baked lying at every 15 degrees on screen (`bridge-0` to `bridge-11`, made with the bake's `along`); `bridgeArt` picks the turn nearest to its road and turns the image the last few degrees (at most 7.5), so a bridge on a steep road keeps its 3D shape and light. Leaf litter and puddles are flat marks with no model, so they are SVG symbols placed with `<use>`. Baked art is never mirrored, because its light would then come from the wrong side. `PIECE_SIZE` in `lib/map/terrain.ts` (the footprint and height used for placement and for the fading box) leaves room for the largest baked variant of each kind, which a test checks against the manifest. A figure's fading box covers its shape from the layout (its mini with its base, and its name tag).
- **Level of detail and speed:** only chunks in view (plus a small margin) are drawn, each layer of each chunk is memoised, and generated chunks are cached; the ring just outside the view is generated while the browser is idle, so nothing pops in while panning. Below zoom 0.4 the scatter is left out, and below 0.2 the contour lines too; ground features and raised pieces stay. No SVG filters are used; shadows are baked into the art.

## HUD

Everything drawn over the table is the HUD. The table fills the whole window and the HUD floats on top of it in small clusters, the way a video game draws its interface over the world.

- **Skin: obsidian glass.** Every HUD surface is translucent dark glass (`rgba(14, 16, 20, .74)` with a 10 px backdrop blur) with a thin gold hairline edge, gold for the accent and red for danger. Headings and the wordmark are gold Cinzel small capitals, matching the name tags on the table; body text is Barlow. Radii are generous (about 12 px on surfaces). Without backdrop-filter support the glass is drawn opaque. The colours are CSS tokens in `app/globals.css`.
- **One look in every theme.** Like the table, the HUD looks the same in light and dark mode.
- **Icons** are one inline SVG set (`components/ui/icons.tsx`), drawn with `currentColor`. No emoji in the UI.
- **Layout:**
  - Top left: the wordmark, with the muster tokens hanging below it (see Unfought alarm).
  - Top right: **+ Monster** and **+ Hero**.
  - Bottom centre: the trophy shelf.
  - Bottom right: the map controls.
  - Toasts appear at the bottom centre, just above the trophy shelf.
  - The figure card floats next to the selected figure. Dialogs sit in the middle of the screen over a dimmed table.
  - Any drop of a dragged figure onto a HUD surface does nothing, except a monster dropped on the trophy shelf.
- **Figure card:** clicking a figure opens a compact card beside it, on the right of its base with a small pointer, flipped to the left near the right edge of the screen and kept inside the screen. It lives in the canvas' screen-space overlay, so it follows the figure while you pan, zoom or while figures glide, and it hides while a figure is dragged.
  - **Monster:** portrait, name, size and creature, key, notes clipped to three lines with **more** to expand them in place, fighters as overlapping portraits (a click selects that hero), then **Edit**, **Slay** and a **⋯** menu with **Delete**.
  - **Hero:** portrait, name, class and mini, targets in order with main marked by a crown (a click flies to that monster), then **Edit** and a **⋯** menu with **Delete**.
  - Esc, a click on empty table or selecting another figure closes it.
- **Dialogs:** create and edit open centred dialogs over the dimmed table. They trap focus, Esc closes them (after a popover or a drag claims Esc first) and a click on the dim closes them when nothing has been typed.
  - **Monster dialog** ("Summon a monster" or "Edit monster"): a large preview of the mini above a size slider with four stops, S spider, M orc, L mushroom king and XL dragon, the preview swapping as the slider moves (arrow keys work); then name and notes, and **Summon** or **Save**.
  - **Hero dialog** ("Recruit a hero" or "Edit hero"), laid out like a game's character screen: the chosen mini large on the left with arrows to flip through the roster (Neutral first, arrow keys work, a count such as "4 of 8"), and name and class on the right. Under the class field, the classes other heroes already have are offered as chips; class stays free text. A pick that isn't in the roster shows as missing, with Neutral shown, so you can choose again.
  - A save sends only the fields that changed, so untouched YAML keeps its formatting.
- **Trophy shelf:** a small glass shelf where the latest slain monsters stand as bronzed minis, newest on the left, with the trophy count; hovering a mini shows its name and slain date, and the rest shows as "+N". A click on the shelf opens the trophy hall. While a monster is dragged, the shelf glows gold and is a drop target (see Slay).
- **Trophy hall:** a full-screen glass overlay, every slain monster as a plaque, grouped by month of `slain`, newest first. A plaque shows the bronzed portrait, the name, the slain date, the first line of the notes and who fought it ("by Ana, Bartek", from `slainBy`). Esc or the close button returns to the table.
- **Map controls:** a small vertical cluster: zoom in and zoom out (around the middle of the screen, gliding like a fly-to), fit everything (the opening view), and **?** for the shortcuts sheet.
- **Shortcuts sheet:** a glass card listing every gesture and key: drag, Shift+drop, wheel or pinch to zoom, Esc, `N` new monster, `H` new hero, `F` fit everything, `+` and `-` to zoom, `?` this sheet. Keys are ignored while typing in a field.
- **Toasts:** one at a time, bottom centre. A failed save says what failed and that the change was undone, and hides after 6 seconds. A slay says "Search Rewrite slain" with **Undo** for 8 seconds.
- Portraits (card, muster tokens, dialogs, shelf, hall) are the baked minis on a disc of felt; trophies are tinted bronze.

## Interactions

**Monsters**
- **Drag** to move it. While dragging, the monster stays under the cursor and the map lays itself out around it: its fighters come along, monsters that share them are pulled after it, and anything in the way is nudged aside.
- On drop, its home moves by as much as the monster was dragged (`newHome = oldHome + (drop - press)`, measured between drawn positions), and that is saved as `pos`. A monster whose heroes fight nothing else settles exactly where it was let go; one that shares heroes with other monsters eases back toward them a little.
- **Click** to open its figure card.

**Heroes**
- A **plain drop on a monster** sets `targets` to just that monster. A plain drop back on the current main target changes nothing, so the secondary targets stay.
- **Shift+drop on a monster** adds it to the end of `targets` as a secondary target. The hero stays closest to its main target, the new target is pulled toward it more weakly, and it gets a dashed arrow. If the monster is already a target, nothing happens. An idle hero gets it as the main target.
- A **drop on empty ground** clears `targets` and saves `pos`. An idle hero's home moves by the drag offset, like a monster's; an engaged hero stays where it was let go.
- While a hero is dragged, nothing else moves until the drop, so monsters never slide out from under the cursor.
- A drop on a HUD surface, or off the map, does nothing and the hero snaps back.
- While dragging, the monster under the cursor is highlighted: green for a plain drop, purple with Shift.
- **Clicking a target arrow** pops two round glass buttons out at its midpoint, with a small label above naming the pair ("Ana → Search Rewrite"): a gold crown, **Make main** (only on a secondary arrow), and red shears, **Remove target**. Each has its name as a tooltip and accessible label. Esc or a click outside closes them.
- Changes show at once and are saved in the background. If saving fails, the change is undone and a toast says so.

**Unfought alarm**
- The monster pulses red on the table.
- **Muster tokens** hang down the left edge of the screen below the wordmark: a red count ("2 unfought") and one red-ringed portrait per unfought monster with its name beside it, largest first, then by name. Clicking one pans and zooms to it. Past six, the rest fold into "+N", which opens the full list. When every monster is engaged, a small "All engaged" seal sits under the wordmark instead.
- Off-screen unfought monsters also show as red arrows pinned to the edge of the view.

**Slay, undo and delete**
- A monster is slain by dropping it on the trophy shelf, or with **Slay** on its figure card. Both set `slain: <today>` (local date) and `slainBy`, and the monster leaves the table for the shelf and the hall. Slaying a monster that is already slain changes nothing.
- Slay and delete clean up the same way. The monster is removed from every hero's `targets`.
  - If it was a hero's main target, the next target becomes main.
  - If the hero has no targets left, they go idle at the monster's home, and `pos` is saved. The figure walks there.
- **Undo** on the slay toast revives the monster: `slain` and `slainBy` are removed and each hero the slay changed gets back the `targets` (and the idle `pos`) it had, unless that hero was changed again since, in which case it is left alone. After the toast has gone, revive a monster by deleting its `slain` and `slainBy` lines by hand.
- **Delete** sits in the figure card's ⋯ menu and needs a second click on a button that says it can't be undone. That is the only safeguard, since there is no backup. Deleting a hero works the same way.

**Create and edit**
- **+ Monster** (or `N`) opens the monster dialog. A new monster spawns at the centre of the view.
- **+ Hero** (or `H`) opens the hero dialog. A new hero spawns idle at the centre of the view. Changing only the mini writes only `mini` to the YAML.
- **Edit** on a figure card opens the same dialog, filled in.
- A new monster or hero is selected, its card opens and the view flies to it. A rename never changes the id.

## Art

- **Models** are CC0 low-poly glTF files in `assets/minis/`, from KayKit (Kay Lousberg) and Quaternius. Every source and licence is listed in `assets/minis/LICENSES.md`.
- Each model is `<id>.glb` with a small sidecar `<id>.json`: its display name, its kind (`hero`, `monster` or `terrain`), a monster's `size`, and optional bake settings (pose clip, height, rotation, recolouring, primer). Adding a model, including an AI-generated one later, means dropping in the two files and rebaking.
- **Baking** (`npm run bake:minis`, `scripts/bake-minis.ts`) renders every model once with three.js in headless Chromium (Playwright), both dev dependencies only. It uses one orthographic camera (38° elevation, 18° azimuth) and one light rig, with the key light from the upper left so the shading matches the contact shadows on the map. It stands each hero and monster on a round black base with green flock (radius 1, the model's unit), scales the model onto it, and gives every material the same matte painted finish.
- The output is `public/minis/<id>.webp` at 4 px per world unit (sharp at zoom 2 on a high-density screen) and `public/minis/manifest.json`: per mini, its image size in base radii, the anchor (where the base centre sits in the image) and the body box used for hit areas. The output is committed, so neither `npm run dev` nor `npm run build` bakes anything. Rendering uses software GL, so a rebake from the same files gives the same bytes.
- **Terrain** is baked by the same script with the same camera and lighting (`npm run bake:terrain`: `assets/terrain/` to `public/terrain/`). Its models are CC0 low-poly glTF files from Kenney (Nature Kit) and Quaternius (towers, bonfire, Modular Ruins Pack) in `assets/terrain/models/`, listed in `assets/terrain/LICENSES.md`. Each art key has a sidecar `<key>.json` with `"kind": "terrain"`, a `radius` (world units per model unit; terrain keeps the size it has in its files rather than being fitted to a base) and `parts`: the models it is put together from, each placed, turned, scaled and optionally recoloured, so a small woods is a group of trees and bushes. The whole piece can be turned by `rotate` (degrees around the vertical axis) or by `along` (the angle its x axis should show at on screen, allowing for the camera). `assets/terrain/colors.json` paints the Kenney materials once for the whole folder. Terrain gets no base; it stands on an invisible table top that keeps only its shadow, and the manifest entry also records the `radius`.
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
- the force solver and the layout: the user's example, separate clusters, homes, no overlapping minis or tags, sideways pushes, determinism and speed; figure shapes, which tags show when zoomed out, and the opening view
- target arrows from the layout, trimmed to the base ellipses
- the mini lookup (every size and roster entry is baked, missing and unknown ids give the neutral mini), mini hit areas and draw order
- the terrain: the same chunk gives the same terrain, roads and rivers meet at chunk borders, raised pieces are rare and apart, every biome appears near the origin, a chunk is fast to generate, and how raised pieces fade among the figures
- the home after a drag, and a monster drag laid out frame by frame from the frame before
- target arrows that stop before name tags and minis, and the bridge picked for a road
- slay and delete cleanup, `slainBy` on slay, and revive (restoring only the heroes left unchanged since the slay)
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

- A dropped monster whose heroes also fight other monsters eases back part of the way toward them after the drop, because only its own home moves (D2). This is known behaviour; revisit it if drops should land exactly where they are let go.
