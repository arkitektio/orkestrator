import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useReport } from "@/hooks/use-report";
import { isElectron } from "@/lib/platform";
import { Flag } from "lucide-react";

/**
 * "Something is wrong with this page" — one click, from the page's corner.
 *
 * Files an issue for the current path with a screenshot attached, through the
 * same `useReport` the page header's menu uses. Desktop only: the report goes
 * through the Electron bridge, and the web build has none.
 */
export const ReportBugButton = () => {
  const reportBug = useReport();
  if (!isElectron()) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Report a bug on this page"
          onClick={reportBug}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">Report a bug on this page</TooltipContent>
    </Tooltip>
  );
};

export default ReportBugButton;
