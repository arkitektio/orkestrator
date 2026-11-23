import { useState } from "react";

import { CollaborationPicker, useResolveCollaboration } from "@/core/collaborations/CollaborationPicker";
import { ShareReport } from "@/core/collaborations/ShareReport";
import { shareTotals, type ServiceShare } from "@/core/collaborations/shareWorkflow";
import { useShareWorkflow } from "@/core/collaborations/useShareWorkflow";
import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { Button } from "@/core/ui/button";
import { DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import Timestamp from "@/core/ui/timestamp";
import { useShareWorkflowTaskQuery } from "../api/graphql";

/** `task`: any task of the workflow; what is shared is everything made under its root. */
export type ShareWorkflowDialogProps = { task: string };

type Picked = { key: string; name: string };

type Step =
  | { kind: "pick" }
  | { kind: "review"; collaboration: Picked; shares: ServiceShare[] }
  | { kind: "done"; collaboration: Picked; shares: ServiceShare[] };

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** One line over the combined report: what was (or will be) put in, and what was left out. */
const Summary = ({ shares, dryRun }: { shares: ServiceShare[]; dryRun: boolean }) => {
  const totals = shareTotals(shares);
  const parts = [
    `${dryRun ? "Will put in" : "Put in"} ${plural(totals.added, "object")}`,
    ...(totals.covered ? [`${totals.covered} along with them`] : []),
    ...(totals.skipped ? [`${totals.skipped} left out`] : []),
    ...(totals.failed ? [`${plural(totals.failed, "service")} failed`] : []),
  ];
  return <div className="text-sm">{parts.join(" · ")}.</div>;
};

/**
 * Share a workflow: everything a root task made, on every connected service, put in one
 * collaboration (lok's, by its key). No service knows which others the workflow touched, so
 * each that can is asked (`<namespace>.shareWorkflow`): a dry run first, its combined report
 * reviewed, then the real one.
 */
export const ShareWorkflowDialog = ({ task }: ShareWorkflowDialogProps) => {
  const { openDialog, closeDialog } = useDialog();
  const { data } = useShareWorkflowTaskQuery({ variables: { id: task } });
  const root = data?.task.root ?? data?.task;
  const isPart = !!data?.task.root && data.task.root.id !== data.task.id;
  const { targets, run } = useShareWorkflow();
  const resolve = useResolveCollaboration();
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [pending, setPending] = useState<string>();

  // Picking (or naming) a collaboration runs the dry run: nothing is written yet.
  const { submit: preview, submitting: previewing } = useDialogSubmit(
    async (target: Parameters<typeof resolve>[0]) => {
      if (!root) throw new Error("The workflow is still loading");
      setPending("key" in target ? target.key : "__new__");
      try {
        const collaboration = await resolve(target);
        const shares = await run({ collaboration: collaboration.key, rootTask: root.id, dryRun: true, name: collaboration.name });
        setStep({ kind: "review", collaboration, shares });
      } finally {
        setPending(undefined);
      }
    },
    { errorTitle: "Couldn't look at what the workflow made", close: false },
  );

  const { submit: share, submitting: sharing } = useDialogSubmit(
    async () => {
      if (step.kind !== "review" || !root) return;
      const shares = await run({
        collaboration: step.collaboration.key,
        rootTask: root.id,
        dryRun: false,
        name: step.collaboration.name,
      });
      setStep({ kind: "done", collaboration: step.collaboration, shares });
    },
    { errorTitle: "Couldn't share the workflow", close: false },
  );

  const title = root ? root.action.name : "workflow";

  if (step.kind === "pick") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Share workflow</DialogTitle>
          <DialogDescription>
            Put everything <b>{title}</b>
            {root && (
              <>
                {" "}
                (<Timestamp date={root.createdAt} relative />)
              </>
            )}{" "}
            made, on every service, in a collaboration. You see what it would put in before anything is shared.
            {isPart && " This task is part of that workflow: the whole workflow is shared."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="gap-2">
          {targets.length === 0 ? (
            <div className="text-sm text-muted-foreground">No connected service can share a workflow.</div>
          ) : (
            <CollaborationPicker
              onPick={(target) => void preview(target)}
              disabled={previewing || !root}
              pending={pending}
            />
          )}
        </DialogBody>
      </>
    );
  }

  const totals = shareTotals(step.shares);
  const dryRun = step.kind === "review";

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {dryRun ? "Share" : "Shared"} {title} {dryRun ? "in" : "with"} {step.collaboration.name}
          {dryRun ? "?" : ""}
        </DialogTitle>
        <DialogDescription>
          {dryRun
            ? "What each service would put in the collaboration. Parts of something made before the workflow are left out: share the whole on its own if guests should see it."
            : "What each service put in. Whoever the collaboration is shared with now sees it."}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="gap-2">
        <Summary shares={step.shares} dryRun={dryRun} />
        <ShareReport shares={step.shares} />
      </DialogBody>
      <DialogFooter>
        {dryRun ? (
          <>
            <Button variant="outline" onClick={() => setStep({ kind: "pick" })} disabled={sharing}>
              Back
            </Button>
            <Button onClick={() => void share()} disabled={sharing || totals.added === 0}>
              {sharing ? "Sharing…" : `Share ${plural(totals.added, "object")}`}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => closeDialog()}>
              Close
            </Button>
            <Button
              onClick={() => openDialog("sharecollaboration", { collaboration: step.collaboration.key }, { size: "medium" })}
            >
              Make a link
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
};
