# Initiative

*A planning playing game.*

A personal progress tracker shaped like a tabletop RPG battlefield. Work items are **monsters** (bigger scope means a bigger creature) and the people dealing with them are **heroes**. You plan by dragging heroes onto monsters on an infinite map. Monsters nobody is fighting pulse red, so gaps are easy to spot.

The map has two territories: the **team battlefield** (engineers against initiatives, incidents and tech debt) and **your keep** (your own work: hiring, people issues, stakeholder asks).

It runs only on your machine, for one user. The data is plain YAML that you or an agent can edit by hand.

> Status: design agreed, implementation not started. See [`docs/DESIGN.md`](docs/DESIGN.md) for the full spec.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data

- Your data lives in `data/heroes.yaml` and `data/monsters.yaml`.
- `data/` is **gitignored**. It holds real names and people topics, and it has no history or backup.
- On first run, `data/` is seeded from the committed `data.example/`.
- You can edit the YAML by hand at any time. Reload the page to see your changes. The app keeps your comments when it writes the files.

## Stack

Next.js 16 (App Router, Server Actions), React 19, Tailwind 4, the `yaml` package, and Vitest.
