import { Button } from "@/components/ui/button";
import { useReport } from "@/hooks/use-report";
import { isElectron } from "@/lib/platform";
import { Flag } from "lucide-react";

/**
 * "Something is wrong with this page" — from inside the debug badge.
 *
 * Files an issue for the current path with a screenshot attached, through the
 * same `useReport` the page header's menu uses. Lives in the badge's popover
 * rather than on the page: debug mode is when you are looking at what went
 * wrong, so that is where the report belongs. Desktop only — the report goes
 * through the Electron bridge, and the web build has none.
 */
export const ReportBugButton = () => {
  const reportBug = useReport();
  if (!isElectron()) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 px-2 text-xs"
      aria-label="Report a bug on this page"
      onClick={reportBug}
    >
      <Flag className="mr-1 h-3 w-3" />
      Report bug
    </Button>
  );
};

export default ReportBugButton;
