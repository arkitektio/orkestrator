import { useKraph } from "@/app/Arkitekt";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  executeSameness,
  explainSameness,
  planSameness,
  type SamenessPlan,
} from "@/kraph/lib/sameness";
import { useDragSession, useDropTarget } from "@/lib/dnd/react";
import { cn } from "@/lib/utils";
import { acceptsSmartDrag, resolveSmartDrop } from "@/providers/smart/dragPayload";
import type { Structure } from "@/types";
import { useState } from "react";
import { toast } from "sonner";

export type SameAsDropTargetProps = {
  /** The datum this card belongs to. */
  self: Structure;
  /** The word this card is about: the drop is scoped to it, so never ambiguous. */
  term: string;
  onDone?: () => void;
};

/**
 * "Drop another <term> here." The per-label way to claim sameness: because the
 * word is fixed by the card, a datum carrying several labels is no longer
 * ambiguous. The decision of what to write is `planSameness`, shared with the
 * "Same thing as…" local action; this only adds the drop and the confirmation.
 */
export const SameAsDropTarget = ({ self, term, onDone }: SameAsDropTargetProps) => {
  const client = useKraph();
  const [proposal, setProposal] = useState<{
    plan: SamenessPlan;
    partner: Structure;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const propose = async (partner: Structure) => {
    setBusy(true);
    try {
      const plan = await planSameness({ client, left: self, right: partner, term });
      const explanation = explainSameness(plan);
      if (explanation) {
        toast.error(explanation);
        return;
      }
      if (plan.kind === "already-same") {
        toast.info(`Already the same ${term}`);
        return;
      }
      setProposal({ plan, partner });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!proposal) return;
    setBusy(true);
    try {
      await executeSameness(client, proposal.plan);
      toast.success(`Claimed the same ${term}`);
      onDone?.();
    } catch (e) {
      toast.error(`Could not claim: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setProposal(null);
    }
  };

  // The innermost target takes the drop, so the panel-wide zone around this
  // card does not also open its partner panel.
  const { ref, isOver } = useDropTarget({
    accepts: acceptsSmartDrag,
    onDrop: (payload) => {
      const partner = resolveSmartDrop(payload)?.partners[0];
      if (!partner) {
        toast.error("Drop a datum here");
        return;
      }
      void propose(partner);
    },
  });
  const session = useDragSession();
  const canDrop = session !== null && acceptsSmartDrag(session);

  return (
    <>
      <div
        ref={ref}
        className={cn(
          "rounded-md border border-dashed px-3 py-2 text-center text-xs text-muted-foreground transition-colors",
          canDrop && "border-primary/60",
          isOver && "bg-accent text-foreground",
          busy && "opacity-60",
        )}
        data-testid="same-as-drop"
      >
        {busy ? "Checking…" : `Drop another ${term} here to say it is the same one`}
      </div>

      <AlertDialog
        open={!!proposal}
        onOpenChange={(open) => {
          if (!open) setProposal(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Same {term}?</AlertDialogTitle>
            <AlertDialogDescription>
              {proposal?.plan.kind === "claim-with-same-as"
                ? `The dropped datum is not labelled ${term} yet. It will be claimed as ${term} and as the same one as this, in a single assertion.`
                : `Both datums will be recorded as evidence for one ${term}.`}{" "}
              This is a claim in the log and can be retracted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={commit} disabled={busy}>
              Claim same
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SameAsDropTarget;
