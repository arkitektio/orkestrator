import { Guard } from "@/app/Arkitekt";
import { MessageSquareMore } from "lucide-react";
import type { SmartContextSection } from "../section";
import { SectionHost } from "../SectionHost";
import type { PassDownProps } from "../types";
import { TalkAboutButton } from "./talk";

type TalkItem = { key: "talk" };
const TALK_ITEMS: readonly TalkItem[] = [{ key: "talk" }];

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
  Row: ({ context }) => <TalkAboutButton {...context} />,
};

export const ALPAKA_SECTIONS: SmartContextSection<any>[] = [ALPAKA_TALK_SECTION];

export const ApplicableTalk = (props: PassDownProps) => (
  <SectionHost section={ALPAKA_TALK_SECTION} context={props} />
);
