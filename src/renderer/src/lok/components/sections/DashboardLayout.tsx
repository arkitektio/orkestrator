import { useSelf } from "@/app/hooks/useSelf";
import { SlotSections } from "@/components/layout/PageSections";
import { Separator } from "@/components/ui/separator";
import { Username } from "../Me";
import { RecentAppsSection } from "./RecentAppsSection";

export const DashboardLayout = () => {
  const { userId } = useSelf();
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

      {/* What other modules put on a member's home (kraph: latest mentions,
          top priority), each behind its own guard. */}
      {userId && <SlotSections slot="home" identifier="@lok/user" object={{ id: userId }} />}

      <RecentAppsSection />
    </div>
  );
};
