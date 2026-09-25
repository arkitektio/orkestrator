import { AlpakaGuard } from "@/alpaka/api/funcs";
import { MessageSquareMore } from "lucide-react";
import type { SmartContextSection } from "@/core/providers/smart/extensions/section";
import { TalkAboutButton, talkTargets } from "./talk";
import type { TalkTarget } from "./useTalkAbout";

type TalkItem = { key: TalkTarget };
/**
 * One row per target: the room in this tab, beside this page, or in its own
 * window. Built once — `talkTargets` only asks whether the preload bridge is
 * there, which cannot change while the app runs.
 */
const TALK_ITEMS: readonly TalkItem[] = talkTargets().map((key) => ({ key }));

export const ALPAKA_TALK_SECTION: SmartContextSection<TalkItem> = {
  id: "alpaka.talk",
  module: "alpaka",
  title: "Alpaka",
  icon: MessageSquareMore,
  priority: 10,
  tier: "instant",
  Guard: AlpakaGuard,
  applies: (props) => props.objects.length > 0,
  useItems: () => ({ items: TALK_ITEMS, status: "ready" }),
  itemKey: (item) => item.key,
  Row: ({ item, context }) => <TalkAboutButton {...context} target={item.key} />,
};

export const ALPAKA_SECTIONS: SmartContextSection<any>[] = [ALPAKA_TALK_SECTION];
