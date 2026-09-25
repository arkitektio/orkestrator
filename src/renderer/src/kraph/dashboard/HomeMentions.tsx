import { Separator } from "@/core/components/ui/separator";
import { LatestMentionsSection } from "../components/sections/LatestMentionsSection";

/** The member's latest mentions on their home dashboard (kraph's `home` slot section). */
export const HomeMentions = () => (
  <>
    <LatestMentionsSection />
    <Separator />
  </>
);
