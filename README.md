# Initiative

*A planning playing game.*

A personal progress tracker shaped like a tabletop RPG battlefield. Work items are **monsters** (bigger scope means a bigger creature) and the people dealing with them are **heroes**. You plan by dragging heroes onto monsters on an infinite map. Monsters nobody is fighting pulse red, so gaps are easy to spot.

It runs only on your machine, for one user. The data is plain YAML that you or an agent can edit by hand.

> Status: implemented. See [`docs/DESIGN.md`](docs/DESIGN.md) for the full spec.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
| ------ | ------------ |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Vitest unit tests (`npm run test:watch` to watch) |
| `npm run lint` | ESLint |

## How to use

- **Move around:** the wheel (or a trackpad pinch) zooms at the cursor. Drag empty ground to pan.
- **Monsters:** drag one to move it. Click it to open the side panel with notes, **Edit**, **Slay** and **Delete**.
- **Heroes:** drag a hero onto a monster to make that its only target. Hold **Shift** while dropping to add the monster as a secondary target instead; it shows as a faint ghost and the hero stays at its main fight. Drop a hero on empty ground to make it idle there.
- **Ghosts:** click a ghost for **Make main** or **Remove**.
- **Unfought monsters** pulse red. The header counter lists them, and red arrows at the edge of the view point to the ones off-screen. Click either to fly there.
- **Slay** moves a monster to the trophies strip at the bottom. Heroes fighting it move on to their next target, or stand idle where it was. **Delete** does the same cleanup but removes the monster for good, so it asks you to click twice.
- **+ Monster** and **+ Hero** in the header open the create forms. Esc closes the panel.

## Data

- Your data lives in `data/heroes.yaml` and `data/monsters.yaml`.
- `data/` is **gitignored**. It holds real names and people topics, and it has no history or backup.
- On first run, `data/` is seeded from the committed `data.example/`.
- You can edit the YAML by hand at any time. Reload the page to see your changes. The app keeps your comments when it writes the files. There is no file watcher.
- To start over from the example data, stop the app and delete `data/`.
- The format is described in [`docs/DESIGN.md`](docs/DESIGN.md#data-model). Anything that can be worked out (who fights what, the creature type) is not stored.

## Stack

Next.js 16 (App Router, Server Actions), React 19, Tailwind 4, the `yaml` package, and Vitest.
