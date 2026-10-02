# Initiative: Implementation Plan

> **Completed** (T0–T9 merged on `main`, October 2026). Kept as a record; `docs/DESIGN.md` is the current spec.

This plan breaks `docs/DESIGN.md` into tasks that separate agents can pick up. Each task lists what it depends on, which files it owns, the contract it must keep, and how to tell it is done.

**Every agent must first read** `AGENTS.md`, `docs/DESIGN.md`, this file, and the Next.js guides in `node_modules/next/dist/docs/` for any Next API it uses.

## Dependency graph

```
T0 Foundation
 ├─► T1 Domain rules (pure)  ──┐
 ├─► T2 YAML store            ─┼─► T4 Server actions + page ──┐
 └─► T3 Camera + canvas shell ─┴─► T5 Figures + Board ────────┼─► T6 Drag interactions
                                                              ├─► T7 Unfought alarm
                                                              └─► T8 Side panel, forms, trophies
                                                                        └─► T9 Integration pass
```

| Wave | Tasks (can run in parallel) |
| ---- | --------------------------- |
| 0 | T0 |
| 1 | T1, T2, T3 |
| 2 | T4, T5 (T5 needs only T0 + T3, so it can start in wave 1 once T3 is merged) |
| 3 | T6, T7, T8 |
| 4 | T9 |

Wave 3 tasks all add one small hook into `components/Board.tsx`. Keep those edits minimal and put the logic in your own files, so merges stay trivial. If agents run in separate worktrees, merge wave 3 one task at a time.

## Shared contracts (written in T0, changed only by agreement)

### File layout

```
lib/types.ts              T0  domain types
lib/domain/*.ts           T1  pure rules (no I/O, no React)
lib/store/*.ts            T2  YAML read/seed/write (server only)
lib/map/*.ts              T3  pure geometry: camera, rings, edge arrows, glyphs
app/page.tsx              T4  server component, force-dynamic
app/actions.ts            T4  Server Actions
components/map/*          T3/T5/T7  client canvas pieces
components/Board.tsx      T5  client root that composes everything
components/panel/*        T8  side panel and forms
components/Trophies.tsx   T8
data.example/*.yaml       T0  seed data (fake names only)
```

Tests sit next to the code as `*.test.ts`.

### Types (`lib/types.ts`)

```ts
export type Pos = { x: number; y: number };
export type Size = 'S' | 'M' | 'L' | 'XL';
export type Territory = 'team' | 'keep';

export type Monster = {
  id: string;
  name: string;
  size: Size;
  pos: Pos;
  notes?: string;
  slain?: string;        // 'YYYY-MM-DD', kept as a string, never a Date
  externalKey?: string;
};

export type Hero = {
  id: string;
  name: string;
  class: string;
  targets: string[];     // ordered; [0] = main, rest = ghosts; [] = idle
  pos?: Pos;             // present only when targets is empty
};

export type World = { monsters: Monster[]; heroes: Hero[] };
```

Invariant every write must keep: `hero.targets.length > 0` ⇔ `hero.pos === undefined`. Targets only ever point at living monster ids.

### Server Actions (`app/actions.ts`, implemented in T4)

Client tasks (T5–T8) code against these signatures. Every action re-reads the files, applies a T1 function, writes through T2, then calls `refresh()` from `next/cache`.

Actions return their errors instead of throwing them, because in production Next.js replaces a thrown message with a generic one. `ActionResult<T>` and `unwrap` live in `lib/action-result.ts`. Clients call `await unwrap(action(...))`, which gives the value or throws `Error(message)`.

```ts
type ActionResult<T = void> = { ok: true; value: T } | { ok: false; error: string };

moveMonster(id: string, pos: Pos): Promise<ActionResult>
dropHero(heroId: string, drop: { monsterId: string; shift: boolean } | { pos: Pos }): Promise<ActionResult>
makeMain(heroId: string, monsterId: string): Promise<ActionResult>
removeTarget(heroId: string, monsterId: string): Promise<ActionResult>
createMonster(input: { name: string; size: Size; notes?: string; pos: Pos }): Promise<ActionResult<string>> // value = id
updateMonster(id: string, patch: { name?: string; size?: Size; notes?: string }): Promise<ActionResult>
slayMonster(id: string): Promise<ActionResult>
deleteMonster(id: string): Promise<ActionResult>
createHero(input: { name: string; class: string; pos: Pos }): Promise<ActionResult<string>> // value = id
updateHero(id: string, patch: { name?: string; class?: string }): Promise<ActionResult>
deleteHero(id: string): Promise<ActionResult>
```

The client computes spawn positions (it knows the view) and passes `pos`. The server does not know the camera.

---

## T0: Foundation

**Depends on:** nothing. **Size:** small. Must merge before anything else starts.

**Goal:** a clean skeleton with the shared contracts in place, so wave 1 can run in parallel.

**Do:**
1. `npm i yaml` and `npm i -D vitest`. Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts. Add `vitest.config.ts` (node environment, `@/` alias matching `tsconfig.json`).
2. Create `lib/types.ts` exactly as in *Shared contracts*.
3. Create `data.example/monsters.yaml` and `data.example/heroes.yaml` with fake data that exercises every case: monsters on both sides of x = 0, all four sizes, one slain monster, one with notes and comments, one with `externalKey`, one unfought monster; heroes that are idle, engaged with one target, and engaged with ghosts. Include a few YAML comments, since T2 tests that comments survive.
4. Replace the create-next-app `app/page.tsx` with a placeholder that renders "Initiative" full screen. Delete the unused `public/*.svg` files. Make `app/layout.tsx` and `app/globals.css` a full-viewport, no-scroll layout (`h-dvh`, `overflow-hidden`).
5. Confirm `next.config.ts` does not turn on `cacheComponents`.

**Done when:** `npm run lint`, `npx tsc --noEmit`, `npm test` (zero tests passes, or one trivial test) and `npm run build` all succeed.

---

## T1: Domain rules (pure functions)

**Depends on:** T0. **Owns:** `lib/domain/**`.

**Goal:** every rule that changes or derives data, as pure functions over `World` with full Vitest coverage. No file I/O, no React, no Next imports.

**Functions (suggested names; keep them pure and return new objects):**

- *Derived:*
  - `territoryOf(pos): Territory`, where x < 0 is `team` and x ≥ 0 is `keep` (x = 0 is keep).
  - `alive(monsters)`.
  - `unfought(world): Monster[]`, meaning living monsters that no hero has in `targets`.
  - `fightersOf(world, monsterId): { main: Hero[]; ghosts: Hero[] }`, with `main` sorted by hero id. T3 uses this order for the ring.
  - `creatureOf(size)`, mapping S → goblin, M → orc, L → troll, XL → dragon.
- *Hero targeting:*
  - `assign(world, heroId, monsterId)` sets targets to `[monsterId]` and deletes `pos`.
  - `addGhost(world, heroId, monsterId)` appends the monster. If it is already in targets, it changes nothing. If the hero was idle, it becomes the main target and `pos` is deleted.
  - `makeMain(world, heroId, monsterId)` moves the monster to index 0.
  - `removeTarget(world, heroId, monsterId)` removes it. If targets become empty, the hero goes idle at the removed monster's `pos`.
  - `setIdle(world, heroId, pos)` clears targets and sets `pos`.
- *Monster lifecycle:*
  - `slay(world, monsterId, today)` sets `slain: today`, then runs the cleanup.
  - `deleteMonster(world, monsterId)` removes the monster, then runs the cleanup.
  - The shared cleanup removes the id from every hero. A hero whose main target was removed gets the next target as main. A hero with no targets left goes idle at the monster's last `pos`.
- *Creation:*
  - `slugify(name)` and `uniqueId(base, existingIds)`, which gives `search-rewrite`, then `search-rewrite-2`, and so on. Hero and monster ids are separate namespaces.
  - `createMonster(world, input)` and `createHero(world, input)` return `{ world, id }`.
  - `updateMonster` and `updateHero`. A rename does **not** change the id.
  - `deleteHero`.
  - `moveMonster(world, id, pos)`.
- *Validation:* `validateWorld(world)` returns a list of problems: duplicate ids, targets pointing at missing or slain monsters, an engaged hero with `pos`, an idle hero without `pos`, an unknown size. T2 logs these on read, since files are edited by hand, but does not crash.

Unknown ids passed to a mutator should throw a clear `Error`. Actions surface it.

**Tests (required by DESIGN):** assign, Shift-add (including the duplicate no-op and the idle-hero case), make main, remove ghost, remove the last target (hero goes idle at the monster's pos), slay and delete cleanup (main promoted, idle fallback, other heroes untouched), territory at x = -1, 0 and 1, `unfought`, `uniqueId` on a clash, and the invariant holding after every mutator.

**Done when:** `npm test` is green and there is near-total branch coverage of `lib/domain`.

---

## T2: YAML store

**Depends on:** T0. **Owns:** `lib/store/**`. Server-only: add `import 'server-only'` to the entry module, but keep the core logic importable from tests by taking the data directory as a parameter.

**Goal:** read, seed and write `data/*.yaml` while keeping hand-written comments.

**API:**

```ts
readWorld(dir?: string): Promise<World>            // seeds first if needed
updateWorld(fn: (w: World) => World, dir?: string): Promise<World>
```

**Requirements:**
- **Seeding:** if `data/` or either file is missing, copy it from `data.example/`. Copy the missing file only and never overwrite an existing one.
- **Parsing:** use `parseDocument` from `yaml`. Keep `slain` as a `'YYYY-MM-DD'` string. The default YAML 1.2 core schema does this, so do not enable the 1.1 timestamp tag. Normalize a missing `targets` to `[]`. Run `validateWorld` from T1 if it has landed; otherwise leave a TODO and coordinate.
- **Writing with comments kept:** `updateWorld` re-reads both files fresh, builds the plain `World`, applies `fn`, then **syncs the result back onto the existing `Document`s** instead of re-serializing plain objects:
  - Match sequence items by `id`.
  - For a changed scalar field, `item.set(key, value)`. For a removed optional field (`pos`, `notes`, `slain`), `item.delete(key)`. For `pos`, set `x` and `y` in place on the existing map node, so a flow style `{ x, y }` stays flow.
  - Append new items. Remove items that are gone. Keep the order of the rest.
  - Write only a file whose content changed.
  - The result is that comments on untouched items and fields survive, and a comment on a deleted item goes with it.
- **Atomic writes:** write to `file.tmp`, then `rename`.
- **Serialized writes:** keep a module-level promise chain or mutex, so two Server Actions that run at once can't interleave read-modify-write. Write `heroes.yaml` before `monsters.yaml`; the order is arbitrary but fixed. Cross-file atomicity is out of scope.
- `notes` with newlines should serialize as a block scalar (`|`).

**Tests (temp dirs via `fs.mkdtemp`):** seeding from `data.example/` (nothing there, one file missing, both present untouched), round-trip with no change producing byte-identical files, comments kept after moving a monster, comments kept after slaying, deleting an item, adding an item, `pos` removed when a hero engages and added back when it goes idle, and concurrent `updateWorld` calls both applied.

**Done when:** tests are green, and a manual check (edit a comment in `data/`, then move a monster through a script) shows the comment survives.

---

## T3: Camera, geometry and canvas shell

**Depends on:** T0. **Owns:** `lib/map/**` and `components/map/MapCanvas.tsx`, `components/map/useCamera.ts`, `components/map/Territories.tsx`.

**Goal:** an infinite SVG canvas with hand-rolled pan and zoom, and the pure geometry that the figure and alarm tasks need. No pan/zoom library.

**Pure geometry (`lib/map/`, with Vitest tests):**
- `Camera = { x: number; y: number; scale: number }`, giving the world point at the top-left plus the zoom. Also `viewBoxOf(camera, viewportSize)`.
- `screenToWorld` and `worldToScreen`.
- `zoomAt(camera, screenPoint, factor)` keeps the world point under the cursor fixed. Clamp scale to about 0.1–4.
- `fitBounds(points, viewportSize, padding)` returns a camera. Handle a single point and no points; for none, center on the origin.
- `flyTarget(camera, point, viewportSize)` centers on a point at a readable zoom. T7 uses it.
- `ringPositions(center, count, radius)` places heroes evenly around a monster, starting at the top and going clockwise. `radiusFor(size)` grows with monster size.
- `edgeArrow(point, viewBox, margin)` returns `null` when the point is on screen. Otherwise it returns the clamped edge position and the angle. T7 uses it.
- `monsterGlyph(size)`, for example 👺 🧌 👹 🐉, or whatever reads best. `heroGlyph(class)` uses a mapping table (archer 🏹, mage 🧙, warrior ⚔️, rogue 🗡️, cleric ✨, commander 👑, …) plus a fallback such as 🛡️. These answer an open question in DESIGN; record the choice there in T9.

**Canvas (`components/map/MapCanvas.tsx`, client):**
- A full-viewport `<svg>` whose `viewBox` comes from the camera. Track viewport size with `ResizeObserver`.
- Wheel zooms at the cursor. Register a non-passive `wheel` listener so `preventDefault` works, and handle trackpad pinch (`ctrlKey` wheel).
- Pointer-dragging empty ground pans, using pointer capture. Ignore drags that start on a figure; mark figures with `data-figure`, or let figures `stopPropagation`.
- Props: `initialCamera`, `children` (world-space layer), `overlay?` (screen-space layer for T7's arrows), and an imperative handle or callback that exposes `camera`, `viewportSize`, `screenToWorld` and `flyTo(point)`. Board (T5) and T6/T7/T8 use these.
- `Territories.tsx` draws the vertical border at x = 0 across the visible height (computed from the viewBox, so it looks infinite), a subtle tint per side, and the "Team battlefield" and "Your keep" banners pinned near the top of the view on each side.
- The background is a subtle grid that scales with zoom, which makes panning readable.

**Done when:** geometry tests are green. A temporary demo page shows the border, banners and a few dummy circles, panning and zooming feel smooth with a mouse wheel and a trackpad, and zoom stays anchored at the cursor.

---

## T4: Server Actions and page wiring

**Depends on:** T1 and T2. **Owns:** `app/actions.ts` and `app/page.tsx`.

**Goal:** connect the data layer to the UI.

**Do:**
- `app/page.tsx` is a server component with `export const dynamic = 'force-dynamic'`. It calls `readWorld()` and renders `<Board world={world} />`. Until T5 lands, render a minimal placeholder that shows counts.
- `app/actions.ts` has `'use server'` and implements every signature in *Shared contracts*. Each one is `updateWorld(w => domainFn(w, …))` followed by `refresh()` from `next/cache`. Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md` and the Server Actions guide first.
- `today` for `slayMonster` is the local date as `YYYY-MM-DD`, not UTC.
- Validate inputs at the boundary: non-empty name, a size from the enum, finite numbers in `pos`. Throw an `Error` with a readable message.
- Errors propagate to the client; T8 shows them.

**Tests:** optional. The logic lives in T1 and T2. A smoke test that calls actions against a temp dir is welcome if it's simple. Mock `next/cache`.

**Done when:** each action works when called from a temporary test button or the dev tools, the YAML changes on disk, the page refreshes, `npm run build && npm start` shows live data rather than a build-time snapshot, and editing the YAML by hand then reloading shows the change.

---

## T5: Figures and Board

**Depends on:** T0 and T3. T1 helps but you can stub it; T4 is needed only for the final wiring. **Owns:** `components/Board.tsx`, `components/map/MonsterFigure.tsx`, `components/map/HeroFigure.tsx`, `components/map/GhostMarker.tsx` and `lib/map/layout.ts`.

**Goal:** draw the world: monsters, heroes in rings around their main target, ghosts, and idle heroes.

**Do:**
- `lib/map/layout.ts` has `layoutWorld(world): { monsters: PlacedMonster[]; heroes: PlacedHero[]; ghosts: PlacedGhost[] }`. It is pure and unit-tested. Engaged heroes are placed with `ringPositions` around their main monster in hero-id order; idle heroes use `pos`. A ghost is a small faint marker near each secondary target. Fan out multiple ghosts on one monster so they don't overlap. Slain monsters are excluded.
- `MonsterFigure` is a circle base sized by `size`, the glyph, a name label below, and a territory-tinted rim. When `unfought`, it gets a pulsing red ring, a CSS keyframe on stroke and opacity that respects `prefers-reduced-motion`.
- `HeroFigure` is a smaller base, the class glyph and a name label. A thin tether line to the main monster is optional; decide if it helps readability.
- `GhostMarker` is the hero glyph at low opacity with a dashed outline. It must accept `onClick` for T6/T8.
- `Board.tsx` (client) receives `world`. It computes the initial camera with `fitBounds` over living monsters plus heroes, renders `MapCanvas` with the figures, and owns the shared UI state:
  - `selection: { kind: 'monster' | 'hero'; id: string } | null`
  - a `camera` handle ref

  Expose clear insertion points (comments or small slot components) for the header (T7), side panel (T8), trophies (T8) and drag handlers (T6). Clicking a monster or hero sets `selection`; clicking empty ground clears it.
- Layout: a header bar on top, the canvas filling the rest, a side panel on the right when there is a selection, and the trophies strip at the bottom. Leave placeholders for those.

**Done when:** the seeded example data renders correctly in both territories. Ring order is stable across reloads, moving a monster in the YAML moves its ring, ghosts appear, the unfought monster pulses, and the opening view fits everything alive.

---

## T6: Drag interactions

**Depends on:** T4 and T5. **Owns:** `components/map/useFigureDrag.ts` and `components/map/GhostPopover.tsx`; it makes small edits to the figure components and `Board.tsx`.

**Goal:** move monsters, assign heroes by dropping them, and manage ghosts.

**Do:**
- **Drag engine:** pointer events with pointer capture on figures. Convert to world coordinates through the camera handle. Use a ~4px movement threshold, so a click (selection) and a drag are told apart. Stop propagation so the canvas does not pan.
- **Optimistic UI:** keep the dragged figure's live position in local state while dragging. On drop, apply the same T1 domain function locally (`useOptimistic` or local state), then call the Server Action. On error, revert and surface the message.
- **Monster drag:** on drop, call `moveMonster(id, pos)`. Its ring of heroes follows live during the drag, since layout is derived. Crossing x = 0 changes territory with no extra work; consider a subtle highlight of the border while dragging across it.
- **Hero drag:**
  - Hit-test the drop point against monster bases, using the base radius in world units.
  - Highlight the monster under the cursor while dragging. Use a different highlight when Shift is held.
  - A plain drop on a monster calls `dropHero(id, { monsterId, shift: false })`.
  - Shift+drop calls `dropHero(id, { monsterId, shift: true })`. Read `event.shiftKey` at drop time. The figure snaps back to its main fight and a ghost appears.
  - A drop on empty ground calls `dropHero(id, { pos })`.
  - A drop back on its current main target is a no-op.
- **Ghost click:** opens `GhostPopover`, anchored near the ghost in screen space, with **Make main** (calls `makeMain`) and **Remove** (calls `removeTarget`). Close it on outside click or Esc.

**Done when:** you can verify by hand that every interaction in DESIGN → *Interactions → Heroes / Monsters* works, the YAML on disk matches each time, there is no flicker or snap-back after the server refresh, and a click still selects without dragging.

---

## T7: Unfought alarm

**Depends on:** T5, and T3's `edgeArrow` and `flyTo`. **Owns:** `components/Header.tsx` and `components/map/EdgeArrows.tsx`; it adds one line each to `Board.tsx` to mount them.

**Goal:** make gaps impossible to miss.

**Do:**
- **Header counter:** "⚠ N unfought", using `unfought(world)` from T1. It is hidden or turns into a calm "All monsters engaged" state when N = 0. Clicking opens a dropdown list of the unfought monsters with glyph, name and territory. Clicking one calls `camera.flyTo(monster.pos)`. Animate the camera over about 300ms with `requestAnimationFrame` and easing; snap instantly under `prefers-reduced-motion`.
- **Edge arrows:** in the canvas `overlay` (screen space), draw one red arrow per off-screen unfought monster, clamped to the viewport edge and pointing toward it, from `edgeArrow`. They recompute on every camera change. An arrow's tooltip or label is the monster name. Clicking an arrow flies to the monster.
- The pulse itself is in T5. Check that it is visible at low zoom.

**Done when:** the counter matches the data, the arrows track correctly while panning and zooming and disappear when the monster comes on screen, and fly-to centers the monster.

---

## T8: Side panel, forms and trophies

**Depends on:** T4 and T5. **Owns:** `components/panel/**` and `components/Trophies.tsx`; it adds small mount points in `Board.tsx` and `Header.tsx` (coordinate with T7, or add the "+ Monster" and "+ Hero" buttons to Board's header slot).

**Goal:** create, edit, slay and delete through forms, and show slain monsters.

**Do:**
- **Monster panel** (when a monster is selected): name, size and glyph, territory, `externalKey` if set, and notes rendered as plain text with newlines kept. Buttons: **Edit**, **Slay**, **Delete**. Also list its fighters (main and ghosts) by name.
- **Hero panel:** name, class and glyph, and targets in order (main first, then ghosts), each clickable to fly to the monster. Buttons: **Edit** and **Delete**.
- **Monster form** (create and edit): name, size (S/M/L/XL with the creature names shown), notes (textarea), and, on create only, "Team or Keep?". On create, compute the spawn position on the client: the visible center of the chosen side, clamped so team is x < 0 and keep is x ≥ 0 even if the view sits entirely on the other side, plus a small random jitter so spawns don't stack. Then call `createMonster`, select the new monster, and fly to it.
- **Hero form:** name and class. Use a free-text input with a `<datalist>` of the known classes from T3's glyph table, and show a live glyph preview. On create, spawn idle at the view center.
- **Slay** has no confirmation; it can be undone by editing the YAML by hand. **Delete** asks for confirmation with a `confirm()` dialog or an inline "Click again to confirm". This is the only safeguard, so make it explicit that the action can't be undone.
- **Trophies strip:** a horizontal strip below the canvas, outside the SVG, with slain monsters sorted by `slain` date, newest first. Each shows the glyph, name and date. Collapse it to a single line when there are many. Clicking a trophy shows its details read-only; reviving is out of scope.
- **Errors:** show a small toast or inline error when an action throws.
- **Keyboard:** Esc closes the panel and the forms.

**Done when:** every flow in DESIGN → *Create, edit, delete* and *Slay or delete a monster* works by hand, slaying a hero's main target promotes the next target or idles the hero where the monster stood, and the YAML stays valid with comments kept.

---

## T9: Integration pass and docs

**Depends on:** all of the above. **Size:** small. Ideally a single agent with a fresh view.

**Do:**
1. Run `npm run lint`, `npx tsc --noEmit`, `npm test` and `npm run build`, and fix the fallout.
2. Walk through the manual checklist below in `npm run dev` **and** `npm run build && npm start`.
3. Update `README.md` (status, scripts including `npm test`) and `docs/DESIGN.md`: resolve the *Open questions* about glyphs and banners with what was built, and record any decisions that changed during implementation.
4. Remove temporary demo pages and buttons.

**Manual checklist:**
- First run with no `data/` seeds from `data.example/`.
- Wheel zoom stays anchored at the cursor. Dragging empty ground pans. The opening view fits everything alive.
- Dragging a monster across x = 0 changes its territory, and the change persists after a reload.
- A plain drop replaces targets. Shift+drop adds a ghost. Shift+drop on an existing target does nothing. A drop on empty ground idles the hero.
- Ghost popover: Make main and Remove work.
- Unfought: the monster pulses, the header count is correct, clicking an entry flies to it, and edge arrows appear when the monster is off-screen.
- Slaying a main target promotes the next target. Slaying a hero's only target idles it where the monster stood. The monster appears in trophies.
- Delete asks for confirmation and then cleans up the same way as slay.
- Hand-edit the YAML (add a comment, change a name), reload, perform an action, and check that the comment survives and the change shows.
- Creating a monster on each side spawns it on the correct side of the border.

---

## Notes for agents

- Commit straight to `main` with small, focused commits. Do not commit anything in `data/`.
- Do not add libraries beyond `yaml` and `vitest` without asking. That especially means no pan/zoom, canvas, state-management or UI-kit libraries.
- If the spec is ambiguous, pick the simplest reading, note it in your final report, and do not widen scope (see DESIGN → *Out of scope*).
- If you need to change a shared contract (types or action signatures), say so explicitly in your report so dependent tasks can adjust.
