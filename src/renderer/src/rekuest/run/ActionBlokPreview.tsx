import * as React from 'react';
import {RekuestSpace} from '@/core/linkers';
import {
  ComponentContext,
  useActionBloksQuery,
  useDependencyTreeQuery,
  useSpaceQuery,
  type ProvidingImplementationFragment,
} from '../api/graphql';
import {SpaceScene} from '../space-scene';
import {ActionBlokRenderer, type ActionBlokRun} from './ActionBlokRenderer';
import {bindingFromDryRun, runAgentIds, type RunBinding} from './binding';
import {actionBlokFor, useSpacesForAgents, type SpaceRun} from './useRun';

/**
 * How a run of the action will look, before there is one: its own bloks with
 * each dependency key bound as the dry run of an assign binds it, `task`
 * idle (or as their demo state has it). The overlay is drawn into the space
 * placing the most of those agents.
 */

const NO_BINDING: RunBinding = [];

const OverlayPreview = ({spaceId, run}: {spaceId: string; run: SpaceRun}) => {
  const {data} = useSpaceQuery({variables: {id: spaceId}});
  if (!data?.space) return <div className="h-96 animate-pulse rounded-xl bg-muted/40" />;
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-muted-foreground">
        Drawn into{' '}
        <RekuestSpace.DetailLink object={data.space} className="font-medium text-foreground hover:underline">
          {data.space.name}
        </RekuestSpace.DetailLink>
        , the space placing the most of its agents.
      </div>
      <div className="relative h-96 overflow-hidden rounded-xl border">
        <SpaceScene space={data.space} run={run} readOnly />
      </div>
    </div>
  );
};

/** Which agent each key binds to in the preview, so the author sees what the blok is drawn with. */
const BindingList = ({binding}: {binding: RunBinding}) =>
  binding.length ? (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {binding.map(({key, agent}) => (
        <React.Fragment key={`${key}:${agent.id}`}>
          <dt className="font-mono text-muted-foreground">{key}</dt>
          <dd>{agent.name}</dd>
        </React.Fragment>
      ))}
    </dl>
  ) : null;

export const ActionBlokPreview = ({
  actionId,
  implementations,
}: {
  actionId: string;
  implementations?: readonly ProvidingImplementationFragment[];
}) => {
  const {data} = useActionBloksQuery({variables: {id: actionId}});
  const bloks = data?.action.bloks;
  const html = actionBlokFor(bloks, ComponentContext.Html);
  const overlay = actionBlokFor(bloks, ComponentContext.Overlay);

  // The agent a run would most likely go to: a connected one, else any.
  const implementation = implementations?.find(candidate => candidate.agent.connected) ?? implementations?.[0];
  const dryRun = useDependencyTreeQuery({
    variables: {input: {implementation: implementation?.id ?? '', dependencies: []}},
    skip: !implementation || (!html && !overlay),
    fetchPolicy: 'network-only',
  });
  const level = dryRun.data?.dependencyTree.dependencies;
  const binding = React.useMemo(() => (level ? bindingFromDryRun(level) : NO_BINDING), [level]);
  const self = React.useMemo(
    () => (implementation ? {id: implementation.agent.id, name: implementation.agent.name, connected: implementation.agent.connected} : null),
    [implementation],
  );
  const run = React.useMemo<ActionBlokRun>(() => ({binding, self, task: null}), [binding, self]);
  const agents = React.useMemo(() => runAgentIds(binding, self), [binding, self]);
  const {spaces, loading} = useSpacesForAgents(overlay ? agents : []);
  const spaceId = spaces[0]?.space.id ?? null;
  const overlayRun = React.useMemo<SpaceRun | null>(() => (overlay ? {actionBlok: overlay, run} : null), [overlay, run]);

  if (!html && !overlay) return null;
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">How a run looks</h2>
        <p className="text-xs text-muted-foreground">
          The action&apos;s own bloks, previewed with the agents a run would get now and their demo state.
        </p>
      </div>
      <BindingList binding={binding} />
      {html ? (
        <ActionBlokRenderer
          surfaceId={`action-${actionId}-preview`}
          chrome="minimal"
          sizing="intrinsic"
          actionBlok={html}
          run={run}
        />
      ) : null}
      {overlayRun ? (
        spaceId ? (
          <OverlayPreview spaceId={spaceId} run={overlayRun} />
        ) : (
          <div className="rounded-xl border border-dashed px-3 py-4 text-xs text-muted-foreground">
            {loading
              ? 'Looking for a space…'
              : 'No space places these agents yet. Place them in a space to preview the overlay over them.'}
          </div>
        )
      ) : null}
    </section>
  );
};
