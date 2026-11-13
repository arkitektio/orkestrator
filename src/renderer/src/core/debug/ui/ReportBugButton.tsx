import { Button } from "@/core/ui/button";
import { useReport } from "@/core/debug/use-report";
import { Flag } from "lucide-react";

/**
 * "Something is wrong with this page" — from inside the debug badge.
 *
 * Opens the report dialog (`core/diagnostics`) through the same `useReport`
 * the page header's menu uses. Lives in the badge's popover rather than on
 * the page: debug mode is when you are looking at what went wrong, so that is
 * where the report belongs. In the browser build too: the report goes to the
 * organization's server, or is downloaded as a file.
 */
export const ReportBugButton = () => {
  const reportBug = useReport();

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
