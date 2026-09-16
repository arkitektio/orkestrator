import { KRAPH_ACTIONS } from "@/kraph/actions";
import { ALPAKA_ACTIONS } from "@/lib/alpaka/actions";
import { ELEKTRO_ACTIONS } from "@/lib/elektro/actions";
import { KABINET_ACTIONS } from "@/lib/kabinet/actions";
import {
  Action,
  createLocalActionProvider,
} from "@/lib/localactions/LocalActionProvider";
import { LOK_ACTIONS } from "@/lib/lok/actions";
import { MIKRO_ACTIONS } from "@/lib/mikro/actions";
import { REKUEST_ACTIONS } from "@/lib/rekuest/actions";
import { linkBuilder } from "@/providers/smart/builder";
import { smartRegistry } from "@/providers/smart/registry";
import { ExternalLink, FolderOpen, PanelLeftOpen } from "lucide-react";

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
const OpenInNewTabAction: Action = {
  title: "Open in new tab",
  description: "Pin the structure to the rail and open it",
  icon: PanelLeftOpen,
  conditions: [
    {
      type: "nopartner",
    },
  ],
  execute: async ({ state, navigate, pins }) => {
    if (!pins.canPin) {
      throw new Error("Sign in to an organization to open tabs");
    }

    let last: string | undefined;
    for (const item of state.left) {
      const { identifier, object } = item;
      const path = smartRegistry.buildModelPath(identifier, object.id);
      if (!path) {
        throw new Error(`No path found for identifier ${identifier}`);
      }

      const named = object.label ?? object.name;
      pins.pin({
        kind: "entity",
        identifier,
        id: object.id,
        label:
          typeof named === "string" && named
            ? named
            : `${smartRegistry.getDisplayName(identifier)} ${object.id}`,
      });
      last = path.startsWith("/") ? path : `/${path}`;
    }

    // Every selected structure gets a tab; the last one is the one shown.
    if (last) {
      navigate(last);
    }
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
    popout: PopOutAction,
    newtab: OpenInNewTabAction,
    navigate: NavigateAction,
  } as const);
