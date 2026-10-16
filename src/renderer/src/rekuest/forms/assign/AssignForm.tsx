import { useDialog } from "@/core/dialogs/registry";
import { FormActionDescription } from "@/core/ports/engine/ActionDescription";
import { DependencyDefinitionsProvider } from "@/core/ports/engine/DependencyContext";
import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";
import { ArgsContainer } from "@/core/ports/widgets/ArgsContainer";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { Button } from "@/core/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { cn } from "@/core/util/utils";
import {
  ArgPortFragment,
  PostmanTaskFragment,
  ResolvedDependencyInput,
} from "@/rekuest/api/graphql";
import { DependenciesContainer } from "@/rekuest/ports/DependenciesContainer";
import { AlertCircle, Loader2 } from "lucide-react";
import { ReactNode, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { AssignErrorNote } from "../../components/AssignErrorNote";
import { DependencyTreeNotice } from "../../components/dependencies/DependencyTreeNotice";
import { ActionLogo } from "../../components/logo/ActionLogo";
import { useDependencyTree } from "../../hooks/useDependencyTree";
import { useAssignForm } from "./useAssignForm";
import type { AssignTarget, AssignTrack } from "./target";
import { useAssignTarget } from "./useAssignTarget";

export type AssignFormProps = {
  target: AssignTarget;
  /** Prefilled values, by port key. They win over the latest task's. */
  args?: { [key: string]: unknown };
  /** Ports not shown (key → truthy); their values come from `args`. */
  hidden?: { [key: string]: unknown };
  /** The ports to ask for, when not all of the action's (a shortcut's). */
  ports?: ArgPortFragment[];
  /** Start from the args of the viewer's latest task of the target. */
  prefillLatest?: boolean;
  submitLabel?: ReactNode;
  /** Runs before the assign, and may refuse it by throwing (a replyer opens its room). */
  prepareArgs?: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  track?: AssignTrack;
  onAssigned?: (task: PostmanTaskFragment, reference: string) => void;
  /** The run did not start (shown in the form as well). */
  onError?: (error: unknown) => void;
  /** Left of the title (a back button). Dialog only. */
  leading?: ReactNode;
  /** `dialog` has a header and closes on success; `inline` sits on a page. */
  layout?: "dialog" | "inline";
  className?: string;
};

/**
 * The one form that assigns an action or an implementation: from a dialog
 * (`AssignDialog`), from a page, or as the run step of a dialog of its own
 * (export to file, start a replyer).
 *
 * In a dialog, holding Ctrl/⌘ while submitting keeps it open (assign
 * repeatedly). A refused assign stays in the form: the reason next to the
 * button, which shakes once.
 */
export const AssignForm = ({
  target,
  args,
  hidden,
  ports,
  prefillLatest = true,
  submitLabel = "Do",
  prepareArgs,
  track,
  onAssigned,
  onError,
  leading,
  layout = "dialog",
  className,
}: AssignFormProps) => {
  const { action, implementation, latestTask, assign, error } = useAssignTarget(target);
  const formPorts = ports ?? action?.args;
  // A resolution has bound the dependencies already: nothing to pin here.
  const pinning = target.resolution ? undefined : implementation;

  const overwrites = useMemo(
    () => ({ ...(prefillLatest ? latestTask?.args : undefined), ...args }),
    [prefillLatest, latestTask?.args, args],
  );

  const form = useAssignForm({
    ports: formPorts,
    dependencies: pinning?.dependencies,
    overwrites,
    reValidateMode: "onChange",
  });

  const hiddenKeys = useMemo(
    () =>
      hidden &&
      Object.fromEntries(Object.entries(hidden).map(([key, value]) => [key, Boolean(value)])),
    [hidden],
  );

  const tree = useDependencyTree(pinning, form.control);
  const { closeDialog } = useDialog();
  const { registry } = useWidgetRegistry();

  const keepOpenRef = useRef(false);
  // Why the last submit did not start; the form stays on it.
  const [failure, setFailure] = useState<unknown>(null);
  // The button shakes once per refusal; cleared when the animation ends.
  const [refused, setRefused] = useState(false);
  // Counts refusals: keys the reason so it slides in again on a repeat.
  const [refusals, setRefusals] = useState(0);

  const onSubmit = async (data: {
    args: Record<string, unknown>;
    dependencies: ResolvedDependencyInput[];
  }) => {
    const keepOpen = keepOpenRef.current;
    keepOpenRef.current = false;
    setFailure(null);

    const reference = uuidv4();
    let untrack: (() => void) | undefined;
    try {
      const assignArgs = prepareArgs ? await prepareArgs(data.args) : data.args;
      untrack = track?.(reference);
      const task = await assign({
        args: assignArgs,
        dependencies: pinning ? data.dependencies : undefined,
        reference,
        hooks: [],
      });
      onAssigned?.(task, reference);
      if (layout === "dialog" && !keepOpen) closeDialog();
    } catch (e) {
      untrack?.();
      setFailure(e);
      setRefused(true);
      setRefusals((count) => count + 1);
      onError?.(e);
    }
  };

  if (error && !action) {
    return (
      <StatusPage
        variant="compact"
        tone="destructive"
        icon={AlertCircle}
        title={`Could not load the ${target.implementation ? "implementation" : "action"}`}
        description={error.message}
      />
    );
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDownCapture={(e) => {
          if (e.key === "Enter") keepOpenRef.current = e.ctrlKey || e.metaKey;
        }}
        className={cn("flex flex-col gap-4 @container", className)}
      >
        {layout === "dialog" && (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {leading}
              {action?.logo && <ActionLogo action={action} className="h-6 w-6" />}
              <span className="min-w-0 truncate">{action?.name}</span>
            </DialogTitle>
            {implementation && (
              <p className="text-xs text-muted-foreground">@ {implementation.interface}</p>
            )}
            <DialogDescription asChild>
              <div>
                {action?.description && (
                  <FormActionDescription
                    description={action.description}
                    control={form.control}
                    name="args"
                  />
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        )}

        <DependencyDefinitionsProvider dependencies={pinning?.dependencies || []}>
          {formPorts && formPorts.length == 0 && (
            <div className="text-sm text-muted-foreground">No arguments needed</div>
          )}
          <ArgsContainer
            registry={registry}
            groups={action?.portGroups || []}
            ports={formPorts || []}
            hidden={hiddenKeys}
            bound={implementation?.agent.id}
            options={{ layout: "stack" }}
            path={["args"]}
          />
          {pinning && pinning.dependencies.length > 0 && (
            <DependenciesContainer
              dependencies={pinning.dependencies}
              bound={pinning.agent.id}
              tree={tree.nodes}
            />
          )}
        </DependencyDefinitionsProvider>
        <DependencyTreeNotice tree={tree} />

        <DialogFooter className="sm:items-center">
          {/* To the left of the button that was pressed. */}
          <AssignErrorNote
            key={refusals}
            error={failure}
            variant="line"
            className="animate-refuse-reason sm:mr-auto"
          />
          <Button
            type="submit"
            // Red while it shakes, then back to the plain button.
            variant={refused ? "destructive" : "outline"}
            disabled={isSubmitting || tree.satisfied === false}
            className={cn("shrink-0 gap-2", refused && "animate-refuse-shake")}
            onAnimationEnd={() => setRefused(false)}
            onClick={(e) => {
              keepOpenRef.current = e.ctrlKey || e.metaKey;
            }}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/** The `assign` dialog: an action or an implementation, by target. */
export const AssignDialog = (props: Omit<AssignFormProps, "layout">) => (
  <AssignForm {...props} layout="dialog" />
);
