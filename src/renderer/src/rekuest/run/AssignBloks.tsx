import * as React from 'react';
import {pinsFromFrozen, type ResolvedDependencyInput} from '@arkitektio/bsx/ports/dependencies/tree';
import {ComponentContext, useActionBloksQuery, useDependencyTreeQuery, type ActionBlokFragment} from '../api/graphql';
import type {BlokArgs} from '../components/blokArgs';
import {ActionBlokRenderer, blokHolds, type ActionBlokRun} from './ActionBlokRenderer';
import {bindingFromDryRun, type RunBinding, type RunBoundAgent} from './binding';

/**
 * An action's assign bloks: its own interface for starting a run, shown before
 * there is a task. They read the arguments being filled in as `args` and the
 * agents a run would get as `deps`, may prepare those agents (a call on one is
 * a real task of its own), place the argument form with `<args />` and start
 * the run with `assign.start()`.
 *
 * The agents are those one dry run of the assign binds. The run is started
 * with exactly them pinned (`pins`), so what was prepared is what runs.
 */

const NO_BINDING: RunBinding = [];
const NO_BLOKS: readonly ActionBlokFragment[] = [];

/** The component an assign blok places the argument form with, and the effect it starts the run with. */
const ARGS_COMPONENT = 'args';
const START_EFFECT = 'assign.start';

export type AssignBlokSetup = {
  /** The action's assign bloks, html first; empty for an action without any (or while they are read). */
  bloks: readonly ActionBlokFragment[];
  /** What they are drawn for: the dry run's binding, `self` the agent that would run the action, no task. */
  run: ActionBlokRun;
  /** The pins that start the run on the agents the bloks were shown; undefined until the dry run answered. */
  pins: ResolvedDependencyInput[] | undefined;
  /** Whether a blok places the argument form itself: the host then shows none of its own. */
  placesArgs: boolean;
  /** Whether a blok starts the run itself: the host then shows no start button of its own. */
  starts: boolean;
  /** Asks the dry run again: other agents may have come or gone. */
  rebind: () => void;
};

/**
 * The assign bloks of `actionId`, bound as a run on `implementation` would be
 * with `pinned` (what the form's own dependency picker pins, if anything).
 */
export const useAssignBloks = (
  actionId: string | null | undefined,
  implementation: {id: string; agent: RunBoundAgent} | null | undefined,
  pinned: readonly ResolvedDependencyInput[] | undefined,
): AssignBlokSetup => {
  const {data} = useActionBloksQuery({variables: {id: actionId ?? ''}, skip: !actionId});
  const declared = data?.action.assignBloks ?? NO_BLOKS;
  const bloks = React.useMemo(
    () => [...declared].sort((a, b) => Number(a.context !== ComponentContext.Html) - Number(b.context !== ComponentContext.Html)),
    [declared],
  );
  const pinKey = JSON.stringify(pinned ?? []);
  const dryRun = useDependencyTreeQuery({
    // eslint-disable-next-line react-hooks/exhaustive-deps
    variables: React.useMemo(() => ({input: {implementation: implementation?.id ?? '', dependencies: JSON.parse(pinKey)}}), [implementation?.id, pinKey]),
    skip: !implementation || bloks.length === 0,
    // Not polled: the agents shown stay the agents prepared, until the viewer asks again.
    fetchPolicy: 'network-only',
  });
  const level = dryRun.data?.dependencyTree.dependencies;
  const binding = React.useMemo(() => (level ? bindingFromDryRun(level) : NO_BINDING), [level]);
  const self = implementation?.agent ?? null;
  const selfKey = self ? `${self.id}:${self.name}:${self.connected}` : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = React.useMemo<ActionBlokRun>(() => ({binding, self, task: null}), [binding, selfKey]);
  const pins = React.useMemo(() => (level ? pinsFromFrozen(level) : undefined), [level]);
  const placesArgs = React.useMemo(() => bloks.some(blok => blokHolds(blok, ARGS_COMPONENT)), [bloks]);
  const starts = React.useMemo(() => bloks.some(blok => blokHolds(blok, null, START_EFFECT)), [bloks]);
  const refetch = dryRun.refetch;
  const rebind = React.useCallback(() => void refetch(), [refetch]);
  return {bloks, run, pins, placesArgs, starts, rebind};
};

/** The assign bloks drawn: the html one as a panel, a scene one in a box of its own. */
export const AssignBloks = ({
  setup,
  surface,
  args,
  renderArgs,
  onStart,
}: {
  setup: AssignBlokSetup;
  /** What tells this assign surface from another showing the same action. */
  surface: string;
  args: BlokArgs | undefined;
  renderArgs: () => React.ReactNode;
  onStart: () => unknown;
}) => (
  <>
    {setup.bloks.map(blok => {
      const scene = blok.context === ComponentContext.Scene;
      const drawn = (
        <ActionBlokRenderer
          surfaceId={`assign-${surface}-${blok.id}`}
          chrome={scene ? 'none' : 'minimal'}
          // Fill, never intrinsic: a CardHeader is a size container and gives a shrink-to-fit box no width.
          sizing="fill"
          actionBlok={blok}
          run={setup.run}
          args={args}
          renderArgs={renderArgs}
          onStart={onStart}
        />
      );
      return scene ? (
        <div key={blok.id} className="relative h-96 overflow-hidden rounded-xl border">
          {drawn}
        </div>
      ) : (
        <React.Fragment key={blok.id}>{drawn}</React.Fragment>
      );
    })}
  </>
);
