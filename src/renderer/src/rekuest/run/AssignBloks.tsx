import * as React from 'react';
import {pinsFromFrozen, type ResolvedDependencyInput} from '@arkitektio/bsx/ports/dependencies/tree';
import {ComponentContext, useActionBloksQuery, useDependencyTreeQuery, type ActionBlokFragment} from '../api/graphql';
import type {BlokArgs} from '../components/blokArgs';
import type {BlokAssignRecord} from '../components/MaterializedBlokRenderer';
import {ActionBlokRenderer, blokHolds, chromeOf, keysPlaced, type ActionBlokRun, type AssignParts} from './ActionBlokRenderer';
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

/** The components an assign blok places the argument form and the dependency picker with, and the effect it starts the run with. */
const ARGS_COMPONENT = 'args';
const ARG_COMPONENT = 'arg';
const DEPS_COMPONENT = 'deps';
const DEP_COMPONENT = 'dep';
const START_EFFECT = 'assign.start';

export type AssignBlokSetup = {
  /** The action's assign bloks, html first; empty for an action without any (or while they are read). */
  bloks: readonly ActionBlokFragment[];
  /** What they are drawn for: the dry run's binding, `self` the agent that would run the action, no task. */
  run: ActionBlokRun;
  /** The pins that start the run on the agents the bloks were shown; undefined until the dry run answered. */
  pins: ResolvedDependencyInput[] | undefined;
  /** The arguments the bloks place themselves (`<arg />`, `<args />`), out of `all`: the host shows the others. */
  argsPlaced: (all: readonly string[]) => Set<string>;
  /** The arguments placed one by one (`<arg key />`): `<args />` leaves them out. */
  argsSingled: Set<string>;
  /** The dependencies the bloks place themselves (`<dep />`, `<deps />`), out of `all`: the host shows the others. */
  depsPlaced: (all: readonly string[]) => Set<string>;
  /** The dependencies placed one by one (`<dep key />`): `<deps />` leaves them out. */
  depsSingled: Set<string>;
  /** Whether a blok asks for no chrome (`chrome="none"`): the host then shows no form, picker or start button of its own. */
  bare: boolean;
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
    () => [...declared].sort((a, b) => Number(a.context !== ComponentContext.Panel) - Number(b.context !== ComponentContext.Panel)),
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
  const union = React.useCallback(
    (single: string, rest: string, all: readonly string[]) => new Set(bloks.flatMap(blok => [...keysPlaced(blok, single, rest, all)])),
    [bloks],
  );
  const argsPlaced = React.useCallback((all: readonly string[]) => union(ARG_COMPONENT, ARGS_COMPONENT, all), [union]);
  const depsPlaced = React.useCallback((all: readonly string[]) => union(DEP_COMPONENT, DEPS_COMPONENT, all), [union]);
  // With nothing to take the rest from, only what is placed one by one is left.
  const argsSingled = React.useMemo(() => union(ARG_COMPONENT, '', []), [union]);
  const depsSingled = React.useMemo(() => union(DEP_COMPONENT, '', []), [union]);
  const starts = React.useMemo(() => bloks.some(blok => blokHolds(blok, null, START_EFFECT)), [bloks]);
  const bare = React.useMemo(() => bloks.some(blok => chromeOf(blok.blok.componentTree) === 'none'), [bloks]);
  const refetch = dryRun.refetch;
  const rebind = React.useCallback(() => void refetch(), [refetch]);
  return {bloks, run, pins, argsPlaced, argsSingled, depsPlaced, depsSingled, bare, starts, rebind};
};

/** The assign bloks drawn: the html one as a panel, a scene one in a box of its own. */
export const AssignBloks = ({
  setup,
  surface,
  args,
  parts,
  assign,
  onStart,
}: {
  setup: AssignBlokSetup;
  /** What tells this assign surface from another showing the same action. */
  surface: string;
  args: BlokArgs | undefined;
  /** What `<args />`, `<arg />`, `<deps />` and `<dep />` draw; the same object while nothing changed. */
  parts: AssignParts;
  /** The run being prepared, read as `assign`. */
  assign: BlokAssignRecord;
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
          parts={parts}
          assign={assign}
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
