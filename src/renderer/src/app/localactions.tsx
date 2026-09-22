import { KRAPH_ACTIONS } from "@/kraph/actions";
import { ALPAKA_ACTIONS } from "@/lib/alpaka/actions";
import { ELEKTRO_ACTIONS } from "@/lib/elektro/actions";
import { KABINET_ACTIONS } from "@/lib/kabinet/actions";
import {
  Action,
  ActionParams,
  createLocalActionProvider,
} from "@/lib/localactions/LocalActionProvider";
import { LOK_ACTIONS } from "@/lib/lok/actions";
import { MIKRO_ACTIONS } from "@/lib/mikro/actions";
import { REKUEST_ACTIONS } from "@/lib/rekuest/actions";
import { linkBuilder } from "@/providers/smart/builder";
import { smartRegistry } from "@/providers/smart/registry";
import { Columns2, ExternalLink, FolderOpen, Link2, Link2Off, PanelLeftOpen } from "lucide-react";
import { toast } from "sonner";
import {
  getActiveProfile,
  loadStoredProfileBook,
} from "@/lib/arkitekt/fakts/profileStorageSchema";
import type { ShareScope } from "@/lib/shareScope";
import { copyText, privateLinkFor, scopedLinkFor, universalLinkFor } from "@/lib/universalLink";

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
    const identifier = state.left[0].identifier;
    const object = state.left[0].object;
    if (!identifier) {
      throw new Error("No identifier provided for Open action");
    }

    const path = smartRegistry.findModel(identifier)?.path;
    if (!path) {
      throw new Error(`No path found for identifier ${identifier}`);
    }
    navigate(linkBuilder(path)(object.id));
  },
  collections: ["smart"],
};
/** Where each selected structure's page is, and what to call its tab. */
const tabTargets = (state: ActionParams["state"]) =>
  state.left.map(({ identifier, object }) => {
    const path = smartRegistry.buildModelPath(identifier, object.id);
    if (!path) {
      throw new Error(`No path found for identifier ${identifier}`);
    }

    const named = object.label ?? object.name;
    return {
      to: path.startsWith("/") ? path : `/${path}`,
      label:
        typeof named === "string" && named
          ? named
          : `${smartRegistry.getDisplayName(identifier)} ${object.id}`,
    };
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
      const identifier = item.identifier;
      const object = item.object;
      if (!identifier) {
        throw new Error("No identifier provided for Open action");
      }

      const path = smartRegistry.findModel(identifier)?.path;
      if (!path) {
        throw new Error(`No path found for identifier ${identifier}`);
      }
      window.api.openSecondWindow(linkBuilder(path)(object.id));
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
  const { identifier, object } = state.left[0];
  const path = smartRegistry.buildModelPath(identifier, object.id);
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
  createLocalActionProvider({
    ...MIKRO_ACTIONS,
    ...KRAPH_ACTIONS,
    ...LOK_ACTIONS,
    ...KABINET_ACTIONS,
    ...REKUEST_ACTIONS,
    ...ELEKTRO_ACTIONS,
    ...ALPAKA_ACTIONS,
    copylink: CopyLinkAction,
    copyprivatelink: CopyPrivateLinkAction,
    popout: PopOutAction,
    newtab: OpenInNewTabAction,
    opentotheside: OpenToTheSideAction,
    navigate: NavigateAction,
  } as const);
