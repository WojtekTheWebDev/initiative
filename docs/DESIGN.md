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
- **Engaged hero position** is a ring around the main target, ordered by hero id. The figure follows the monster when it moves.

Rules for writing:
- Use the [`yaml`](https://eemeli.org/yaml/) package's Document API, so hand-written comments are kept.
- Every write re-reads the file first. Never overwrite the file with stale in-memory state.

## Map

- **Canvas:** infinite, built by hand with an SVG `viewBox` and pointer events, with no pan/zoom library.
  - The wheel zooms at the cursor.
  - Dragging empty ground pans.
  - Dragging a figure moves it.
- **Opening view:** fits the bounding box of everything still alive.
- **Territories:** a vertical border at x = 0, with banners for the team side and the keep.
- **Figures:** emoji or icon glyphs on SVG circle bases, with name labels. Real art can come later.

## Interactions

**Monsters**
- **Drag** to move it. This saves `pos`, and crossing x = 0 changes its territory.
- **Click** to open the side panel, which has notes, edit, slay and delete.

**Heroes**
- A **plain drop on a monster** sets `targets` to just that monster.
- **Shift+drop on a monster** adds it to the end of `targets` as a ghost. The figure stays at its main fight. If the monster is already a target, nothing happens.
- A **drop on empty ground** clears `targets` and saves `pos`.
- **Clicking a ghost** opens a popover with **Make main** and **Remove**.

**Unfought alarm**
- The monster pulses red.
- A header counter (e.g. "⚠ 3 unfought") lists them. Clicking one pans and zooms to it.
- Off-screen unfought monsters show as red arrows pinned to the edge of the view.

**Slay or delete a monster**
- Slay sets `slain: <today>` and moves the monster to the trophies strip, which sits outside the canvas.
- Slay and delete clean up the same way. The monster is removed from every hero's `targets`.
  - If it was a hero's main target, the next target becomes main.
  - If the hero has no targets left, they go idle where the monster stood, and `pos` is saved.
- Delete asks for confirmation. That is the only safeguard, since there is no backup.

**Create, edit, delete** (side-panel forms)
- **Monster form:** name, size, notes, and "Team or Keep?". The last only picks the spawn side, near the visible center of that side.
- **Hero form:** name and class. A new hero spawns idle at the center of the view.

## Technical notes (Next.js 16)

- Keep `cacheComponents` **off**. Add `export const dynamic = 'force-dynamic'` to the page that reads YAML. Without it, `next start` serves a snapshot from build time.
- Writes go through Server Actions (`'use server'`), followed by `refresh()` (new in 16) or `revalidatePath('/')`.
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

- Which glyph each hero class gets.
- What the border and territory banners look like.
- How one SVG performs as the number of items grows. Revisit only if it gets slow.

## Suggested build order

1. The YAML data layer with Vitest tests, plus the seed files in `data.example/`.
2. The SVG map with pan and zoom, drawing monsters and heroes.
3. Drag interactions and the unfought alarm.
4. The side panel for creating, editing, slaying and deleting.
