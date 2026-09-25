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
- Builtins the host mounts for a module (displays, hover cards, palette
  search, background components) are wrapped in that module's guard by the
  host (`moduleGuard` in `app/modules/registries.tsx`); a module does not
  guard its own builtins.
- `providers/smart/extensions/SectionHost.tsx` wraps each menu section's query
  in the section's `Guard` (declared on its descriptor, see §4).
- The dialog provider wraps every dialog in `<Guard.Rekuest>`.

## 2. The dialog system

Dialogs are a central **id registry**, not ad-hoc `<Dialog>` instances.

- **Factory:** `createDialogProvider(registry)` in
  `src/renderer/src/lib/generic/providers/DialogProvider.tsx` → returns
  `{ DialogProvider, useDialog, registry }`.
- **Registry:** `src/renderer/src/app/dialog.tsx` merges the host's own dialogs
  with every module's `<module>/dialogRegistry.ts` (a map of string id →
  component, e.g. `createentity: CreateEntityForm`), passed in as the
  module's `dialogs` builtin. It is type-safe: `openDialog`'s props are
  inferred per id from the component (`app/modules/dialogTypes.ts`).
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
add it to its module's `<module>/dialogRegistry.ts`, then open it by id from
anywhere with `useDialog()`. Host-owned dialogs go in `app/dialog.tsx`.

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
- **Registration:** each module's action map (`<module>/actions.ts`,
  e.g. `MIKRO_ACTIONS`) is its `actions` builtin in `<module>/module.tsx`;
  `app/localactions.tsx` merges every module's with the host's own via
  `createLocalActionProvider(...)`. Example: `kraph/actions.tsx`
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

- Each module exports its descriptors from `<module>/smart/sections.tsx` and
  passes them as its `sections` builtin; `app/smartcontext.tsx` merges them
  with the host's local-actions section.
- `SectionHost` owns the guard, heading, empty rule, error line, stale-row
  narrowing and the status report; a section is just a query + a row.
- Remote `useItems` go through the module's own demand/variable builders
  (rekuest: `rekuest/smart/demands.ts` + `queries.ts`) and `useStableData`
  (keep rows while a search refetch runs). A section warms its cache by
  declaring `prefetch(target)` → `{ service, name, query, variables }[]`,
  built with the SAME builders, or the warmed entry is never hit; the host
  prefetcher (`extensions/prefetch.ts`) owns TTL, dedupe and the client.
- Callers narrow the menu with `sections={{ only | exclude | palette }}`,
  never with a new `disableX` prop. A section opts into the ⌘K palette with
  `palette: true` (the palette renders them through `PaletteSections`).
- Per-row Radix roots are out: machinery that must wrap the whole menu
  (rekuest's single "Run on" picker, outside `<Command>`) is a module
  `menuWrappers` builtin, rendered by `SmartMenuWrappers`. Shortcut keys go
  through `bindShortcutKey`. `providers/smart` and `command/Menu` import no
  module code.

## 5. Module boundaries

Every module (a backend service: mikro, kraph, rekuest, …) is one folder
named after its identifier namespace (`@kraph/*` lives in `kraph/`, routes
under `/kraph`). Its public face is four files; the host imports nothing
else from it:

- `manifest.ts` — **data only** (module spec v1, `lib/module-spec`):
  namespace, fakts service, label, and its models (identifier, name, route,
  datum). The single source for a model's route and name.
- `linkers.tsx` — its smart objects, built from the manifest's models
  (`smartOf(manifest, "@kraph/graph")`). The root `@/linkers` is a barrel.
- `service.ts` — its client binding (fakts requirement key + Apollo builder).
- `module.tsx` — its **builtins**: `defineModule({ manifest, builtins })`
  with `page`, `nav`, `displays`, `hovers`, `dialogs`, `actions`, `sections`,
  `profileSections`, `background`, `search`, `taskHooks`, `fileDownloaders`.

The host derives every registry from these (`app/modules/`): `index.ts`
(manifests + services, data only — `app/Arkitekt` reads it), `install.tsx`
(registers every first-party `module.tsx` with the module host, imported once
by `AppProvider`), and `registries.tsx` (a leaf: derives each registry from
the module host, `lib/module-host/host.ts`). Rules:

- **Modules register.** `registerModule(definition)` validates the manifest,
  refuses a taken namespace or a builtin id another module claims, and
  returns `unregister`. First-party modules go through `registerModules`,
  which throws on refusal. A module can arrive or leave at runtime.
- **Registries are derived, never built at import.** A file a module
  component imports for a hook (`app/dialog`, `app/localactions`, …) must
  never import module code or read a registry while being evaluated. Use
  `derived` / `derivedRecord` (`lib/module-host/lazy.ts`): built on use,
  rebuilt when the host's version moves. A component that LISTS modules
  (routes, palette, page sections) calls `useModuleHostVersion()` so it
  re-renders when one arrives. `app/modules/modules.test.tsx` checks every
  entry order.
- **Only Structures cross.** `Structure = { identifier, id, descriptors?,
  label? }`, compared by value (`lib/structure.ts`). A module never imports
  another module's components or GraphQL; `app/moduleBoundaries.test.ts`
  fails on any edge not in `moduleBoundaries.allowlist.ts`, and that list only
  shrinks. Cross-module UI goes through host slots:
  - **Displays:** `<StructureDisplay identifier="@lok/user" id={sub}
    variant="inline" | "avatar" | "chip" | "card" />` renders another
    module's object; the owner registers it in `displays`.
  - **Page sections:** a module adds to another model's page with a
    `pageSections` builtin (`placement: sidebar | main | actions`, matched by
    identifier or `datum`). The page names the place with
    `<PageSections placement=… identifier object />`; the host-drawn Knowledge
    and Chat sidebars are the `knowledge` / `chat` slots (`<SlotSections>`).
    A page passes only what the section needs (`{ id, clientId }`), not its
    whole fragment.
  - **The signed-in user** is the host's: `useSelf()` (`app/hooks/useSelf`),
    never a lok `me` query.
- `providers/smart` is host library: it reads app registries through
  `providers/smart/hostRegistries.ts`, never by importing `app/*`.
