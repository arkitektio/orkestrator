# Orkestrator — Engineering Conventions

Conventions for working in this codebase. Read before adding UI that touches a
backend, opens a dialog, or adds an action to a model.

## 1. Wrap module-specific functionality in Guards

Anything specific to one backend module — above all **GraphQL queries/mutations
against a particular service** (mikro, rekuest, kraph, kabinet, alpaka,
omero_ark, lok, …) — must be wrapped in that module's guard from
`@/app/Arkitekt`: `Guard.Mikro`, `Guard.Rekuest`, `Guard.Kraph`, etc. (built via
`Arkitekt.buildServiceGuard("…")`).

`buildGuard` (`src/renderer/src/lib/arkitekt/index.tsx`) renders `children` only
when the service state is `"ready"`; otherwise it renders the relevant fallback
prop (`unavailable` / `unconfigured` / `configuring` / `challenging`, default
`null`). Common form: `<Guard.Rekuest unavailable={<></>}>…</Guard.Rekuest>`.

**Why:** the Apollo client for a service only exists when that service is
configured and available. Deployments may omit modules, so a component that
calls `useGet…Query` without its backend will throw. Module UI must degrade
gracefully.

**How:** the guard must wrap the component from the **outside**. React hooks (the
query) fire on mount, so guarding the JSX *inside* the component is too late —
the query already ran. Put `<Guard.X>` around the component so it never mounts
until the service is ready.

Examples in-tree:
- `app/configureSmartBuilder.tsx` `renderHover` pairs each hover card with its
  module guard (`{ Component, Guard }`) and renders
  `<ModuleGuard><Suspense>…</Suspense></ModuleGuard>`.
- `providers/smart/extensions/SectionHost.tsx` wraps each menu section's query
  in the section's `Guard` (declared on its descriptor, see §4).
- The dialog provider wraps every dialog in `<Guard.Rekuest>`.

## 2. The dialog system

Dialogs are a central **id registry**, not ad-hoc `<Dialog>` instances.

- **Factory:** `createDialogProvider(registry)` in
  `src/renderer/src/lib/generic/providers/DialogProvider.tsx` → returns
  `{ DialogProvider, useDialog, registry }`.
- **Registry:** instantiated once in `src/renderer/src/app/dialog.tsx` — a map of
  string id → component (e.g. `createshortcut: CreateShortcutDialog`,
  `actionassign: ActionAssignForm`, `createentity: CreateEntityForm`). It is
  type-safe: `openDialog`'s props are inferred per id from the component.
- **Use:**
  ```ts
  const { openDialog, openSheet, closeDialog } = useDialog();
  openDialog("createshortcut", { id: action.id }, { size?: "small"|"medium"|"large", className? });
  ```
  `openSheet(id, props, { side, size })` shows the same component in a side
  `Sheet`. `closeDialog()` dismisses.
- **Rendering:** the provider renders the matched component inside one shared
  `DialogContent` / `SheetContent`, wrapped in `<Guard.Rekuest>`. Default dialog
  is wide (`min-w-[80vw]` when no `size`/`className` given) — pass `size` /
  `className` to shrink. The component receives its props directly and calls
  `closeDialog()` itself (e.g. after a successful mutation).

**To add a dialog:** build the component (own props, `closeDialog` on success),
register it in the `app/dialog.tsx` registry, then open it by id from anywhere
with `useDialog()`.

## 3. Local actions are the primary way to add model-specific actions

Model-specific actions (open a dialog, navigate, run a mutation) should be
**local actions** — not one-off buttons hand-placed in a card.

- **Definition:** an `Action`
  (`src/renderer/src/lib/localactions/LocalActionProvider.tsx`) has `title`,
  `description`, `icon?`, `pinned?`, `conditions` (readonly), optional
  `collections`, and `execute(params)`. `conditions` decide when it applies, e.g.
  `{ type: "identifier", identifier: "@kraph/graph" }`, `{ type: "nopartner" }`,
  `{ type: "pidentifier", identifier: "@kraph/entitycategory" }` (partner /
  drag-drop), `{ type: "identifiers", identifiers: [...] }`.
- **execute params:** `{ state, dialog, navigate, services, confirm, onProgress,
  abortSignal, modifiers, location }`. `state.left` / `state.right` are the
  selected / partner `Structure[]`. Open a dialog with
  `dialog.openDialog("createX", {...})`.
- **Registration:** per-module action maps (`MIKRO_ACTIONS`, `REKUEST_ACTIONS`,
  `KRAPH_ACTIONS`, `KABINET_ACTIONS`, `ALPAKA_ACTIONS`, `LOK_ACTIONS`,
  `ELEKTRO_ACTIONS`) are merged in `src/renderer/src/app/localactions.tsx` via
  `createLocalActionProvider({...})`. Example: `kraph/actions.tsx`
  `NewEntityAction` → `dialog.openDialog("createentity", { category: graph })`.

**Why it must be a local action:** both surfaces consume the same
`useMatchingActionEntries`, so one registered action with the right `conditions`
automatically appears in **both**:
1. the **menu** — `SmartContext` → the `local.actions` section
   (`providers/smart/extensions/local/sections.tsx`), shown on right-click /
   in the floating partner panel.
2. the **button** — `ObjectButton` renders `SmartContext` in a popover.

When adding a model-specific action, register it as a local action with the
correct `conditions` and confirm it shows up from **both** the context menu and
the `ObjectButton`. A bespoke button (like the "Create shortcut" button on the
action hover card) is fine as an extra convenience, but the canonical path is the
local action. Module-specific `execute` bodies still follow convention #1.

## 4. The smart context menu is a section registry

The right-click menu / `ObjectButton` popover (`SmartContext` in
`providers/smart/extensions/context.tsx`) renders **section descriptors**, not
a hardcoded list. A `SmartContextSection` (`extensions/section.ts`) has `id`
(`"<module>.<name>"`), `priority`, `tier` (`instant` = synchronous, painted in
the open frame; `remote` = mounts one frame later), `Guard`, `applies(props)`,
`useItems(ctx)` → `{ items, status }`, `itemKey`, `searchParts?`, `Row`.

- Each module exports its descriptors from `<module>/smart/sections.tsx`;
  `app/smartcontext.tsx` merges them (like `app/localactions.tsx`).
- `SectionHost` owns the guard, heading, empty rule, error line, stale-row
  narrowing and the status report; a section is just a query + a row.
- Remote `useItems` go through `useSmartDemands` + the `queries.ts` variable
  builders and `useStableData` (keep rows while a search refetch runs). The
  prefetcher (`extensions/prefetch.ts`) uses the same builders, so keep them in
  sync or the warmed cache entry is never hit.
- Callers narrow the menu with `sections={{ only | exclude }}`, never with a
  new `disableX` prop. Per-row Radix roots are out: the "Run on" picker is one
  `RunOnSubmenu` per menu, shortcut keys go through `bindShortcutKey`.
