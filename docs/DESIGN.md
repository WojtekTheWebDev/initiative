# Initiative: Design

*Initiative - a planning playing game.*

A personal, local-only progress tracker shaped like a tabletop RPG battlefield. Work items are **monsters** and the people fighting them are **heroes**. You plan your day by moving figures around a map. The question the map answers at a glance is **who fights what**, and above all **which monsters nobody is fighting**.

It is a tool for one person (an engineering manager) to use in daily work. It is not a team tool and does not replace Jira.

## Concepts

| Concept   | Meaning                                                                 |
| --------- | ----------------------------------------------------------------------- |
| Monster   | Something to deal with: an initiative, incident, tech debt, a hire, a people issue, a stakeholder ask |
| Hero      | An engineer on the team, or you (e.g. class `commander`)                 |
| Territory | Where a monster stands: the **team battlefield** (x < 0) or **your keep** (x ≥ 0) |
| Main target | The monster a hero's figure stands beside                             |
| Ghost     | A faint marker for a hero's secondary targets                            |
| Unfought  | A living monster that no hero targets. It pulses red                     |
| Slain     | Done. It leaves the map and goes into the trophies strip                 |

## Data model

Plain YAML files in `data/`. The folder is **gitignored**, so it has no history and no backup by design. If `data/` is missing on startup, it is seeded from the committed `data.example/`. You or an agent can edit the files by hand. Reload the page to see the changes, since there is no file watcher.

```yaml
# data/monsters.yaml
- id: search-rewrite        # slug from name; unique suffix on clash
  name: Search Rewrite
  size: XL                  # S | M | L | XL → goblin | orc | troll | dragon
  pos: { x: -420, y: 180 }  # always present; x < 0 team, x ≥ 0 keep
  notes: |                  # optional, free text
    Next step: spike on Meilisearch
  slain: 2026-10-14         # optional; absent = alive
  externalKey: SRCH-12      # optional; reserved for a future Jira import

# data/heroes.yaml
- id: ana
  name: Ana
  class: archer             # free label → token glyph (mapping table + fallback)
  targets: [search-rewrite, flaky-ci]   # ordered; first = main, rest = ghosts
  pos: { x: -600, y: 40 }   # stored only while idle (targets empty)
```

Rules worked out from the data, not stored:
- **Territory** comes from the sign of `pos.x`. There is no `layer` field.
- **Engaged or unfought** depends on whether any hero has the monster in `targets`. There is no `fighters` or `status` field.
- **Creature type** comes from `size`. There is no `kind` field.
- **Engaged hero position** is on an arc above the main target, fanned out from the top in hero-id order. A wedge at the bottom stays clear for the monster's name label; if the arc gets crowded, its radius grows. Ghosts stand on a second, outer arc (or the inner one if the monster has no main fighters). Everything follows the monster when it moves.

Rules for writing:
- Use the [`yaml`](https://eemeli.org/yaml/) package's Document API, so hand-written comments are kept.
- Every write re-reads the file first. Never overwrite the file with stale in-memory state.

## Map

- **Canvas:** infinite, built by hand with an SVG `viewBox` and pointer events, with no pan/zoom library.
  - The wheel always zooms at the cursor, and so does a trackpad pinch. Two-finger scrolling zooms too; it does not pan.
  - Dragging empty ground pans. A light grid scales with the zoom.
  - Dragging a figure moves it.
- **Opening view:** fits the bounding box of everything still alive.
- **Territories:** a dashed vertical border at x = 0 that spans the whole view, a faint red tint on the team side and a faint blue tint on the keep. Two banners stay pinned near the top of the view at a fixed screen size: a red "⚔️ Team battlefield" and a blue "🏰 Your keep". The border glows while a monster is dragged across it.
- **Figures:** emoji glyphs on SVG circle bases, with name labels that never shrink below a readable size. Monster rims take the territory colour. Real art can come later.
  - Monsters by size: S 👺 goblin, M 👹 orc, L 🧌 troll, XL 🐉 dragon. The base grows with size.
  - Heroes by class: commander 👑, warrior ⚔️, archer 🏹, mage 🧙, rogue 🗡️, cleric ✨, paladin 🔱, ranger 🌲, druid 🌿, bard 🎻, monk 🥋, ninja 🥷, artificer 🔧, alchemist ⚗️, scout 🔭, necromancer 💀. Common synonyms map onto these (wizard → mage, knight → warrior, engineer → artificer, …). Any other class gets 🛡️. The table is in `lib/map/glyphs.ts`.
  - Ghosts are the hero glyph, faint, with a dashed outline.

## Interactions

**Monsters**
- **Drag** to move it. This saves `pos`, and crossing x = 0 changes its territory.
- **Click** to open the side panel, which has notes, fighters, edit, slay and delete.

**Heroes**
- A **plain drop on a monster** sets `targets` to just that monster. A plain drop back on the current main target changes nothing, so the ghosts stay.
- **Shift+drop on a monster** adds it to the end of `targets` as a ghost. The figure stays at its main fight. If the monster is already a target, nothing happens. An idle hero gets it as the main target.
- A **drop on empty ground** clears `targets` and saves `pos`.
- A drop over the side panel, or off the map, does nothing and the hero snaps back.
- While dragging, the monster under the cursor is highlighted: green for a plain drop, purple with Shift.
- **Clicking a ghost** opens a popover with **Make main** and **Remove**. Esc or a click outside closes it.
- Changes show at once and are saved in the background. If saving fails, the change is undone and the error is shown.

**Unfought alarm**
- The monster pulses red.
- A header counter (e.g. "⚠ 3 unfought") lists them. Clicking one pans and zooms to it.
- Off-screen unfought monsters show as red arrows pinned to the edge of the view.

**Slay or delete a monster**
- Slay sets `slain: <today>` (local date) and moves the monster to the trophies strip, which sits below the canvas, newest first. Clicking a trophy shows it read-only. Slaying a monster that is already slain changes nothing. To revive one, delete its `slain` line by hand.
- Slay and delete clean up the same way. The monster is removed from every hero's `targets`.
  - If it was a hero's main target, the next target becomes main.
  - If the hero has no targets left, they go idle where the monster stood, and `pos` is saved.
- Delete needs a second click on a button that says it can't be undone. That is the only safeguard, since there is no backup. Deleting a hero works the same way.

**Create, edit, delete** (side-panel forms)
- The side panel is an overlay on the right edge of the map. The map keeps its size underneath. Esc leaves an edit form first, then closes the panel.
- **Monster form:** name, size, notes, and "Team or Keep?". The last only picks the spawn side, near the visible center of that side (not counting the area under the panel). If that side is out of view, the monster still spawns on it, next to the border.
- **Hero form:** name and class, with the known classes suggested and a glyph preview. A new hero spawns idle at the center of the view.
- A new monster or hero is selected and the view flies to it. A rename never changes the id.

## Technical notes (Next.js 16)

- Keep `cacheComponents` **off**. Add `export const dynamic = 'force-dynamic'` to the page that reads YAML. Without it, `next start` serves a snapshot from build time.
- Writes go through Server Actions (`'use server'`), followed by `refresh()` (new in 16) or `revalidatePath('/')`.
- In production, Next.js hides the message of an error thrown from a Server Action. So actions return `{ ok: false, error }` instead of throwing, and the client turns it back into an `Error` (`lib/action-result.ts`).
- Avoid deprecated APIs: the one-argument `revalidateTag`, and `middleware`, which is now `proxy`.
- Read `node_modules/next/dist/docs/` before relying on Next APIs.

## Testing

Use Vitest unit tests on the pure functions that change data:
- assign, Shift-add, and promoting or removing a ghost
- slay and delete cleanup
- territory from `pos.x`
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
