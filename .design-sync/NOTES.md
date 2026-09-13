# design-sync notes — orkestrator

This repo is an **Electron app**, not a packaged component library. The synced
"design system" is the shadcn/Radix component layer in `src/renderer/src/components`.
Tailwind v4 (`@tailwindcss/vite`), shadcn style `radix-vega`, OKLCH theme tokens
driven by `--brand-hue` / `--brand-chroma` master controls in `src/renderer/src/index.css`.

## Build model (package shape, synth-entry)

There is no `dist/` component library and `node_modules/orkestrator` does not
exist. The converter runs in **synth-entry-via-`--entry`** mode:

- `.design-sync/entry.tsx` — AUTO-GENERATED synthetic barrel that `export *`s every
  scoped component file. Regenerate it + `componentSrcMap` by editing the `map` in
  `.design-sync/gen-entry.mjs` and running `node .design-sync/gen-entry.mjs`.
  The walk-up from this file's dir finds the repo `package.json`, so `PKG_DIR` = repo root.
- `cfg.componentSrcMap` pins all 75 scoped components to their `src/renderer/src/...` paths.
- `cfg.tsconfig = tsconfig.json` so esbuild resolves the `@/*` → `src/renderer/src/*` alias.
- `cfg.cssEntry = .design-sync/.cache/compiled.css` — the **compiled Tailwind CSS**
  harvested from `out/renderer/assets/index-*.css`. Tailwind v4 utilities + tokens
  only exist after a real build; the converter does NOT run Tailwind.

### Re-sync rebuild steps (do these BEFORE the converter when source/styles changed)

1. `npm run build` (electron-vite build) to regenerate `out/renderer/assets/`.
2. Copy newest `out/renderer/assets/index-*.css` → `.design-sync/.cache/compiled.css`.
3. Copy `out/renderer/assets/*.woff2` → `.design-sync/.cache/` (so the converter's
   `url()` resolution copies Noto Sans into `fonts/`; without this fonts dangle).
4. Then run the converter / driver as usual.

## Scope decisions

- 75 components: 54 shadcn primitives + 7 utilities + 11 non-GraphQL form fields + 3
  layout shells (Actionbar, ContainerGrid, PageLayout) + SidebarLayout.
- **Excluded** (app-coupled, would break the single-IIFE bundle or are not clean components):
  - `DropZone` (dropzone.tsx) — imports `@/providers/smart/dropUtils` → pulls the whole
    Arkitekt provider/app tree (esbuild fails on `@/lib/arkitekt`).
  - `ListPageLayout` — imports `@/command/Menu`, `MultiSidebar`, app sidebars.
  - `list.tsx` / `list-layout.tsx` — namespace modules with generic exports
    (`Root`/`Header`/`Footer`/`Grid`), not clean components.
  - All editor/plate/toolbar components and GraphQL* search fields.
- Renamed card keys to real primary exports: `status`→`StatusPulse`, `sonner`→`Toaster`,
  `resizable`→`ResizablePanelGroup`, `hover-button`→`HoverBorderGradient`,
  `progress-button`→`ProgressButton` (default export, re-exported in entry).

## Preview authoring (user chose ~40 core authored, floor the rest)

- AUTHOR (40): the 16 render-blank/thin components (MUST author — no clean floor)
  + 24 core primitives. Floor (35): fields, layout, niche utilities (all render clean
  floor cards; none are `bad`).

## Known render warns (triaged legitimate — re-syncs should not treat as new)

- `[TOKENS_MISSING]` 16 vars (`--radix-*`, `--cellBackground`, `--border-width`,
  `--size`, `--aspect-ratio`, `--delay`, `--color-from`, …): set at RUNTIME by Radix /
  inline component styles. Expected absent from static stylesheets. Not a defect.
- `[FONT_MISSING]` "Fira Code"/"Fira Mono": the `--font-mono` fallback chain references
  them, but the app itself never ships them either (not in deps) — it falls back to
  Menlo/Consolas/monospace. System mono is **faithful** to the real app. Accepted.

## Re-sync risks

- `compiled.css` + the woff2 in `.design-sync/.cache/` are gitignored build inputs —
  they MUST be regenerated from a fresh `npm run build` (steps above) or fonts/styles
  go stale. The converter cannot produce them.
- The bundle pulls 115 npm packages from source (~2MB IIFE). A new app dependency that
  drags in `electron`/node builtins via a scoped component will break the esbuild bundle —
  check new components' transitive imports before adding them to `componentSrcMap`.
- `.d.ts` props are extracted from source via ts-morph (no shipped types) — contracts
  are best-effort. Add `cfg.dtsPropsFor.<Name>` if a component's props body is wrong.

## Component preview learnings (from the authoring fan-out)

- **Overlays** (Dialog/Sheet/Drawer/Popover/Tooltip/DropdownMenu/Select): author with
  `defaultOpen` on the Root so the portal content renders statically and is captured.
  These carry `cardMode: single` overrides in config. Sheet.tsx is built on the Dialog
  primitive. Tooltip needs a `<TooltipProvider>` wrapper. vaul Drawer also takes `defaultOpen`.
- **ContextMenu is FLOORED** — `ContextMenuPrimitive.Root` (radix) accepts no `defaultOpen`/
  `open`; it only opens on a real right-click pointer event, so it cannot render open in a
  static capture. It ships the clean typographic floor card. Re-author only if Radix adds a
  programmatic-open API.
- **Command** (cmdk) renders inline — no trigger/portal/defaultOpen; set an explicit width.
- **Select**: `defaultOpen defaultValue="…"` opens the listbox with the value pre-checked.
- **Table** carries `cardMode: column` (full-width rows) — don't wrap in a fixed width.
- **Avatar**: external image URLs don't load in headless capture — always include AvatarFallback.
- **Tabs/Accordion/RadioGroup/Select**: set `defaultValue` or content is empty/closed.
- **Separator vertical / Slider / Progress / SidebarLayout / Command**: need an explicit
  width/height on the container (inline style) — they fill/collapse otherwise.
- **StatusPulse**: `color` prop is concatenated into `bg-${color}` (Tailwind palette names like
  `green-500`); only the solid dot shows statically (ping is a `group-hover` animation). The
  needed `bg-*` utilities are present in compiled.css from other app usages — if a future
  StatusPulse uses a NEW palette color not used elsewhere, that utility may be absent.
- **FancyInput / HoverBorderGradient**: their effects are hover/framer-motion only (invisible
  in static capture). FancyInput is `border-none` (near-flat at rest). Graded good as the
  structure is faithful — this is expected, not a defect.
- **InputGroup** alignment uses `align="inline-start|inline-end|block-start|block-end"`.

## Known render warns (triaged legitimate — re-syncs should not treat as new)

- `[RENDER_THIN]` **AspectRatio** and **Spinner** — both floored. AspectRatio is an empty
  ratio box (no content by design); Spinner is a small spinner glyph. Both render correctly;
  thin is expected.
- `[GRID_OVERFLOW]` was resolved by adding `cardMode: column` overrides for Accordion, Empty,
  Item, Pagination, Tabs (plus Table) — full-width rows. Column cards can't re-flag.
- **ProgressButton** / **Menubar** floor cards render sparse (a bare control with no props) —
  acceptable floor; author previews on a later re-sync to enrich.

## Preview scope outcome

- 39 components have authored rich previews (all graded good); 36 ship the clean floor card
  (11 fields, ContextMenu, the rest of the niche utilities + layout). Floor cards are
  upgradable on any future re-sync — authored `.design-sync/previews/*.tsx` carry forward.
