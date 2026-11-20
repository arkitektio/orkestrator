import { useDialog } from "@/core/dialogs/registry";
import { reportErrorAs } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { RotateCcw } from "lucide-react";
import React from "react";
import { v4 as uuidv4 } from "uuid";
import { PrimaryActionFragment, useAllPrimaryActionsQuery } from "../../api/graphql";
import { buildAssignInput, directAssignTarget } from "../../assign";
import { useAssign } from "../../hooks/useAssign";
import { buildActionArgs } from "../../smart/actions";
import { agentStructure } from "../../smart/agent";
import { buildDemands } from "../../smart/demands";
import { actionsVariables } from "../../smart/queries";

const RESTART = /restart|reboot|bounce/i;

/** The supervisor action that restarts an agent: one whose name, or an implementation's interface, says so. */
export const restartActionOf = <A extends Pick<PrimaryActionFragment, "name" | "implementations">>(
  actions: readonly A[],
): A | undefined =>
  actions.find(
    (action) => RESTART.test(action.name) || action.implementations.some((impl) => RESTART.test(impl.interface)),
  );

/**
 * Restart a supervised agent through its supervisor: the same actions the
 * menu lists under "Supervisor" (the supervisor app's actions on this agent),
 * the one that restarts it, run on the agent the way the menu runs it. One
 * query per supervisor, shared by every card it supervises (the variables
 * name the supervisor, not the agent). Nothing when the supervisor offers no
 * restart. An action that needs more than the agent opens the assign form.
 */
export const SupervisorRestartButton = ({
  agent,
  className,
}: {
  agent: { id: string; name?: string | null; supervisor?: string | null };
  className?: string;
}) => {
  const target = React.useMemo(() => agentStructure(agent), [agent]);
  const supervisor = agent.supervisor ?? undefined;
  const { data } = useAllPrimaryActionsQuery({
    variables: actionsVariables(buildDemands({ objects: [target] }).single, { app: supervisor }),
    skip: !supervisor,
    fetchPolicy: "cache-first",
  });
  const restart = data ? restartActionOf(data.actions) : undefined;
  const { assign } = useAssign();
  const { openDialog } = useDialog();
  const [busy, setBusy] = React.useState(false);

  if (!supervisor || !restart) return null;

  const run = async () => {
    const args = buildActionArgs(restart, { objects: [target] });
    const to = directAssignTarget(restart);
    const unknown = restart.args.some((arg) => arg.key && !(arg.key in args) && !arg.nullable && arg.default == null);
    if (!to || unknown) {
      openDialog("assign", { target: { action: restart.id }, args, hidden: args });
      return;
    }
    setBusy(true);
    try {
      await assign(buildAssignInput({ ...to, args, reference: uuidv4() }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={`${restart.name} (through ${supervisor})`}
      aria-label={restart.name}
      disabled={busy}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      onClick={(event) => {
        // The card under it is a selection and a link: this click is the button's.
        event.stopPropagation();
        event.preventDefault();
        void run().catch(reportErrorAs("Couldn't restart the app"));
      }}
      className={cn("relative z-10 h-6 w-6 text-muted-foreground hover:text-foreground", className)}
    >
      <RotateCcw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
    </Button>
  );
};
