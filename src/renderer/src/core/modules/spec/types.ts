import type { Condition } from "./conditions";

/**
 * Module manifest v1 — the in-repo copy of `arkitekt-module-spec`.
 *
 * One data-only document per service. The host reads it and registers models,
 * actions and surfaces into its own registries; only data crosses the border
 * (no functions, components, clients or class instances). Kept verbatim with
 * the "Orkestrator Module Boundary" doc so it can be extracted into the
 * package; in-repo additions are marked `ADDITION` and are proposals for the
 * spec, not local workarounds.
 */

/** The major version of this spec a manifest is written against. */
export const MANIFEST_SCHEMA = 1;

/** `@<namespace>/<model>` */
export type Identifier = `@${string}/${string}`;

/**
 * The only shared currency: a reference to anything. Identity is
 * `identifier` + `id` alone, compared by value.
 *
 * ADDITION: `descriptors` are what the structure PROVIDES (sent to rekuest as
 * `PortMatchInput.descriptors`, evaluated against a port's `requires`), and
 * `label` is a display hint. Neither takes part in identity.
 */
export type Structure = {
  identifier: string;
  id: string;
  descriptors?: Record<string, unknown>;
  label?: string;
};

export type ModuleManifest = {
  schema: typeof MANIFEST_SCHEMA;
  /** "bankk" -> identifiers "@bankk/*", routes "/bankk/*" */
  namespace: string;
  /** fakts service id / key, e.g. "io.jhnnsrs.bankk" */
  service: string;
  /** the module's own semver */
  version: string;
  label: string;
  /** lucide name or URL relative to the alias */
  icon?: string;
  models?: ModelDecl[];
  actions?: ActionDecl[];
  surfaces?: SurfaceDecl[];
  /** command palette sources */
  search?: SearchDecl[];
  /** JSON Schema; the host renders and stores it */
  settings?: Record<string, unknown>;
  requires?: { capabilities?: string[]; services?: string[] };
};

export type ModelDecl = {
  identifier: Identifier;
  name: string;
  /** gets Knowledge + claims in kraph */
  datum: boolean;
  /** route template relative to the namespace, e.g. "transactions/:id" */
  path: string;
  /** service answers describe(identifier, id) */
  describe?: boolean;
  /** ADDITION: one line about the model, for tooltips and palette rows */
  description?: string;
  /**
   * ADDITION: where the same id lives when a scope is known (kraph draws a
   * claim inside a graph): a template with `:scope` and `:id`. `path` stays
   * the scope-free address every caller can reach.
   */
  scopedPath?: string;
};

export type ActionDecl = {
  id: string;
  title: string;
  icon?: string;
  conditions: Condition[];
  perform: Perform;
};

export type Perform =
  | { kind: "navigate"; to: string }
  | { kind: "surface"; surface: string; as?: "dialog" | "sheet" | "tab" }
  | { kind: "rekuest"; action: string }
  | { kind: "request"; operation: string; confirm?: string }
  /** first-party only, resolved in-app */
  | { kind: "builtin"; handler: string };

/**
 * ADDITION: `section` — a contribution to ANOTHER model's detail page (the
 * Knowledge sidebar on every datum, "agents on this pod" on a kabinet pod).
 * `match.datum` selects every datum, `placement` where the page puts it.
 */
export type SurfaceKind =
  | "page"
  | "display"
  | "panel"
  | "widget"
  | "dialog"
  | "settings"
  | "section";

/**
 * Where a section goes on the page it joins: its "sidebar", its "main"
 * column, its "actions" row, the model's "card" in a list (ADDITION), or the
 * model's "menu" (dropdown items, ADDITION).
 */
export type SectionPlacement = "sidebar" | "main" | "actions" | "card" | "menu";

export type SurfaceRender =
  | { renderer: "builtin"; component: string }
  | { renderer: "blok"; blok: string }
  /** relative to the alias */
  | { renderer: "web"; url: string };

export type SurfaceDecl = {
  id: string;
  kind: SurfaceKind;
  /** for display / widget / section */
  match?: { identifier?: string; port?: string; datum?: boolean };
  /** ADDITION, section only */
  placement?: SectionPlacement;
  /** ADDITION, section / panel: the heading the host draws around it */
  title?: string;
  render: SurfaceRender;
};

/** A named operation that returns `{ label, value }[]` for one identifier. */
export type SearchDecl = { identifier: Identifier; operation: string };
