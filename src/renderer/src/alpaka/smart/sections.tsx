import { Guard } from "@/app/Arkitekt";
import { MessageSquareMore } from "lucide-react";
import type { SmartContextSection } from "@/providers/smart/extensions/section";
import { SectionHost } from "@/providers/smart/extensions/SectionHost";
import type { PassDownProps } from "@/providers/smart/extensions/types";
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
  Guard: Guard.Alpaka,
  applies: (props) => props.objects.length > 0,
  useItems: () => ({ items: TALK_ITEMS, status: "ready" }),
  itemKey: (item) => item.key,
  Row: ({ item, context }) => <TalkAboutButton {...context} target={item.key} />,
};

export const ALPAKA_SECTIONS: SmartContextSection<any>[] = [ALPAKA_TALK_SECTION];

export const ApplicableTalk = (props: PassDownProps) => (
  <SectionHost section={ALPAKA_TALK_SECTION} context={props} />
);
