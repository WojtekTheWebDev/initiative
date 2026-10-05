# Initiative: Iteration 4 Plan (the table in the browser)

> **Completed** (October 2026). Kept as a record; `docs/DESIGN.md` is the current spec.

To publish the app on Vercel, the table moves out of the YAML files in `data/`, which a Server Action wrote, and into the browser's local storage. A save file is the backup and the way to move a table between browsers.

## What the user chose

On 2026-10-05 the user reviewed mockups of the save and load UI in the HUD skin (a claude.ai artifact: https://claude.ai/artifact/TTzwxJ29qEgkYzLJLfj4gt) and picked option A for each choice, with the proposed defaults for the rest.

| Area | Pick |
| ---- | ---- |
| Where the controls live | A: a game menu on the wordmark (Save game, Load game, New game, a "last saved" footer), not buttons in the map controls or a ⋯ menu by the create buttons |
| Loading a file | A: a dialog comparing the table with the file, then **Replace table**, not an instant load with Undo |
| First visit and backups | The example table with a banner (Start empty, Load game, dismiss); an amber dot after 7 days of unsaved changes; a red toast that stays when storage is refused |

## Product decisions

| # | Topic | Decision |
| - | ----- | -------- |
| D23 | Where the table lives | One local-storage key holding the world as JSON, with `example`, `fileSavedAt` and `unsavedSince`. No server state at all; the page is static. |
| D24 | Save file | One YAML file per save, `initiative-<date>.yaml`, with `initiative: 1` (the format version), `savedAt`, `monsters` and `heroes`. Hand and agent edits keep working; comments in a loaded file are not kept. |
| D25 | Replace, not merge | Loading replaces the whole table. |
| D26 | Two tabs | The last write wins; other tabs take the change in through the `storage` event. |
| D27 | Old `data/` | Converted once into a save file in `data/` by hand, so the app has no reader for the old pair of files. The YAML store, its Server Actions and comment-keeping sync are gone. |
| D28 | Keys | `⌘S` and `⌘O` (Ctrl elsewhere) save and load while no dialog is open. |
