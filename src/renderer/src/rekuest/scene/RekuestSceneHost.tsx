import * as React from 'react';
import {
  BlokSceneHostProvider,
  type BlokModelDecoration,
  type BlokModelSource,
  type BlokSceneHost,
} from '@/core/blok/renderer/bloks/scene';
import {useDatalayerEndpoint} from '@/core/connection/arkitekt/host';
import {ADMIN_ROLE, useHasRoles} from '@/core/connection/roles';
import {DEFAULT_MODEL_POLICY, type ModelPolicy} from '@/core/model/glb';
import {
  CreateModelDocument,
  ModelPolicyDocument,
  RequestModelUploadDocument,
  StoredModelDocument,
  useBloksForModelQuery,
  useListMaterializedBloksQuery,
  useModelPolicyQuery,
  useStoredModelQuery,
  type CreateModelMutation,
  type CreateModelMutationVariables,
  type MediaStoreFragment,
  type ModelPolicyQuery,
  type RequestModelUploadMutation,
  type RequestModelUploadMutationVariables,
} from '@/rekuest/api/graphql';
import {useRekuest} from '@/rekuest/api/hooks';
import {getRekuestMediaUrl} from '@/rekuest/datalayer/rekuestAccess';
import {addModel, AddModelError} from './addModel';

/**
 * rekuest as the host of 3D scenes: its model store answers where a model's
 * bytes come from, an admin's client adds a missing one, and its bloks are
 * what `OnClick open=` and model decorations show.
 */

/** Bytes this client already holds and verified, by reference: an admin renders what it just added. */
const heldBytes = new Map<string, Uint8Array>();

const hostOf = (source: string): string => {
  try {
    return new URL(source).hostname;
  } catch {
    return source;
  }
};

const AWAITED_MODEL_POLL_MS = 5000;

const useModelSource = (ref: string, from: string): BlokModelSource => {
  const client = useRekuest();
  const endpoint = useDatalayerEndpoint();
  const isAdmin = useHasRoles(ADMIN_ROLE);
  const {data, loading, error, refetch, startPolling, stopPolling} = useStoredModelQuery({
    variables: {ref},
    skip: !ref,
  });
  // A model that names no source arrives when its app has uploaded it: keep asking.
  const awaited = Boolean(ref) && !from && !loading && !error && !data?.model;
  React.useEffect(() => {
    if (!awaited) return;
    startPolling(AWAITED_MODEL_POLL_MS);
    return stopPolling;
  }, [awaited, startPolling, stopPolling]);
  const [adding, setAdding] = React.useState(false);
  const [failure, setFailure] = React.useState<string | undefined>(undefined);

  const file: MediaStoreFragment | undefined = data?.model?.file;
  const load = React.useCallback(async (): Promise<Uint8Array> => {
    const held = heldBytes.get(ref);
    if (held) return held;
    if (!file || !endpoint) throw new Error('The model store is not reachable.');
    const response = await fetch(await getRekuestMediaUrl(file, client, endpoint));
    if (!response.ok) throw new Error(`The model store answered ${response.status}.`);
    return new Uint8Array(await response.arrayBuffer());
  }, [client, endpoint, file, ref]);

  const add = React.useCallback(() => {
    if (!endpoint || !window.api?.fetchModel) {
      setFailure('Models can only be added from the desktop app.');
      return;
    }
    setAdding(true);
    setFailure(undefined);
    addModel(ref, from, {
      policy: async () => {
        const result = await client.query<ModelPolicyQuery>({query: ModelPolicyDocument});
        return result.data.modelPolicy;
      },
      fetch: opts => window.api.fetchModel(opts),
      confirmPrivateHost: async host =>
        window.confirm(`${host} is an address inside this network. Fetch the model from it?`),
      requestUpload: async (reference, size) => {
        const result = await client.mutate<RequestModelUploadMutation, RequestModelUploadMutationVariables>({
          mutation: RequestModelUploadDocument,
          variables: {input: {ref: reference, size}},
        });
        const grant = result.data?.requestModelUpload;
        if (!grant) throw new AddModelError('upload_failed', 'The server issued no upload grant.');
        return {store: grant.store, grant};
      },
      upload: async (path, grant) => {
        await window.api.uploadBigFile({uploadId: crypto.randomUUID(), path, grant, endpointUrl: endpoint});
      },
      create: async (reference, store, source) => {
        await client.mutate<CreateModelMutation, CreateModelMutationVariables>({
          mutation: CreateModelDocument,
          variables: {input: {ref: reference, store, source}},
          refetchQueries: [StoredModelDocument],
        });
      },
      discard: path => window.api.discardModel({path}),
    })
      .then(bytes => {
        heldBytes.set(ref, bytes);
        return refetch();
      })
      .catch((problem: Error) => setFailure(problem.message))
      .finally(() => setAdding(false));
  }, [client, endpoint, from, ref, refetch]);

  return React.useMemo<BlokModelSource>(() => {
    if (!ref) return {status: 'refused', reason: 'No model is named.'};
    if (data?.model) return {status: 'ready', load};
    if (loading) return {status: 'loading'};
    if (error) return {status: 'refused', reason: `The model store could not be asked: ${error.message}`};
    if (!from) return {status: 'missing', sourceHost: null, canAdd: false};
    return {status: 'missing', sourceHost: hostOf(from), canAdd: isAdmin, add, adding, error: failure};
  }, [add, adding, data, error, failure, from, isAdmin, load, loading, ref]);
};

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
  const {data} = useModelPolicyQuery();
  const policy: ModelPolicy = data?.modelPolicy ?? DEFAULT_MODEL_POLICY;
  const host = React.useMemo<BlokSceneHost>(
    () => ({useModelSource, useModelDecorations, renderBlok, policy}),
    [policy],
  );
  return <BlokSceneHostProvider value={host}>{children}</BlokSceneHostProvider>;
};
