import {
  Action,
  ActionParams,
  createLocalActionProvider,
} from "@/core/lib/localactions/LocalActionProvider";
import { derivedRecord } from "@/core/lib/module-host/lazy";
import { linkBuilder } from "@/core/providers/smart/builder";
import { provideSmartRegistries } from "@/core/providers/smart/hostRegistries";
import { MODULE_ACTIONS } from "../../modules/registries";
import { smartRegistry } from "@/core/providers/smart/registry";
import { structureTabTarget } from "@/core/providers/smart/tabTargets";
import { requestExport } from "@/core/lib/export/exportRequests";
import { Columns2, Download, ExternalLink, FolderOpen, Link2, Link2Off, PanelLeftOpen } from "lucide-react";
import { toast } from "sonner";
import {
  getActiveProfile,
  loadStoredProfileBook,
} from "@/core/lib/arkitekt/fakts/profileStorageSchema";
import type { ShareScope } from "@/core/lib/shareScope";
import { copyText, privateLinkFor, scopedLinkFor, universalLinkFor } from "@/core/lib/universalLink";

const NavigateAction: Action = {
  title: "Open",
  description: "Open the structure",
  icon: FolderOpen,
  pinned: true,
  conditions: [
    {
      type: "nopartner",
    },
  ],
  execute: async ({ state, navigate }) => {
    const { identifier, id } = state.left[0];
    if (!identifier) {
      throw new Error("No identifier provided for Open action");
    }

    const path = smartRegistry.findModel(identifier)?.path;
    if (!path) {
      throw new Error(`No path found for identifier ${identifier}`);
    }
    navigate(linkBuilder(path)(id));
  },
  collections: ["smart"],
};
/** Where each selected structure's page is, and what to call its tab. */
const tabTargets = (state: ActionParams["state"]) =>
  state.left.map((structure) => {
    const target = structureTabTarget(structure);
    if (!target) {
      throw new Error(`No path found for identifier ${structure.identifier}`);
    }
    return target;
  });

const OpenInNewTabAction: Action = {
  title: "Open in new tab",
  description: "Open the structure in a tab of its own",
  icon: PanelLeftOpen,
  conditions: [
    {
      type: "nopartner",
    },
  ],
  execute: async ({ state, tabs }) => {
    const targets = tabTargets(state);

    // Every selected structure gets a tab; the last one is the one shown.
    // `evict`: this was asked for by name, so at the cap it takes the place of
    // the stalest unpinned tab rather than silently doing nothing.
    targets.forEach(({ to, label }, index) =>
      tabs.open(to, { label, evict: true, background: index < targets.length - 1 }),
    );
  },
  collections: ["smart"],
};

const OpenToTheSideAction: Action = {
  title: "Open to the side",
  description: "Show the structure beside this page, in a split view",
  icon: Columns2,
  conditions: [
    {
      type: "nopartner",
    },
  ],
  execute: async ({ state, tabs }) => {
    // One pane beside this one, so one structure: the first selected. Each
    // further one would only replace the last in that pane.
    const [target] = tabTargets(state);
    if (target) tabs.openBeside(target.to, { label: target.label, evict: true });
  },
  collections: ["smart"],
};

/**
 * Bring a datum to disk. A file downloads straight away; anything else opens
 * the export dialog to pick an exporter (`rekuest/dialogs/ExportToFileDialog.tsx`).
 * The same as dragging the card out onto the desktop.
 */
const ExportToFileAction: Action = {
  title: "Export to file",
  description: "Download it, or run an exporter that turns it into a file",
  icon: Download,
  conditions: [{ type: "nopartner" }, { type: "datum" }],
  execute: async ({ state }) => {
    requestExport(state.left);
  },
  collections: ["io"],
};

const PopOutAction: Action = {
  title: "Open in new window",
  description: "Open the structure in a new window",
  icon: ExternalLink,
  pinned: true,
  conditions: [
    {
      type: "nopartner",
    },
  ],
  execute: async ({ state }) => {
    for (const item of state.left) {
      const { identifier, id } = item;
      if (!identifier) {
        throw new Error("No identifier provided for Open action");
      }

      const path = smartRegistry.findModel(identifier)?.path;
      if (!path) {
        throw new Error(`No path found for identifier ${identifier}`);
      }
      window.api.openSecondWindow(linkBuilder(path)(id));
    }
  },
  collections: ["smart"],
};

/**
 * The scope to stamp a copied link with, read outside React.
 *
 * An action's `execute` is not a component, so the profile book is read through
 * its own pure loader rather than a hook. Null when nothing is connected, in
 * which case there is no scope to promise and the link stays portable.
 */
const activeShareScope = (): ShareScope | null => {
  const profile = getActiveProfile(loadStoredProfileBook());
  if (!profile) return null;
  return {
    baseUrl: profile.identity.baseUrl,
    org: profile.identity.organizationId,
    hub: profile.identity.hubId ?? null,
  };
};

/** The page a structure lives on, as a router location. */
const structureLocation = (state: ActionParams["state"]) => {
  const { identifier, id } = state.left[0];
  const path = smartRegistry.buildModelPath(identifier, id);
  if (!path) {
    throw new Error(`No path found for identifier ${identifier}`);
  }
  return { pathname: path.startsWith("/") ? path : `/${path}` };
};

const putOnClipboard = async (text: string, message: string) => {
  if (await copyText(text)) {
    toast.success(message, { description: text });
  } else {
    toast.error("Could not copy the link");
  }
};

const CopyLinkAction: Action = {
  title: "Copy link",
  description: "Copy a link to this object that opens it in Arkitekt",
  icon: Link2,
  conditions: [
    {
      type: "nopartner",
    },
  ],
  execute: async ({ state }) => {
    const location = structureLocation(state);
    const scope = activeShareScope();
    await putOnClipboard(
      scope ? scopedLinkFor(location, scope) : universalLinkFor(location),
      "Link copied",
    );
  },
  collections: ["smart"],
};

const CopyPrivateLinkAction: Action = {
  title: "Copy private link",
  description:
    "Copy a link that names neither the server nor the organization, for pasting in public",
  icon: Link2Off,
  conditions: [
    {
      type: "nopartner",
    },
  ],
  execute: async ({ state }) => {
    const scope = activeShareScope();
    if (!scope) {
      toast.error("Connect to a workspace before copying a private link");
      return;
    }
    await putOnClipboard(
      await privateLinkFor(structureLocation(state), scope),
      "Private link copied",
    );
  },
  collections: ["smart"],
};

/** Actions the host owns: they apply to any structure, whichever module it is from. */
const HOST_ACTIONS = {
  copylink: CopyLinkAction,
  copyprivatelink: CopyPrivateLinkAction,
  popout: PopOutAction,
  newtab: OpenInNewTabAction,
  opentotheside: OpenToTheSideAction,
  exporttofile: ExportToFileAction,
  navigate: NavigateAction,
} as const;

export const {
  LocalActionProvider,
  useAction,
  useLocalActionEntries,
  useMatchingActions,
  useMatchingActionEntries,
  usePinnedActionIds,
  usePinnedMatchingActionEntries,
  useSetPinnedActionIds,
  useTogglePinnedAction,
  useUnpinnedMatchingActionEntries,
  registry,
} =
  // Every module's `actions` builtin, then the host's own. Lazy, so importing
  // this for a hook never evaluates a module's builtins (app/modules/registries).
  createLocalActionProvider(
    derivedRecord(() => ({ ...MODULE_ACTIONS, ...HOST_ACTIONS })) as Record<string, Action<any>> & typeof HOST_ACTIONS,
  );

// Drop handling in `providers/smart` reads the actions through this.
provideSmartRegistries({ actions: registry });
