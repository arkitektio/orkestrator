import * as React from 'react';
import {
  BlokSceneHostProvider,
  type BlokModelDecoration,
  type BlokSceneHost,
} from '@/core/blok/renderer/bloks/scene';
import {DEFAULT_MODEL_POLICY, type ModelPolicy} from '@/core/model/glb';
import {useAssetPolicyQuery, useBloksForModelQuery, useListMaterializedBloksQuery} from '@/rekuest/api/graphql';

/**
 * rekuest as the host of 3D scenes: its bloks are what `OnClick open=` and
 * model decorations show, and its policy is what a model is held to. Where a
 * model's file comes from is `RekuestAssetHost`'s.
 */

/** Lazy: `MaterializedBlokRenderer` wraps itself in this host, so the import is a cycle until render time. */
const CheckoutMaterializedBlokRenderer = React.lazy(
  () => import('@/rekuest/components/CheckoutMaterializedBlokRenderer'),
);

const MaterializedBlokCard = ({id}: {id: string}) => (
  <React.Suspense fallback={null}>
    <CheckoutMaterializedBlokRenderer materializedBlokId={id} />
  </React.Suspense>
);

const NamedBlok = ({name}: {name: string}) => {
  const {data, loading} = useListMaterializedBloksQuery({variables: {filters: {search: name}}});
  const match = data?.materializedBloks.find(candidate => candidate.blok.name === name);
  if (match) return <MaterializedBlokCard id={match.id} />;
  return <div className="text-xs text-muted-foreground">{loading ? 'Loading…' : `No blok named "${name}".`}</div>;
};

const NO_DECORATIONS: readonly BlokModelDecoration[] = Object.freeze([]);

const useModelDecorations = (ref: string): readonly BlokModelDecoration[] => {
  const {data} = useBloksForModelQuery({variables: {ref}, skip: !ref});
  return React.useMemo(() => {
    const bloks = data?.bloksForModel ?? [];
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
