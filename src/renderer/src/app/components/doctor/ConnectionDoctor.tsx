import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { DoctorContext } from "@/lib/arkitekt/doctor/findings";
import type { HubHealthFacts } from "@/lib/arkitekt/doctor/hubHealth";
import type { ProbeTarget } from "../../../../../main/doctor/protocol";
import { useConnectionDoctor } from "@/lib/arkitekt/doctor/useConnectionDoctor";
import { Stethoscope } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionDoctorPanel } from "./ConnectionDoctorPanel";

/**
 * The doctor, wired to the bridge.
 *
 * Deliberately NOT registered in `app/dialog.tsx`: that provider renders
 * inside `Guard.Rekuest`, and the whole point of the doctor is to work when no
 * service is up — the signed-out screen is exactly where it is needed most.
 * So it carries its own `Sheet`, the way `CustomEndpointSheet` does.
 */

export type ConnectionDoctorProps = {
  context: DoctorContext;
  /** Resolved lazily so a closed sheet costs nothing. */
  buildTargets: () => ProbeTarget[];
  originalError?: string;
  /** The app's own request failed while a direct one might not. */
  rendererReachable?: boolean;
  subject?: string;
  /**
   * Start checking on mount. For surfaces the user reached BY asking to
   * diagnose — there, a second "Run diagnostics" button would just be one
   * more click between them and the answer.
   */
  autoRun?: boolean;
  /** Centre the controls, for a surface that is itself centred. */
  centered?: boolean;
  /** The hub's own report — only where a lok client exists; see `HubAwareConnectionDoctor`. */
  fetchHub?: () => Promise<HubHealthFacts | undefined>;
};

/** The report on its own, for a page that already has a heading. */
export const ConnectionDoctor = ({
  context,
  buildTargets,
  originalError,
  rendererReachable,
  subject,
  autoRun,
  centered,
  fetchHub,
}: ConnectionDoctorProps) => {
  const { run, runRemedy, status, report, error, remedyResult } = useConnectionDoctor();

  const handleRun = useCallback(() => {
    void run({ context, targets: buildTargets(), originalError, rendererReachable, fetchHub });
  }, [run, context, buildTargets, originalError, rendererReachable, fetchHub]);

  // Once, on mount. `handleRun` changes identity whenever a caller rebuilds
  // `buildTargets` inline, and this must not turn into a probe loop.
  const autoRunRef = useRef(false);
  useEffect(() => {
    if (!autoRun || autoRunRef.current) return;
    autoRunRef.current = true;
    handleRun();
  }, [autoRun, handleRun]);

  return (
    <ConnectionDoctorPanel
      report={report}
      status={status}
      error={error}
      remedyResult={remedyResult}
      onRun={handleRun}
      onRemedy={(id) => void runRemedy(id)}
      subject={subject}
      centered={centered}
    />
  );
};

export type ConnectionDoctorSheetProps = ConnectionDoctorProps & {
  label?: string;
  variant?: "outline" | "ghost" | "default" | "secondary";
  size?: "sm" | "default";
};

/** The same report behind a button, for surfaces with no room for it. */
export const ConnectionDoctorSheet = ({
  label = "Diagnose connection",
  variant = "outline",
  size = "sm",
  ...props
}: ConnectionDoctorSheetProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={variant} size={size}>
          <Stethoscope className="mr-2 size-3.5" />
          {label}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Connection doctor</SheetTitle>
          <SheetDescription>
            Checks the addresses this deployment advertises and the network
            software on this computer, and says what it finds. Nothing is
            changed unless you ask for it.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {open && <ConnectionDoctor {...props} />}
        </div>
      </SheetContent>
    </Sheet>
  );
};
