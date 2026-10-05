# Initiative: Iteration 3 Plan (the obsidian HUD)

This plan turns the UI review into tasks that separate agents can pick up. The format matches `docs/PLAN-2.md`: each task lists what it depends on, which files it owns, the contract it must keep, and how to tell it is done.

**Every agent must first read** `AGENTS.md`, `docs/DESIGN.md` (its HUD and Interactions sections are the target of this plan), this file, and the Next.js guides in `node_modules/next/dist/docs/` for any Next API it uses.

**Write it as if it were the first iteration.** This plan talks about "removing" and "replacing" things only so you know what to touch. The code, comments, tests, `docs/DESIGN.md` and `README.md` you leave behind must describe only the current design. Delete what is replaced rather than deprecating it: no aliases, no shims and no commented-out code. See the first rule in `AGENTS.md`.

## What the user chose

On 2026-10-05 the user reviewed twelve UI areas, each with three or four mocked-up proposals drawn over a screenshot of the real table (the review page is a claude.ai artifact: https://claude.ai/artifact/9N5kDmjSFzv21b1n8oYU7W). The audit of the old UI found: plain white starter chrome around a painted table, header and footer bars using about 100 px of the screen, small pickers with cut-off names, Slay and Delete side by side, trophies with only a name and date, no zoom or help controls, and emoji used as icons.

| Area | Pick |
| ---- | ---- |
| 1 Visual style | 1C Obsidian HUD: dark translucent glass, gold hairlines, Cinzel and Barlow |
| 2 Main screen layout | 2B Full-table HUD: table edge to edge, floating clusters in the corners |
| 3 Unfought alarm | 3C Muster tokens down the left edge |
| 4 Selected figure details | 4B Card next to the figure |
| 5 Editing | 5C Edit dialog |
| 6 Adding a monster | 6D Summoning dialog with a size slider and a big preview |
| 7 Adding a hero | 7B Character creator |
| 8 Slaying and deleting | 8C Drag a monster onto the trophy shelf |
| 9 Trophies | 9C Trophy hall |
| 10 Managing targets | 10B Round buttons on the arrow |
| 11 Map controls and help | 11B Corner controls |
| 12 Save errors | 12A Toast at the bottom |

## Product decisions in this plan

The user confirmed every decision below on 2026-10-05.

| # | Topic | Decision |
| - | ----- | -------- |
| D15 | Theme | The HUD is dark glass in light and dark mode, like the table. The light and dark tokens of the starter look go away. |
| D16 | Who fought it | Slaying stores `slainBy`: the heroes that targeted the monster at that moment, main first then secondary, each group by id. Absent when nobody fought it. The trophy hall shows it. |
| D17 | Undo a slay | The slay toast offers **Undo** for 8 seconds. Undo clears `slain` and `slainBy` and gives every hero the slay changed its old `targets` and idle `pos` back, unless that hero has changed since. |
| D18 | One dialog per kind | Area 5 (edit dialog) and areas 6 and 7 (summon, character creator) are one `MonsterDialog` and one `HeroDialog`, each with a create and an edit mode. |
| D19 | Shelf and hall together | The trophy shelf from the HUD layout (2B) is both the drop target for slaying (8C) and the button that opens the trophy hall (9C). |
| D20 | Class suggestions | The hero dialog offers the classes other heroes already have as chips. There is no fixed list, and class stays free text. |
| D21 | Shortcuts | `N` new monster, `H` new hero, `F` fit everything, `+` and `-` zoom, `?` the shortcuts sheet. Ignored while typing in a field. |
| D22 | Side panel | Removed. The figure card, the dialogs and the trophy hall take over everything it did. |

## Dependency graph

```
T17 HUD shell and skin ──┬─► T18 Map controls and shortcuts ──┐
                         ├─► T19 Muster tokens ────────────────┤
                         ├─► T20 Figure card ──────────┐       │
                         ├─► T21 Monster and hero dialogs ─────┼─► T25 Integration pass
                         ├─► T22 Arrow buttons ─────────────────┤
T23 slainBy and revive ──┴──────────────────► T24 Trophy shelf, hall and slay toast ─┘
                                              (also needs T20)
```

| Wave | Tasks (can run in parallel) |
| ---- | --------------------------- |
| 1 | T17, T23 |
| 2 | T18, T19, T20, T21, T22 |
| 3 | T24 |
| 4 | T25 |

T17 lays down the tokens, icons and glass primitives everything else is built from, so wave 2 only starts once it is merged. In wave 2, T19, T20, T21 and T22 each make small edits to `components/Board.tsx` to mount their piece; keep those edits to a few lines, with the logic in your own files, and merge one task at a time.

## Shared contracts

### Glass primitives (T17)

```tsx
// components/ui/
icons.tsx      // export const Icon: Record<IconName, (props: SVGProps<SVGSVGElement>) => JSX.Element>
               // names: swords, trophy, plus, warn, close, dots, pen, crown, shears, zoomIn,
               // zoomOut, fit, help, chevronLeft, chevronRight, undo, search
Glass.tsx      // <Glass as="div" className=…>: the glass surface (token background, blur, hairline, radius)
Button.tsx     // <Button tone="default" | "primary" | "danger" icon=… >, <IconButton label=… icon=… />,
               // <ConfirmButton confirmLabel=…> (two clicks, the second label says it can't be undone)
Dialog.tsx     // <Dialog title open onClose dirty>: centred, dims the table, traps focus, Esc closes,
               // a click on the dim closes only when !dirty
Toast.tsx      // useToast(): { show({ message, tone: "error" | "slain", action?: { label, run } }) }
               // one toast at a time, bottom centre above the trophy shelf; error 6 s, slain 8 s
Portrait.tsx   // <Portrait mini size bronze? ring?="red" | "gold">: MiniPortrait moved here, with variants
```

Tokens live in `app/globals.css` as CSS custom properties (`--hud-glass`, `--hud-line`, `--hud-fg`, `--hud-muted`, `--hud-gold`, `--hud-danger`, `--hud-radius`, `--hud-blur`), with an opaque `--hud-glass` under `@supports not (backdrop-filter: blur(1px))`.

### HUD slots (T17)

`Board` renders the map full-window and a `<Hud>` with named slots, so wave 2 tasks mount into a slot rather than restyling the layout:

```tsx
<Hud
  topLeft={<Wordmark /> /* T19 adds <MusterTokens /> under it */}
  topRight={<CreateButtons /> /* T21 wires them to the dialogs */}
  bottomCenter={/* T24: <TrophyShelf /> */}
  bottomRight={/* T18: <MapControls /> */}
/>
```

`MapHandle` gains `zoomBy(factor: number)` and `fitAll()` (T18), next to the existing `flyTo`.

### Data (T23)

```ts
// lib/types.ts
export type Monster = { …; slain?: string; slainBy?: string[]; externalKey?: string };

// lib/domain/lifecycle.ts
/** Sets slain and slainBy (main fighters first, then secondary, each by id; absent if none), then cleans up targets. */
export function slay(world: World, monsterId: string, today: string): World;
/** What a slay changed for one hero, so it can be undone. */
export type HeroBefore = { id: string; targets: string[]; pos?: Pos };
/**
 * Clears slain and slainBy. Each hero in `before` gets its targets and pos back
 * only if it still looks exactly the way the slay left it; otherwise it is left alone.
 */
export function revive(world: World, monsterId: string, before: HeroBefore[]): World;

// app/actions.ts
export async function slayMonster(id: string): Promise<ActionResult<HeroBefore[]>>; // returns what it changed
export async function reviveMonster(id: string, before: HeroBefore[]): Promise<ActionResult>;
```

`slainBy` is written with the Document API like every other field (`MONSTER_FIELDS` in `lib/store/sync.ts`, after `slain`), and `validate.ts` accepts a list of strings.

---

## T17: HUD shell and skin

**Depends on:** nothing. **Size:** medium.

**Owns:** `app/globals.css`, `app/layout.tsx`, `components/Board.tsx` (layout part), `components/Hud.tsx` (new), `components/ui/` (new), `components/MiniPortrait.tsx` (moved into `components/ui/Portrait.tsx`), `components/map/DragError.tsx` (replaced by the toast). It deletes the `Header` in `Board.tsx`.

**Do:**
1. Tokens, fonts and the always-dark theme (D15): replace the light and dark background tokens with the HUD tokens above; `body` gets a dark ground that matches the felt edge. Load Barlow with `next/font/google` next to Cinzel; drop Geist if nothing else uses it.
2. Build the primitives in `components/ui/` from the contract, with visible focus rings and `prefers-reduced-motion` respected.
3. `Board` renders the map at full window size and `<Hud>` with its four corner slots. The top left shows the wordmark (crossed-swords icon and "Initiative" in gold Cinzel capitals); the top right shows **+ Monster** and **+ Hero** (still opening the old side panel until T21 lands). Move the trophy strip and the unfought chip into temporary slots so nothing is lost before wave 2 (T19 and T24 delete them).
4. Replace `DragError` with `useToast` errors.
5. Replace every emoji in the UI with an icon from the set.
6. Hide or move the Next.js dev indicator so it doesn't sit under a HUD cluster (`devIndicators` in `next.config.ts`).

**Done when:** lint, `tsc`, tests and build pass. Checked by hand: the table fills the window, the HUD clusters read on every biome, the page looks the same with the OS in light and dark mode, and a failed save shows the new toast.

---

## T18: Map controls and shortcuts

**Depends on:** T17. **Size:** small.

**Owns:** `components/map/MapControls.tsx` (new), `components/ShortcutsSheet.tsx` (new), `components/useShortcuts.ts` (new), and `zoomBy` and `fitAll` in `components/map/MapCanvas.tsx` and `useCamera.ts`.

**Do:**
1. The bottom-right cluster: zoom in, zoom out, fit everything, **?**. Zoom steps by 1.5 around the centre of the screen and glides like a fly-to; fit uses the same bounds as the opening view.
2. The shortcuts sheet, as listed in DESIGN.md.
3. `useShortcuts` binds D21's keys, ignoring keys typed into inputs, textareas and contenteditable elements, and while a dialog is open (except Esc, which the dialog owns).

**Done when:** lint, `tsc` and build pass; each control and key works by hand, and typing an "f" in a name field doesn't fit the view.

---

## T19: Muster tokens

**Depends on:** T17. **Size:** small.

**Owns:** `components/MusterTokens.tsx` (new). It deletes `components/UnfoughtAlarm.tsx`. `components/map/EdgeArrows.tsx` only gets restyled to the HUD tokens.

**Do:** below the wordmark, the red count and one red-ringed portrait per unfought monster with its name, largest first, then by name; past six, "+N" opens a glass list of the rest. A click flies to the monster (the same `flyTo` the alarm used). With no unfought monsters, show the "All engaged" seal. Tokens are buttons with accessible names ("Fly to unfought monster Legacy API Sunset").

**Done when:** lint, `tsc` and build pass. By hand: slaying, assigning and creating monsters update the tokens at once (they read from the optimistic world), and twelve unfought monsters fold correctly.

---

## T20: Figure card

**Depends on:** T17. **Size:** medium.

**Owns:** `components/card/` (new: `FigureCard.tsx`, `MonsterCard.tsx`, `HeroCard.tsx`, `placeCard.ts` and its test). It deletes `components/panel/SidePanel.tsx`, `MonsterPanel.tsx`, `HeroPanel.tsx` and the panel parts of `usePanel.ts` (selection state moves into `Board` or a small `useSelection`).

**Do:**
1. `placeCard(anchor, cardSize, viewport)` is pure: it puts the card to the right of the figure's base with the pointer at the base, flips it to the left near the right edge and clamps it inside the viewport. Unit-test the flip and the clamps.
2. Render the card in MapCanvas' screen-space overlay from the drawn (gliding) position, so it follows pans, zooms and glides. Hide it while any figure is dragged.
3. Content and actions as in DESIGN.md (HUD → Figure card). Slay calls `slayMonster` for now; T24 adds the toast and undo. Delete uses `ConfirmButton` inside the ⋯ menu. Edit calls the dialog opener T21 provides (until then, leave the button out).
4. Esc, a click on empty table and selecting another figure close it, keeping today's Esc order (popover and drag first).

**Done when:** lint, `tsc`, tests and build pass. By hand: the card never leaves the screen, stays attached while panning and while figures glide after a drop, and works for idle heroes, engaged heroes and unfought monsters.

---

## T21: Monster and hero dialogs

**Depends on:** T17. **Size:** medium.

**Owns:** `components/dialogs/` (new: `MonsterDialog.tsx`, `HeroDialog.tsx`, `SizeSlider.tsx`, `MiniCarousel.tsx`). It deletes `components/panel/MonsterForm.tsx` and `HeroForm.tsx`, and edits `components/panel/CreateButtons.tsx` (move it to `components/CreateButtons.tsx`).

**Do:**
1. Both dialogs as in DESIGN.md (HUD → Dialogs), each with a create and an edit mode (D18). Keep the existing patch logic: send only changed fields; changing only the mini writes only `mini`.
2. `SizeSlider` is a proper slider (`role="slider"`, arrow keys, four labelled stops). `MiniCarousel` flips through `HERO_MINIS`, Neutral first, with arrow keys, and shows a missing pick as described.
3. Class chips (D20): the distinct, non-empty classes of the other heroes, sorted; a click fills the field.
4. A new figure spawns at the centre of the visible map (the whole window now), is selected with its card open, and the view flies to it.
5. Wire **+ Monster**, **+ Hero**, `N`, `H` and the card's **Edit**.

**Done when:** lint, `tsc` and build pass. By hand: create and edit both kinds, Esc and the dim behave as specified, focus returns to the button that opened the dialog, and the YAML keeps its comments.

---

## T22: Arrow buttons

**Depends on:** T17. **Size:** small.

**Owns:** `components/map/TargetPopover.tsx` (rewritten as `TargetButtons.tsx`).

**Do:** clicking an arrow shows the label and the two round buttons at its midpoint, as in DESIGN.md: the crown only on a secondary arrow, the shears always. Keep the existing `makeMain`, `removeTarget` and close behaviour (capture-phase outside press, Esc with `preventDefault`).

**Done when:** lint, `tsc` and build pass; by hand both actions work and close the buttons, and keyboard users can reach both buttons.

---

## T23: slainBy and revive

**Depends on:** nothing. **Size:** small.

**Owns:** `lib/types.ts`, `lib/domain/lifecycle.ts` and its tests, `lib/domain/validate.ts`, `lib/store/sync.ts`, `app/actions.ts` (`slayMonster`, new `reviveMonster`), `data.example/monsters.yaml`.

**Do:** implement the Data contract above. Add `slainBy` to the slain example monster in `data.example/` and to the field comment at the top of that file.

**Tests (Vitest):** `slainBy` order (main fighters first, then secondary, each by id) and absence when nobody fought; revive restores targets and idle `pos` for unchanged heroes; revive leaves a hero alone that was reassigned after the slay; revive of a monster that isn't slain changes nothing; a write keeps hand-written comments and puts `slainBy` after `slain`.

**Done when:** lint, `tsc`, tests and build pass.

---

## T24: Trophy shelf, hall and slay toast

**Depends on:** T17, T20 and T23. **Size:** medium.

**Owns:** `components/trophies/` (new: `TrophyShelf.tsx`, `TrophyHall.tsx`, `trophies.ts` and its test). It deletes `components/Trophies.tsx` and the trophy mode of the old panel. It edits `components/map/useFigureDrag.ts` and `drag.ts` for the shelf drop.

**Do:**
1. `trophies.ts` is pure: newest first, grouping by month of `slain`, and `slainBy` ids turned into names, skipping deleted heroes. Unit-test it.
2. The shelf and the hall as in DESIGN.md (HUD → Trophy shelf, Trophy hall).
3. **Drop to slay:** while a monster is dragged, the shelf glows gold; dropping on it slays the monster instead of moving it. A hero dropped on it does nothing. Hit-testing for the shelf lives with the other drop rules in `drag.ts`, with a test.
4. **Slay toast:** both the shelf drop and the card's Slay button slay optimistically, then show "<name> slain" with **Undo**. Undo calls `reviveMonster` with the `HeroBefore[]` from `slayMonster`; the monster walks back to its home and its fighters return.

**Done when:** lint, `tsc`, tests and build pass. By hand: slay by drop and by button, undo both within 8 seconds, see the plaque in the hall with "by …", and check that an accidental drop just short of the shelf only moves the monster.

---

## T25: Integration pass

**Depends on:** all of the above. **Size:** small.

**Do:**
1. Run the app against `data.example/` and against the 40-monster, 25-hero stress world (generated into a scratch `data/` copy, never committed). Measure panning and dragging with the glass HUD on screen; if the blur costs frames, reduce it on the largest surfaces (the hall and dialogs) before anything else.
2. Check every flow in DESIGN.md's HUD and Interactions sections by hand, including Esc order across card, arrow buttons, dialogs, hall and sheet, and keyboard-only use of every control.
3. Read `docs/DESIGN.md`, `README.md` and `AGENTS.md` once more for anything that still mentions the side panel, header, trophy strip, unfought chip or emoji.
4. Mark this plan as completed at the top, as `docs/PLAN-2.md` is.

**Done when:** lint, `tsc`, tests and build all pass, and the checklist has been gone through, with any remaining issues written up for the user.
