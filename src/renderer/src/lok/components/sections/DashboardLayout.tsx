import { Guard } from "@/app/Arkitekt";
import { Separator } from "@/components/ui/separator";
import { LatestMentionsSection } from "@/kraph/components/sections/LatestMentionsSection";
import { Username } from "../Me";
import { RecentAppsSection } from "./RecentAppsSection";

export const DashboardLayout = () => {
  return (
    <div className="space-y-8 p-4">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, <Username />!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s been happening in your Lok workspace
        </p>
      </div>

      <Separator />

      {/* Latest Mentions - Top Priority. Mentions come out of kraph now, so
          the whole block sits out in a deployment without it. */}
      <Guard.Kraph unavailable={<></>}>
        <LatestMentionsSection />
        <Separator />
      </Guard.Kraph>

      <RecentAppsSection />
    </div>
  );
};
