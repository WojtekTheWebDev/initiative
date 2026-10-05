<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: Initiative - a planning playing game

A personal RPG-styled tracker: monsters (work) and heroes (people) on an infinite SVG map. It is a static page that keeps the table in the browser. The full spec is in `docs/DESIGN.md`. Read it before building features, and update it when a decision changes.

## Rules

- **Write every change as if it had been designed this way from the start.** Code, comments, tests and docs describe only how things work now. They are the single source of truth. Don't write "previously…", "now…", "no longer…", "replaces the old…", or leave renamed shims, compatibility aliases or dead branches for the old behaviour. When an area changes, rewrite it in place so that a reader can't tell there was an earlier version. History belongs in git and in the `docs/PLAN*.md` files, nowhere else.

- **The table lives in the browser's local storage; save files are the backup** (`lib/save/`). Never commit a save file (`/data/` and `initiative-*.yaml` are gitignored). They contain real names and people topics. The example table is `data.example/initiative.yaml`, itself a save file.
- **Don't store what can be worked out:** no `fighters` or `status` (comes from heroes' `targets`), no `kind` (comes from `size`). A hero's `pos` is stored only while it's idle.
- **No server state.** Every change runs a pure rule from `lib/domain` on the game store (`components/game/GameProvider.tsx`). Keep the page static, with no Server Actions or route handlers, so it can be hosted on Vercel. Keep `cacheComponents` off.
- **Pan and zoom are hand-rolled** with an SVG viewBox and pointer events. Don't add a canvas or zoom library (d3-zoom, React Flow, etc.).
- **Minis are baked images (`npm run bake:minis`); don't render 3D in the browser.** three.js and Playwright are dev dependencies for the bake script only.
- **Unit-test the pure data functions with Vitest** (assign, Shift-add, secondary targets, target arrows, slay/delete cleanup, revive after a slay, save files, the stored game). The canvas is checked by hand.
- **Out of scope unless the user asks:** Jira sync, a database or server storage, multiple users, auth or sync between browsers, XP or scoring of people, capacity or burndown.
