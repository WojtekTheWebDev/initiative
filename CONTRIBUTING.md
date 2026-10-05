# Contributing

Thanks for wanting to help. Initiative is a small personal project, so issues and pull requests are welcome, but open an issue first for anything bigger than a fix, so we can agree on the shape before you build it.

## Setup

You need Node.js 22 (see `.nvmrc`; 20.9 or newer works).

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # Vitest
npm run lint
npm run build   # also type-checks
```

CI runs lint, tests and the build on every pull request.

## How the code is laid out

- `docs/DESIGN.md` is the spec. Read it before building a feature, and update it in the same pull request when behaviour changes.
- `lib/domain/` holds the game rules as pure functions (assign, Shift-add, slay, revive, delete). Every change to the table runs one of them on the store in `components/game/GameProvider.tsx`.
- `lib/save/` reads and writes save files and the copy in local storage. `lib/map/` is the camera, layout and arrow geometry.
- `components/` is the React UI. The map is a hand-rolled SVG with pointer-event pan and zoom.
- `AGENTS.md` lists the project rules for coding agents; they apply to people too.

## Ground rules

- **Keep it static.** No server state, Server Actions or route handlers: the table lives in the browser and save files are the backup.
- **Don't store what can be worked out** (who fights what, a monster's kind).
- **Test the pure functions** in `lib/` and the helpers next to components with Vitest. The canvas is checked by hand, so describe what you tried in the pull request.
- **No canvas or zoom libraries**, and no 3D in the browser: minis and terrain are baked images (see the README).
- **New art must be CC0** or similarly free, credited in the folder's `LICENSES.md`.
- **Never commit a real save file.** `/data/` and `initiative-*.yaml` are gitignored because they hold real names. Use the example table or made-up names in tests, issues and screenshots.
- Write code, comments and docs as if things had always worked the way they do now; history belongs in git.

## Out of scope

To keep Initiative a single-player tool that never sends your table anywhere, these are out of scope: server or database storage, accounts and multiple users, sync between browsers, and scoring people (XP, capacity, burndown). Jira import is a maybe for later.
