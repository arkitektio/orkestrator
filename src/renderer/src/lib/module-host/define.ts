import type { ComponentType } from "react";

import type { FileDownloader } from "@/lib/export/fileDownloaders";
import type { DisplayWidgetProps } from "@/lib/display/registry";
import type { Action } from "@/lib/localactions/LocalActionProvider";
import type {
  ActionDecl,
  ModuleManifest,
  SurfaceDecl,
} from "@/lib/module-spec";
import type { ProfileSection } from "@/lib/profile/section";
import type { TaskHook } from "@/lib/taskhooks/types";
import type { SmartContextSection } from "@/providers/smart/extensions/section";

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
  builtins: B;
}): ModuleDefinition<B> => ({
  manifest: describeBuiltins(definition.manifest, definition.builtins),
  builtins: definition.builtins,
});
