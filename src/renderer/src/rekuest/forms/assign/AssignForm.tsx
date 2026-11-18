import type { Control, FieldValues } from "react-hook-form";
import { useDialog } from "@/core/dialogs/registry";
import { DependencyDefinitionsProvider } from "@arkitektio/bsx/ports/engine/DependencyContext";
import { PortFitsContext } from "@arkitektio/bsx/ports/engine/PortFitsContext";
import { useWidgetRegistry } from "@arkitektio/bsx/ports/engine/WidgetsContext";
import { ArgsContainer } from "@arkitektio/bsx/ports/widgets/ArgsContainer";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { Button } from "@/core/ui/button";
import {
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import {
  ArgPortFragment,
  PostmanTaskFragment,
  ResolvedDependencyInput,
} from "@/rekuest/api/graphql";
import { DependenciesContainer } from "@arkitektio/bsx/ports/dependencies/DependenciesContainer";
import { AlertCircle, Loader2 } from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { AssignBloks, useAssignBloks } from "../../run/AssignBloks";
import { PortBlokRunProvider } from "../../run/PortBlokRenderer";
import { usesPortBlok } from "../../run/portBloks";
import type { AssignParts } from "../../run/ActionBlokRenderer";
import type { BlokAssignRecord } from "../../components/MaterializedBlokRenderer";
import { v4 as uuidv4 } from "uuid";
import { AssignErrorNote } from "../../components/AssignErrorNote";
import { assignAutoKey, AutoModeToggle, useAutoMode } from "../../components/AutoModeToggle";
import { DependencyTreeNotice } from "@arkitektio/bsx/ports/dependencies/DependencyTreeNotice";
import { ActionLogo } from "../../components/logo/ActionLogo";
import { useDependencyTree } from "@arkitektio/bsx/ports/dependencies/useDependencyTree";
import { EstimatedRuntimeHint } from "./EstimatedRuntimeHint";
import { FitsGuard, portFitsOf, type FitDecision } from "./FitsGuard";
import { RunsOn } from "./RunsOn";
import { submitsOnlyByAccident } from "./startKeys";
import { canTakeWork } from "@/rekuest/assign";
import { useAssignForm } from "@arkitektio/bsx/ports/engine/useAssignForm";
import type { AssignTarget, AssignTrack } from "./target";
import { useAssignTarget } from "./useAssignTarget";
import { withDefaults } from "./withDefaults";

export type AssignFormProps = {
  target: AssignTarget;
  /** Prefilled values, by port key. They win over the latest task's. */
  args?: { [key: string]: unknown };
  /**
   * Suggested values, by port key: used only where neither `args` nor the
   * latest task say anything (the scene's data lens, for an action that never
   * ran).
   */
  defaults?: { [key: string]: unknown };
  /** Ports not shown (key → truthy); their values come from `args`. */
  hidden?: { [key: string]: unknown };
  /** The ports to ask for, when not all of the action's (a shortcut's). */
  ports?: ArgPortFragment[];
  /** Start from the args of the viewer's latest task of the target. */
  prefillLatest?: boolean;
  /**
   * Whether the action's own interface for starting a run (its assign bloks)
   * is drawn. Off, this is the plain generated form whatever the action brings.
   */
  bloks?: boolean;
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
  defaults,
  hidden,
  ports,
  prefillLatest = true,
  bloks = true,
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
  // Off, what this task's agents ask other actions to do waits for approval.
  const autoMode = useAutoMode(assignAutoKey(target));
  const formPorts = ports ?? action?.args;
  // A resolution has bound the dependencies already: nothing to pin here.
  const pinning = target.resolution ? undefined : implementation;

  const overwrites = useMemo(
    () => withDefaults({ ...(prefillLatest ? latestTask?.args : undefined), ...args }, defaults),
    [defaults, prefillLatest, latestTask?.args, args],
  );

  // What the assign bloks place (`<arg />`, `<args />`): sent even while a closed popover or
  // accordion holds its field. Known once the bloks are read, which needs this form's pins.
  const [placedArgs, setPlacedArgs] = useState<string[]>([]);
  const form = useAssignForm({
    ports: formPorts,
    dependencies: pinning?.dependencies,
    overwrites,
    reValidateMode: "onChange",
    placed: placedArgs,
  });

  const hiddenKeys = useMemo(
    () =>
      hidden &&
      Object.fromEntries(Object.entries(hidden).map(([key, value]) => [key, Boolean(value)])),
    [hidden],
  );

  // What reads the form by field name takes it untyped: its names are the ports', known at run time.
  const fieldsControl = form.control as unknown as Control<FieldValues>;
  const tree = useDependencyTree(pinning, form.control);
  const { closeDialog } = useDialog();
  const { registry } = useWidgetRegistry();

  const keepOpenRef = useRef(false);
  // A start that is on its way: a second one is dropped until it answered.
  const startingRef = useRef(false);
  // Why the last submit did not start; the form stays on it.
  const [failure, setFailure] = useState<unknown>(null);
  // The button shakes once per refusal; cleared when the animation ends.
  const [refused, setRefused] = useState(false);
  // Which agent can handle what is picked: takt alone would take the first available.
  const [fit, setFit] = useState<FitDecision>({});
  const candidates = implementation ? [implementation] : action?.implementations;
  const portFits = useMemo(() => portFitsOf(candidates), [candidates]);
  // A workflow: a run that asks other actions to do things. Only then is there
  // anything for auto-mode to let through; an action without dependencies asks for nothing.
  const workflow = (candidates ?? []).some((c) => c.dependencies.length > 0);
  // Counts refusals: keys the reason so it slides in again on a repeat.
  const [refusals, setRefusals] = useState(0);

  // A stateful action keeps its state on one agent, so its run names one (the server refuses it
  // by action alone, even with one implementation): the only one that can take it now, else the
  // one picked here.
  const naming = Boolean(target.action && action?.stateful);
  const [picked, setPicked] = useState<string>();
  const live = useMemo(
    () => (naming ? (candidates ?? []).filter((c) => canTakeWork(c.agent)) : []),
    [candidates, naming],
  );
  const named = live.find((c) => c.id === picked) ?? (live.length === 1 ? live[0] : undefined);

  // The action's own interface for starting a run (its assign bloks), bound as a run on the
  // implementation it would go to: the target's, the named one, the one that fits, else the first
  // that can take work.
  const chosen = useMemo(() => {
    if (target.resolution) return undefined;
    const pick = implementation ?? named ?? candidates?.find((c) => c.id === fit.pin) ?? candidates?.find((c) => c.agent.active) ?? candidates?.[0];
    return pick
      ? { id: pick.id, agent: { id: pick.agent.id, name: pick.agent.name ?? pick.agent.id, connected: pick.agent.active } }
      : undefined;
  }, [candidates, fit.pin, implementation, named, target.resolution]);
  const watchedPins = useWatch({ control: fieldsControl, name: "dependencies" }) as ResolvedDependencyInput[] | undefined;
  const filling = useWatch({ control: fieldsControl, name: "args" }) as Record<string, unknown> | undefined;
  // An argument drawn by a blok of its own reads the run's agents like an assign blok does.
  const portBloks = useMemo(() => usesPortBlok(formPorts), [formPorts]);
  const setup = useAssignBloks(bloks ? action?.id : undefined, chosen, pinning ? watchedPins : undefined, portBloks);
  const assignBloks = setup.bloks.length > 0;

  const onSubmit = async (data: {
    args: Record<string, unknown>;
    dependencies: ResolvedDependencyInput[];
  }) => {
    // One run per start, whatever asked twice (a double click, a blok and the form).
    if (startingRef.current) return;
    startingRef.current = true;
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
        // An assign blok was shown agents (and may have prepared them): the run gets exactly those.
        dependencies: assignBloks && setup.pins ? setup.pins : pinning ? data.dependencies : undefined,
        reference,
        hooks: [],
        policy: autoMode.policy,
        // A resolution has bound its agents already.
        ...(named
          ? { implementation: named.id }
          : assignBloks && chosen && !implementation
            ? { implementation: chosen.id }
            : fit.pin && !target.resolution
              ? { implementation: fit.pin }
              : {}),
      });
      onAssigned?.(task, reference);
      if (layout === "dialog" && !keepOpen) closeDialog();
    } catch (e) {
      untrack?.();
      setFailure(e);
      setRefused(true);
      setRefusals((count) => count + 1);
      onError?.(e);
    } finally {
      startingRef.current = false;
    }
  };

  // The generated argument form, in parts: an assign blok places some (`<arg />`, `<args />`),
  // the form shows the rest. What the caller gave (`hidden`) is decided: it is drawn nowhere,
  // or locked where a blok lists it (`<args given="show" />`).
  const portGroups = action?.portGroups;
  const boundAgent = implementation?.agent.id;
  const argKeys = useMemo(() => (formPorts ?? []).map((port) => port.key), [formPorts]);
  const placedKey = assignBloks ? [...setup.argsPlaced(argKeys)].sort().join("\u0000") : "";
  useEffect(() => setPlacedArgs(placedKey ? placedKey.split("\u0000") : []), [placedKey]);
  const givenKeys = useMemo(
    () => argKeys.filter((key) => hiddenKeys?.[key]),
    [argKeys, hiddenKeys],
  );
  const drawArgs = useCallback(
    (keys: readonly string[], locked = false) => {
      const ports = (formPorts ?? []).filter((port) => keys.includes(port.key));
      if (ports.length === 0) return null;
      return (
        <ArgsContainer
          registry={registry}
          groups={portGroups || []}
          ports={ports}
          bound={boundAgent}
          options={{ layout: "stack", disable: locked }}
          path={["args"]}
        />
      );
    },
    [boundAgent, formPorts, portGroups, registry],
  );
  const { argsSingled, depsSingled } = setup;
  const depKeys = useMemo(
    () => (pinning?.dependencies ?? []).map((dependency) => dependency.key),
    [pinning?.dependencies],
  );
  const treeNodes = tree.nodes;
  const drawDeps = useCallback(
    (keys: readonly string[]) => {
      const dependencies = (pinning?.dependencies ?? []).filter((dependency) => keys.includes(dependency.key));
      if (!pinning || dependencies.length === 0) return null;
      return (
        <DependenciesContainer dependencies={dependencies} bound={pinning.agent.id} tree={treeNodes} />
      );
    },
    [pinning, treeNodes],
  );
  const parts = useMemo<AssignParts>(
    () => ({
      // The rest: not given, not placed one by one, narrowed by `only` / `omit`.
      renderArgs: (options) => {
        const rest = argKeys.filter(
          (key) =>
            !givenKeys.includes(key) &&
            !argsSingled.has(key) &&
            (!options?.only || options.only.includes(key)) &&
            !options?.omit?.includes(key),
        );
        return (
          <>
            {options?.given === "show" && drawArgs(givenKeys, true)}
            {drawArgs(rest)}
          </>
        );
      },
      renderArg: (key) => (givenKeys.includes(key) ? null : drawArgs([key])),
      renderDeps: () => drawDeps(depKeys.filter((key) => !depsSingled.has(key))),
      renderDep: (key) => drawDeps([key]),
    }),
    [argKeys, argsSingled, depKeys, depsSingled, drawArgs, drawDeps, givenKeys],
  );
  const isSubmitting = form.formState.isSubmitting;
  // Why the button is grey, said on the button: the rows above carry the detail.
  const blocked = fit.refused
    ? `No agent fits this ${fit.refused.port}`
    : tree.satisfied === false
      ? tree.unmet.length > 1
        ? `${tree.unmet.length} dependencies are not met`
        : "A dependency is not met"
      : naming && !named
        ? live.length === 0
          ? "No agent that runs this is online"
          : "Choose which agent runs this"
        : undefined;
  // What an assign blok reads as `assign`: what the caller decided, what is still to fill in,
  // and whether the run can start.
  const assignRecord = useMemo<BlokAssignRecord>(() => {
    const missing = (formPorts ?? [])
      .filter((port) => {
        const value = filling?.[port.key];
        return !port.nullable && (value === undefined || value === null || value === "");
      })
      .map((port) => port.key);
    return {
      given: Object.fromEntries(givenKeys.map((key) => [key, true])),
      missing,
      ready: missing.length === 0,
      starting: isSubmitting,
      blocked: blocked ?? null,
    };
  }, [blocked, filling, formPorts, givenKeys, isSubmitting]);
  // `assign.start()`: the form's own submit, with its validation; nothing while it may not start.
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;
  const startDisabledRef = useRef(false);
  const startRun = useCallback(
    () => (startDisabledRef.current ? undefined : form.handleSubmit((data) => submitRef.current(data))()),
    [form],
  );

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

  // `chrome="none"` on an assign blok's root: the form adds no arguments, picker or button of its own.
  const bare = assignBloks && setup.bare;
  // What no assign blok places is the form's own to show.
  const restArgs = argKeys.filter(
    (key) => !givenKeys.includes(key) && !(assignBloks && setup.argsPlaced(argKeys).has(key)),
  );
  const restDeps = depKeys.filter((key) => !(assignBloks && setup.depsPlaced(depKeys).has(key)));
  const startDisabled = isSubmitting || Boolean(blocked);
  startDisabledRef.current = startDisabled;
  // In a dialog the fields scroll between a header and a footer that stay put.
  const Fields = layout === "dialog" ? DialogBody : "div";

  return (
    <Form {...form}>
      <form
        // A button a blok draws is a plain button (bsx 6.6.1), so only the form's own start
        // submits it; a blok starts the run through `assign.start()`.
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        onKeyDownCapture={(e) => {
          if (e.key === "Enter") keepOpenRef.current = e.ctrlKey || e.metaKey;
        }}
        // After the fields had it (a search picks its result on Enter): an Enter that would
        // only submit because a field was focused starts nothing. The button starts the run.
        onKeyDown={(e) => {
          if (submitsOnlyByAccident(e)) e.preventDefault();
        }}
        className={cn(
          "flex flex-col gap-4 @container",
          // A `DialogForm`: carries the dialog's column on to the body.
          layout === "dialog" && "min-h-0 flex-1",
          // `@container` contains the form's inline size, so its rows give a
          // fitted dialog no width to fit: it would open at the floor. The
          // dialog gets its width here instead (the page still caps it).
          layout === "dialog" && "w-[40rem] max-w-full",
          className,
        )}
      >
        {layout === "dialog" && (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {leading}
              {action?.logo && <ActionLogo action={action} className="h-6 w-6" />}
              <span className="min-w-0 truncate">{action?.name}</span>
            </DialogTitle>
            {(implementation || action?.description) && (
              <DialogDescription>
                {implementation && <span className="font-mono">{implementation.interface}</span>}
                {implementation && action?.description && " · "}
                {action?.description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}

        <Fields className="flex flex-col gap-4">
        <PortFitsContext.Provider value={portFits}>
        <PortBlokRunProvider value={setup.run}>
        <DependencyDefinitionsProvider dependencies={pinning?.dependencies || []}>
          {assignBloks && (
            // `contents`: no box of its own, only the mark the submit handler looks for.
            <div data-assign-bloks className="contents">
              <AssignBloks
                setup={setup}
                surface={`${action?.id ?? "action"}-${chosen?.id ?? "any"}`}
                args={filling}
                parts={parts}
                assign={assignRecord}
                onStart={startRun}
              />
            </div>
          )}
          {formPorts && formPorts.length == 0 && !bare && (
            <div className="text-sm text-muted-foreground">No arguments needed</div>
          )}
          {/* What the caller gave is shown nowhere, yet validated and sent: its fields stay registered. */}
          {givenKeys.length > 0 && (
            <div className="hidden">
              <ArgsContainer
                registry={registry}
                groups={portGroups || []}
                ports={(formPorts ?? []).filter((port) => givenKeys.includes(port.key))}
                hidden={hiddenKeys}
                bound={boundAgent}
                path={["args"]}
              />
            </div>
          )}
          {/* The arguments and dependencies no assign blok places (`<arg />`, `<args />`, `<dep />`, `<deps />`). */}
          {!bare && drawArgs(restArgs)}
          {!bare && drawDeps(restDeps)}
        </DependencyDefinitionsProvider>
        </PortBlokRunProvider>
        </PortFitsContext.Provider>
        <DependencyTreeNotice tree={tree} />

        <FitsGuard
          control={fieldsControl}
          ports={formPorts}
          implementations={candidates}
          onDecision={setFit}
        />
        {fit.refused && (
          <div className="text-xs text-destructive">
            No agent fits this {fit.refused.port}: {fit.refused.source}
          </div>
        )}
        {/* Also under `chrome="none"`: nothing else could say which of several it runs on. */}
        {naming && <RunsOn live={live} value={named?.id} onChange={setPicked} />}
        </Fields>

        <DialogFooter className="sm:items-center">
          {/* To the left of the button that was pressed. */}
          <AssignErrorNote
            key={refusals}
            error={failure}
            variant="line"
            className="animate-refuse-reason sm:mr-auto"
          />
          <EstimatedRuntimeHint
            control={fieldsControl}
            ports={formPorts}
            implementations={candidates}
            className="shrink-0"
          />
          {workflow && (
            <AutoModeToggle auto={autoMode.auto} onChange={autoMode.setAuto} className="shrink-0" tooltip={false} />
          )}
          {/* An assign blok that starts the run itself (`assign.start()`) is the start button. */}
          {!(assignBloks && (setup.starts || setup.bare)) && (
            <Tooltip>
              {/* A disabled button hears no pointer: the span around it does. */}
              <TooltipTrigger asChild>
                <span className="shrink-0 max-sm:*:w-full" tabIndex={blocked ? 0 : undefined}>
                  <Button
                    type="submit"
                    // Red while it shakes, then back to the plain button.
                    variant={refused ? "destructive" : "default"}
                    disabled={startDisabled}
                    className={cn("gap-2", refused && "animate-refuse-shake")}
                    onAnimationEnd={() => setRefused(false)}
                    onClick={(e) => {
                      keepOpenRef.current = e.ctrlKey || e.metaKey;
                    }}
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitLabel}
                  </Button>
                </span>
              </TooltipTrigger>
              {blocked && <TooltipContent>{blocked}</TooltipContent>}
            </Tooltip>
          )}
        </DialogFooter>
      </form>
    </Form>
  );
};

/** The `assign` dialog: an action or an implementation, by target. */
export const AssignDialog = (props: Omit<AssignFormProps, "layout">) => (
  <AssignForm {...props} layout="dialog" />
);
