import { useSessionProgress } from "@/core/connection/progress/hooks";
import { Button } from "@/core/ui/button";
import { ExternalLink, X } from "lucide-react";
import { ConnectionSteps } from "./ConnectionSteps";
import { sessionStepRows } from "./sessionStepsFor";

/**
 * A sign-in as it runs: finding the deployment, registering this computer,
 * approving in the browser (with the way back to it), finishing — and a way
 * out. Shown where the sign-in was started (the welcome screen, the custom
 * endpoint sheet); renders nothing when no sign-in is running.
 */
export const GrantProgress = ({
  onReopen,
  canReopen,
  onCancel,
  className,
}: {
  onReopen?: () => void;
  canReopen?: boolean;
  onCancel?: () => void;
  className?: string;
}) => {
  const session = useSessionProgress();
  if (session?.kind !== "granting") return null;

  const reopen = onReopen && (
    <Button variant="ghost" size="sm" onClick={onReopen} disabled={!canReopen} className="h-6 px-2 text-muted-foreground">
      <ExternalLink className="h-3.5 w-3.5" />
      Open again
    </Button>
  );

  return (
    <div className={className}>
      <ConnectionSteps steps={sessionStepRows({ session, actions: { approve: reopen } })} />
      {onCancel && (
        <Button variant="ghost" size="sm" onClick={onCancel} className="mt-2 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
      )}
    </div>
  );
};

export default GrantProgress;
