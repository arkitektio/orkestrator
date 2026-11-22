import * as React from 'react';
import { preloadable } from '@/core/util/preloadable';
import {
  BlokSceneHostProvider,
  type BlokModelDecoration,
  type BlokSceneHost,
} from '@arkitektio/bsx/renderer/bloks/scene/index';
import {DEFAULT_MODEL_POLICY, type ModelPolicy} from '@/core/model/glb';
import type {ApolloClient} from '@apollo/client';
import {
  BloksForModelsDocument,
  type BloksForModelsQuery,
  type BloksForModelsQueryVariables,
  useAssetPolicyQuery,
  useListMaterializedBloksQuery,
} from '@/rekuest/api/graphql';
import {useRekuest} from '@/rekuest/api/hooks';
import {createModelBlokBatcher, type ModelBlokBatcher} from './modelBloks';

/**
 * rekuest as the host of 3D scenes: its bloks are what `OnClick open=` and
 * model decorations show, and its policy is what a model is held to. Where a
 * model's file comes from is `RekuestAssetHost`'s.
 */

/** Deferred: `MaterializedBlokRenderer` wraps itself in this host, so a static import is a cycle. */
const MaterializedBlokById = preloadable(
  () => import('@/rekuest/components/MaterializedBlokById'),
);

const MaterializedBlokCard = ({id}: {id: string}) => (
  <React.Suspense fallback={null}>
    {/* The scene's card frames it already. */}
    <MaterializedBlokById materializedBlokId={id} chrome="none" />
  </React.Suspense>
);

const NamedBlok = ({name}: {name: string}) => {
  const {data, loading} = useListMaterializedBloksQuery({
    variables: {filters: {blokName: name}, pagination: {limit: 1}},
  });
  const match = data?.materializedBloks[0];
  if (match) return <MaterializedBlokCard id={match.id} />;
  return <div className="text-xs text-muted-foreground">{loading ? 'Loading…' : `No blok named "${name}".`}</div>;
};

const NO_DECORATIONS: readonly BlokModelDecoration[] = Object.freeze([]);

type ModelBlok = BloksForModelsQuery['bloksForModels'][number];

/** One batcher per client: the models a scene shows in one moment are asked for together. */
const batchers = new WeakMap<ApolloClient<unknown>, ModelBlokBatcher<ModelBlok>>();
const batcherFor = (client: ApolloClient<unknown>): ModelBlokBatcher<ModelBlok> => {
  let batcher = batchers.get(client);
  if (!batcher) {
    batcher = createModelBlokBatcher<ModelBlok>(refs =>
      client
        .query<BloksForModelsQuery, BloksForModelsQueryVariables>({
          query: BloksForModelsDocument,
          variables: {refs},
          // Asked again whenever a model is shown, as a fresh scene should be.
          fetchPolicy: 'network-only',
        })
        .then(result => result.data.bloksForModels),
    );
    batchers.set(client, batcher);
  }
  return batcher;
};

const useModelDecorations = (ref: string): readonly BlokModelDecoration[] => {
  const client = useRekuest() as ApolloClient<unknown> | undefined;
  const [answer, setAnswer] = React.useState<{ref: string; bloks: readonly ModelBlok[]} | null>(null);
  React.useEffect(() => {
    if (!ref || !client) return undefined;
    let current = true;
    batcherFor(client)(ref).then(
      bloks => current && setAnswer({ref, bloks}),
      () => current && setAnswer({ref, bloks: []}),
    );
    return () => {
      current = false;
    };
  }, [client, ref]);
  const data = answer?.ref === ref ? answer : null;
  return React.useMemo(() => {
    const bloks = data?.bloks ?? [];
    if (!bloks.length) return NO_DECORATIONS;
    return bloks.flatMap(blok => {
      const materialized = blok.materializedBloks[0];
      return materialized
        ? [{name: blok.name, node: blok.forNode ?? null, render: () => <MaterializedBlokCard id={materialized.id} />}]
        : [];
    });
  }, [data]);
};

const renderBlok = (name: string): React.ReactNode => <NamedBlok name={name} />;

export const RekuestSceneHost = ({children}: {children: React.ReactNode}) => {
  const {data} = useAssetPolicyQuery();
  const policy: ModelPolicy = data?.assetPolicy.model ?? DEFAULT_MODEL_POLICY;
  const host = React.useMemo<BlokSceneHost>(() => ({useModelDecorations, renderBlok, policy}), [policy]);
  return <BlokSceneHostProvider value={host}>{children}</BlokSceneHostProvider>;
};
