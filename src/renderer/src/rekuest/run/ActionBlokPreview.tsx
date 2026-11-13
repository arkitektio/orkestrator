import * as React from 'react';
import {
  ComponentContext,
  useActionBloksQuery,
  useDependencyTreeQuery,
  type ProvidingImplementationFragment,
} from '../api/graphql';
import {ActionBlokRenderer, type ActionBlokRun} from './ActionBlokRenderer';
import {bindingFromDryRun, type RunBinding} from './binding';
import {actionBlokFor} from './useRun';

/**
 * How a run of the action will look, before there is one: its own bloks with
 * each dependency key bound as the dry run of an assign binds it, `task`
 * idle (or as their demo state has it). Its scene blok (a `<Space>`) places
 * those agents in their room, where people left them.
 */

const NO_BINDING: RunBinding = [];

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
  const scene = actionBlokFor(bloks, ComponentContext.Scene);

  // The agent a run would most likely go to: a connected one, else any.
  const implementation = implementations?.find(candidate => candidate.agent.connected) ?? implementations?.[0];
  const dryRun = useDependencyTreeQuery({
    variables: {input: {implementation: implementation?.id ?? '', dependencies: []}},
    skip: !implementation || (!html && !scene),
    fetchPolicy: 'network-only',
  });
  const level = dryRun.data?.dependencyTree.dependencies;
  const binding = React.useMemo(() => (level ? bindingFromDryRun(level) : NO_BINDING), [level]);
  const self = React.useMemo(
    () => (implementation ? {id: implementation.agent.id, name: implementation.agent.name, connected: implementation.agent.connected} : null),
    [implementation],
  );
  const run = React.useMemo<ActionBlokRun>(() => ({binding, self, task: null}), [binding, self]);

  if (!html && !scene) return null;
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
          // Fill, never intrinsic: a CardHeader is a size container and gives a shrink-to-fit box no width.
          sizing="fill"
          actionBlok={html}
          run={run}
        />
      ) : null}
      {scene ? (
        <div className="relative h-96 overflow-hidden rounded-xl border">
          <ActionBlokRenderer
            surfaceId={`action-${actionId}-scene-preview`}
            chrome="none"
            sizing="fill"
            actionBlok={scene}
            run={run}
          />
        </div>
      ) : null}
    </section>
  );
};
