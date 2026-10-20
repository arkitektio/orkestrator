import { endpointToProbeTargets } from "@/core/connection/arkitekt/doctor/targets";
import { useMeshProgress, useSessionProgress } from "@/core/connection/progress/hooks";
import { ConnectionDoctorSheet } from "@/core/connection/ui/doctor/ConnectionDoctor";
import { ConnectionSteps } from "@/core/connection/ui/progress/ConnectionSteps";
import { sessionStepRows } from "@/core/connection/ui/progress/sessionStepsFor";
import { cn } from "@/core/util/utils";
import { useEffect, useState } from "react";

/** A launch faster than this shows only the backdrop: no list flashes by. */
export const CONNECTING_REVEAL_MS = 600;
/** After this long the page says so, and offers the doctor. */
export const CONNECTING_SLOW_MS = 10_000;

const useAfter = (ms: number): boolean => {
  const [passed, setPassed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPassed(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return passed;
};

/**
 * The page area while a profile is being brought up (launch, switch, right
 * after sign-in). The backdrop paints at once — the window's chrome is
 * already there, and most launches are done before anything else would be
 * worth reading. Only when it takes a moment does the checklist fade in:
 * signing in, then opening, and the mesh when it is being started for this
 * session. After a while it says it is taking longer than usual, with the
 * doctor one click away.
 */
export const ConnectingPage = () => {
  const session = useSessionProgress();
  const mesh = useMeshProgress();
  const revealed = useAfter(CONNECTING_REVEAL_MS);
  const slow = useAfter(CONNECTING_SLOW_MS);
  const baseUrl = session?.endpointUrl;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="connecting-page"
      className="h-full w-full bg-radial-[at_100%_100%] from-background to-backgroundpaired"
    >
      {!revealed || !session ? (
        <span className="sr-only">Signing in…</span>
      ) : (
        <div className={cn("flex flex-col gap-4 p-8 animate-in fade-in duration-300")}>
          <ConnectionSteps steps={sessionStepRows({ session, mesh })} className="max-w-xl" />
          {slow && (
            <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
              <p>This is taking longer than usual.</p>
              {baseUrl && (
                <ConnectionDoctorSheet
                  context={{ kind: "discovery", endpointUrl: baseUrl }}
                  buildTargets={() => endpointToProbeTargets(baseUrl)}
                  autoRun
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectingPage;
