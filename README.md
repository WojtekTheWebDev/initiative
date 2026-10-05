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
| `npm run make:felt` | Regenerates the felt textures in `public/terrain/` (the output is committed) |
| `npm run bake:minis` | Re-render the miniature images in `public/minis/` (see [Minis](#minis)) |
| `npm run bake:terrain` | Re-render the terrain art in `public/terrain/` (see [Terrain](#terrain)) |

## How to use

- **Move around:** the wheel (or a trackpad pinch) zooms at the cursor. Drag empty ground to pan.
- **Cards:** click a monster or hero to open its card beside it: a monster's notes and fighters with **Slay**, a hero's targets (click one to fly there), and **Delete** in the **...** menu. Esc or a click on empty ground closes it.
- **Monsters:** drag one to move it.
- **Heroes:** drag a hero onto a monster to make that its only target. Hold **Shift** while dropping to add the monster as a secondary target instead; the hero stays closest to its main target. Every hero has an arrow to each of its targets: solid for the main target, dashed for secondary ones. Drop a hero on empty ground to make it idle there.
- **Arrows:** click an arrow for **Make main** or **Remove target**. Selecting a hero or monster highlights its arrows.
- **Unfought monsters** pulse red. The red counter under the wordmark lists them, and red arrows at the edge of the view point to the ones off-screen. Click either to fly there.
- **Slay** a monster by dropping it on the trophy shelf at the bottom, or with **Slay** on its card. Heroes fighting it move on to their next target, or stand idle where it was. The toast offers **Undo** for 8 seconds. Click the shelf to open the trophy hall, with a plaque for every slain monster and who fought it. **Delete** does the same cleanup but removes the monster for good, so it asks you to click twice.
- **+ Monster** and **+ Hero** in the top-right corner open the summon and recruit dialogs; **Edit** on a card opens the same dialog filled in.
- **Map controls** in the bottom-right corner zoom and fit everything; **?** lists the keyboard shortcuts (`N`, `H`, `F`, `+`, `-`).
- **Keyboard:** Tab reaches every control, figure and arrow, Enter opens it and Esc closes it.

## Data

- Your data lives in `data/heroes.yaml` and `data/monsters.yaml`.
- `data/` is **gitignored**. It holds real names and people topics, and it has no history or backup.
- On first run, `data/` is seeded from the committed `data.example/`.
- You can edit the YAML by hand at any time. Reload the page to see your changes. The app keeps your comments when it writes the files. There is no file watcher.
- To start over from the example data, stop the app and delete `data/`.
- The format is described in [`docs/DESIGN.md`](docs/DESIGN.md#data-model). Anything that can be worked out (who fights what, the creature type) is not stored.

## Minis

Every figure is a painted miniature: a 3D model rendered once into an image, so the browser only draws pictures. The models live in `assets/minis/` (sources and licences in [`assets/minis/LICENSES.md`](assets/minis/LICENSES.md)), and the baked images and `manifest.json` in `public/minis/` are committed.

To add a model:

1. Put the model in `assets/minis/` as `<id>.glb`, named after what it shows (e.g. `paladin.glb`). Use a CC0 or otherwise free model and add it to `LICENSES.md`. If it is rigged, keep only the clip you want it posed in to keep the file small.
2. Add a sidecar `<id>.json` next to it:
   ```json
   { "name": "Paladin", "kind": "hero" }
   ```
   A monster also needs its size, e.g. `{ "name": "Dragon", "kind": "monster", "size": "XL" }`; the size picks which monster mini is used. Optional keys: `pose` (`{ "clip": "Idle", "time": 0.5 }`), `height` (in base radii, default 2.2), `footprint`, `rotate` (degrees), `hide` (node names), `colors` (material name to colour) and `primer` (one flat colour). They are described in `scripts/bake-minis.ts`.
3. Run `npm run bake:minis` and commit the changed files in `public/minis/`. A new hero mini shows up in the hero form's picker.

The bake renders with three.js in headless Chromium (installed by the script through Playwright on first run), with a fixed camera and lights, so rerunning it gives the same files. `npm run bake:minis -- knight` rebakes only some ids.

## Terrain

The scatter, raised pieces and bridges on the table are baked the same way, from CC0 models in `assets/terrain/models/` (sources and licences in [`assets/terrain/LICENSES.md`](assets/terrain/LICENSES.md)). Each piece of art is a sidecar named after its art key, e.g. `assets/terrain/camp-0.json`, that puts it together from those models:

```json
{
  "name": "Camp",
  "kind": "terrain",
  "radius": 60,
  "parts": [
    { "model": "tent_detailedOpen", "x": -0.45, "z": -0.35, "scale": 1.4, "rotate": 20 },
    { "model": "bonfire", "x": 0.6, "z": 0.3, "scale": 0.2 }
  ]
}
```

`radius` is world units per model unit, `x` and `z` place a part (x to the right, z toward the viewer) around the piece's footprint centre, and a part can also take `y`, `rotate`, `scale` and `colors`. The whole piece can be turned with `rotate` (degrees around the vertical axis) or `along` (the angle its x axis should show at on screen, clockwise from the right); the stone bridges `bridge-0` to `bridge-11` use `along` to lie at every 15 degrees. `assets/terrain/colors.json` holds the material colours shared by every piece. Run `npm run bake:terrain` (or `npm run bake:terrain -- camp-0` for some keys) and commit the changed files in `public/terrain/`. If a raised piece grows, raise its kind's `PIECE_SIZE` in `lib/map/terrain.ts`; `npm test` fails when a baked piece outgrows it.

## Stack

Next.js 16 (App Router, Server Actions), React 19, Tailwind 4, the `yaml` package, and Vitest. The minis are baked with three.js and Playwright (dev only).
