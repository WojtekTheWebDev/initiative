<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: Initiative - a planning playing game

A personal, local-only RPG-styled tracker: monsters (work) and heroes (people) on an infinite SVG map. The full spec is in `docs/DESIGN.md`. Read it before building features, and update it when a decision changes.

## Rules

- **Write every change as if it had been designed this way from the start.** Code, comments, tests and docs describe only how things work now. They are the single source of truth. Don't write "previously…", "now…", "no longer…", "replaces the old…", or leave renamed shims, compatibility aliases or dead branches for the old behaviour. When an area changes, rewrite it in place so that a reader can't tell there was an earlier version. History belongs in git and in the `docs/PLAN*.md` files, nowhere else.

- **Data is YAML in `data/` (gitignored).** Never commit it. It contains real names and people topics. Example data goes in `data.example/`.
- **Don't store what can be worked out:** no `layer` (comes from the sign of `pos.x`), no `fighters` or `status` (comes from heroes' `targets`), no `kind` (comes from `size`). A hero's `pos` is stored only while it's idle.
- **Write YAML with the `yaml` package's Document API** so hand-written comments are kept. Re-read the file before every write.
- **Pages that read YAML need `export const dynamic = 'force-dynamic'`.** Keep `cacheComponents` off. After a write in a Server Action, call `refresh()` or `revalidatePath('/')`.
- **Pan and zoom are hand-rolled** with an SVG viewBox and pointer events. Don't add a canvas or zoom library (d3-zoom, React Flow, etc.).
- **Unit-test the pure data functions with Vitest** (assign, Shift-add, ghosts, slay/delete cleanup, territory). The canvas is checked by hand.
- **Out of scope unless the user asks:** Jira sync, a database, multiple users or auth, XP or scoring of people, capacity or burndown, auto-commit, file watching.
