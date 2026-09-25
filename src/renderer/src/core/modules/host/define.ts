import type { ComponentType } from "react";

import type { FileDownloader } from "@/core/modules/export/fileDownloaders";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import type { Action } from "@/core/smart/localactions/LocalActionProvider";
import type {
  ActionDecl,
  ModuleManifest,
  SectionPlacement,
  SurfaceDecl,
} from "@/core/modules/spec";
import type { OperationHandler } from "./operations";
import type { OptionSource } from "./options";
import type { ProfileSection } from "@/core/connection/profile/section";
import type { TaskHook } from "@/core/modules/taskhooks/types";
import type { SmartContextSection, SmartMenuWrapperProps } from "@/core/smart/extensions/section";
import type { PassDownProps } from "@/core/smart/extensions/types";
import type { Object } from "@/core/types";

/** A page of the module, for the ⌘K palette's navigation rows. */
export type NavLinkDecl = {
  label: string;
  route: string;
  /** Extra words that should find the page but need not be shown. */
  keywords?: string[];
};

/**
 * A trailing action on every entity hit in the ⌘K palette (alpaka's "Talk").
 * `requested` is a counter the row bumps on ⌥⏎, the keyboard's way to the
 * action (the row itself has focus); act once per bump, never on mount.
 */
export type PaletteHitActionProps = {
  identifier: string;
  id: string;
  label: string;
  /** What was typed in the palette. */
  prompt?: string;
  requested: number;
  onDone?: () => void;
};

/**
 * A contribution to ANOTHER model's page (spec: a `section` surface).
 * `slot` names one of the host-drawn sidebars every datum page has; without
 * one, `placement` says where the page puts it.
 */
export type PageSection = {
  /** `"<namespace>.<name>"` */
  id: string;
  /** The tab label / heading the host draws. */
  title: string;
  placement: SectionPlacement;
  /**
   * Host-owned places: the "knowledge" (claims, comments) and "chat"
   * (conversations) sidebars of every page, a member's "home" dashboard and
   * the "notifications" widget (both matched on `@lok/user`, the member).
   */
  slot?: "knowledge" | "chat" | "home" | "notifications";
  /** Which pages: by identifier(s), and/or every datum. Empty = every model page. */
  match: { identifiers?: readonly string[]; datum?: boolean };
  /** `onChanged`: the section changed the object; the page should refetch. */
  Component: ComponentType<{ identifier: string; object: Object; onChanged?: () => unknown }>;
};

/**
 * The code half of a first-party module: everything its manifest refers to
 * by id, resolved in-app (module spec: `renderer: "builtin"`,
 * `perform: { kind: "builtin" }`).
 *
 * Keys the manifest can already describe (page, displays, dialogs, actions)
 * are turned into manifest entries by `defineModule`. The rest are marked
 * `EXTENSION`: first-party only today, each one a gap the spec has to close
 * before a remote module could do the same.
 */
export type ModuleBuiltins = {
  /** The module's routes, mounted under `/<namespace>/*`. */
  page: () => Promise<{ default: ComponentType }>;
  /** EXTENSION: its pages, for the palette (spec: could come from `surfaces` of kind page). */
  navLinks?: readonly NavLinkDecl[];
  /** EXTENSION: its section of the rail. */
  nav?: () => Promise<{ NavigationPane: ComponentType<Record<string, never>> }>;
  /** `display` surfaces, by the identifier they render. */
  displays?: Record<string, ComponentType<DisplayWidgetProps>>;
  /** EXTENSION: hover cards, by identifier (the spec renders hovers from `describe`). */
  hovers?: Record<string, ComponentType<{ object: any }>>;
  /** `dialog` surfaces, by dialog id. */
  dialogs?: Record<string, ComponentType<any>>;
  /** Local actions, by id; become `perform: { kind: "builtin" }` actions. */
  actions?: Record<string, Action<any>>;
  /** `section` surfaces: what this module adds to other models' pages. */
  pageSections?: readonly PageSection[];
  /** EXTENSION: wrappers around the smart menu and palette (rekuest's "Run on"). */
  menuWrappers?: readonly ComponentType<SmartMenuWrapperProps>[];
  /** EXTENSION: whole rows in the ⌘K palette for its query and context (alpaka's "Ask"). */
  paletteSources?: readonly ComponentType<PassDownProps>[];
  /** EXTENSION: a trailing action on every entity hit in the palette. */
  paletteHitActions?: readonly ComponentType<PaletteHitActionProps>[];
  /** EXTENSION: islands in the rail (live status), each behind the module's guard. */
  railIslands?: readonly ComponentType[];
  /** Named requests on its own service, by `"<namespace>.<name>"` (spec: `request`). */
  operations?: Record<string, OperationHandler>;
  /** EXTENSION: its models as options for pickers in other modules' UI. */
  optionSources?: readonly OptionSource[];
  /** EXTENSION: sections of the smart context menu. */
  sections?: readonly SmartContextSection<any>[];
  /** EXTENSION: sections of a member's profile page. */
  profileSections?: readonly ProfileSection[];
  /** EXTENSION: always-mounted components, inside the module's guard (updaters, widget registrars). */
  background?: readonly ComponentType[];
  /** EXTENSION: the palette's entity search (spec: `search`, by operation). */
  search?: ComponentType<{ term: string; onDone?: () => void }>;
  /** EXTENSION: what runs when a task with one of these hooks finishes. */
  taskHooks?: readonly TaskHook[];
  /** EXTENSION: how its file models reach the disk, by identifier. */
  fileDownloaders?: Record<string, FileDownloader>;
};

export type ModuleDefinition<B extends ModuleBuiltins = ModuleBuiltins> = {
  manifest: ModuleManifest;
  /**
   * How the host reaches the module's service: its fakts requirement key
   * (`"omero_ark"`), or `"self"` for the session's own service (lok). The
   * host guards the module's builtins on it.
   */
  serviceKey: string;
  builtins: B;
};

const actionDecl = (id: string, action: Action<any>): ActionDecl => ({
  id,
  title: action.title,
  ...(action.icon?.displayName ? { icon: action.icon.displayName } : {}),
  conditions: [...action.conditions],
  perform: { kind: "builtin", handler: id },
});

/**
 * What the builtins contribute that the manifest can express, as manifest
 * entries. Makes a first-party module's manifest look like a remote one's —
 * the host reads the same shape either way.
 */
export const describeBuiltins = (manifest: ModuleManifest, builtins: ModuleBuiltins): ModuleManifest => {
  const own = (id: string) => `${manifest.namespace}.${id}`;
  const surfaces: SurfaceDecl[] = [
    { id: "page", kind: "page", render: { renderer: "builtin", component: own("page") } },
    ...Object.keys(builtins.displays ?? {}).map(
      (identifier): SurfaceDecl => ({
        id: `display:${identifier}`,
        kind: "display",
        match: { identifier },
        render: { renderer: "builtin", component: own(`display:${identifier}`) },
      }),
    ),
    ...(builtins.pageSections ?? []).flatMap((section): SurfaceDecl[] => {
      const identifiers: (string | undefined)[] = section.match.identifiers?.length
        ? [...section.match.identifiers]
        : [undefined];
      return identifiers.map(
        (identifier): SurfaceDecl => ({
          id: identifiers.length > 1 ? `section:${section.id}:${identifier}` : `section:${section.id}`,
          kind: "section",
          match: { ...(identifier ? { identifier } : {}), ...(section.match.datum ? { datum: true } : {}) },
          placement: section.placement,
          title: section.title,
          render: { renderer: "builtin", component: own(`section:${section.id}`) },
        }),
      );
    }),
    ...Object.keys(builtins.dialogs ?? {}).map(
      (id): SurfaceDecl => ({
        id: `dialog:${id}`,
        kind: "dialog",
        render: { renderer: "builtin", component: own(`dialog:${id}`) },
      }),
    ),
  ];
  return {
    ...manifest,
    actions: [
      ...(manifest.actions ?? []),
      ...Object.entries(builtins.actions ?? {}).map(([id, action]) => actionDecl(id, action)),
    ],
    surfaces: [...(manifest.surfaces ?? []), ...surfaces],
  };
};

/**
 * A first-party module: its manifest (data) and the builtins it refers to.
 * `const` keeps each builtin map's exact keys and component types, so the
 * host's merged registries stay typed (dialog props per id, ...).
 */
export const defineModule = <const B extends ModuleBuiltins>(definition: {
  manifest: ModuleManifest;
  serviceKey: string;
  builtins: B;
}): ModuleDefinition<B> => ({
  manifest: describeBuiltins(definition.manifest, definition.builtins),
  serviceKey: definition.serviceKey,
  builtins: definition.builtins,
});
