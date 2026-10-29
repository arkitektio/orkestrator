import * as React from 'react';
import {
  BlokAssetHostProvider,
  type BlokAsset,
  type BlokAssetHost,
  type BlokAssetSource,
} from '@arkitektio/bsx/renderer/assets';
import {useDatalayerEndpoint} from '@/core/connection/arkitekt/host';
import {ADMIN_ROLE, useHasRoles} from '@/core/connection/roles';
import {DEFAULT_MODEL_POLICY} from '@/core/model/glb';
import {describeError} from '@/core/notify';
import {
  AgentAssetsDocument,
  AssetPolicyDocument,
  CreateAssetDocument,
  RequestAssetUploadDocument,
  useAgentAssetsQuery,
  type AgentAssetFragment,
  type AssetPolicyQuery,
  type CreateAssetMutation,
  type CreateAssetMutationVariables,
  type RequestAssetUploadMutation,
  type RequestAssetUploadMutationVariables,
} from '@/rekuest/api/graphql';
import {useRekuest} from '@/rekuest/api/hooks';
import {getRekuestAssetUrl} from '@/rekuest/datalayer/rekuestAccess';
import {addAsset, AddAssetError, type AssetLimits} from './addAsset';

/**
 * rekuest as the host of a blok's assets: `@<dependency>.assets.<name>` is the
 * file the agent bound to `dependency` registered as `name`.
 *
 * An agent declares its assets when it registers and uploads them right after,
 * so a blok can be shown before its files are there: the asset is then awaited,
 * and asked for again until it arrives.
 *
 * A file the agent does not hold it names a source for instead. That one no app
 * uploads: an admin's client fetches it from the source and adds it, here.
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

/**
 * The way to add the file `declared` names a source for, for whoever may.
 * A hook: called for every asset, with `undefined` where there is nothing to add.
 */
const useAssetSource = (declared: AgentAssetFragment | undefined): BlokAssetSource | undefined => {
  const client = useRekuest();
  const endpoint = useDatalayerEndpoint();
  const isAdmin = useHasRoles(ADMIN_ROLE);
  const [adding, setAdding] = React.useState(false);
  const [failure, setFailure] = React.useState<string | undefined>(undefined);
  const ref = declared?.ref;
  const kind = declared?.kind;
  const source = declared && !declared.asset ? (declared.source ?? undefined) : undefined;

  const add = React.useCallback(() => {
    if (!ref || !source) return;
    if (!endpoint || !window.api?.fetchAsset) {
      setFailure('Files can only be added from the desktop app.');
      return;
    }
    setAdding(true);
    setFailure(undefined);
    addAsset(ref, source, {
      limits: async (): Promise<AssetLimits> => {
        const result = await client.query<AssetPolicyQuery>({query: AssetPolicyDocument});
        const policy = result.data.assetPolicy;
        return kind === 'MODEL_3D'
          ? {maxSize: policy.model.maxSize, model: {...DEFAULT_MODEL_POLICY, ...policy.model}}
          : {maxSize: policy.image.maxSize};
      },
      fetch: opts => window.api.fetchAsset(opts),
      confirmPrivateHost: async host =>
        window.confirm(`${host} is an address inside this network. Fetch the file from it?`),
      requestUpload: async (reference, size) => {
        const result = await client.mutate<RequestAssetUploadMutation, RequestAssetUploadMutationVariables>({
          mutation: RequestAssetUploadDocument,
          variables: {input: {ref: reference, size}},
        });
        const grant = result.data?.requestAssetUpload;
        if (!grant) throw new AddAssetError('upload_failed', 'The server issued no upload grant.');
        return {store: grant.store, grant};
      },
      upload: async (path, grant) => {
        await window.api.uploadBigFile({uploadId: crypto.randomUUID(), path, grant, endpointUrl: endpoint});
      },
      create: async (reference, store) => {
        await client.mutate<CreateAssetMutation, CreateAssetMutationVariables>({
          mutation: CreateAssetDocument,
          variables: {input: {ref: reference, store}},
          refetchQueries: [AgentAssetsDocument],
        });
      },
      discard: path => window.api.discardAsset({path}),
    })
      .then(bytes => {
        heldBytes.set(ref, bytes);
      })
      .catch((problem: unknown) => setFailure(describeError(problem).message))
      .finally(() => setAdding(false));
  }, [client, endpoint, kind, ref, source]);

  return React.useMemo(
    () => (source ? {host: hostOf(source), canAdd: isAdmin, add, adding, error: failure} : undefined),
    [add, adding, failure, isAdmin, source],
  );
};

const AWAITED_ASSET_POLL_MS = 5000;

/** The agent each dependency key of the blok being rendered is bound to. */
const BoundAgentsContext = React.createContext<ReadonlyMap<string, string>>(new Map());

const useAsset = (dependency: string, name: string): BlokAsset => {
  const client = useRekuest();
  const endpoint = useDatalayerEndpoint();
  const agent = React.useContext(BoundAgentsContext).get(dependency);
  const {data, loading, error, startPolling, stopPolling} = useAgentAssetsQuery({
    variables: {id: agent ?? ''},
    skip: !agent || !name,
  });

  const declared = data?.agent.assets.find(candidate => candidate.name === name);
  const awaited = Boolean(declared) && !declared?.asset;
  React.useEffect(() => {
    if (!awaited) return;
    startPolling(AWAITED_ASSET_POLL_MS);
    return stopPolling;
  }, [awaited, startPolling, stopPolling]);

  const source = useAssetSource(declared);
  const stored = declared?.asset?.ref;

  const load = React.useCallback(async (): Promise<Uint8Array> => {
    const held = stored ? heldBytes.get(stored) : undefined;
    if (held) return held;
    if (!stored || !endpoint) throw new Error('The asset store is not reachable.');
    // TEMPORARY timing: which stage of a slow asset load is slow (grant, first byte, transfer).
    const started = performance.now();
    const url = await getRekuestAssetUrl(stored, client, endpoint);
    const signed = performance.now();
    const response = await fetch(url);
    const headers = performance.now();
    if (!response.ok) throw new Error(`The asset store answered ${response.status}.`);
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body!.getReader();
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const finished = performance.now();
    const transfer = finished - headers;
    console.info('[blok:asset] fetch', {
      ref: stored,
      // Origin and path only: the query string is the signature and carries the session token.
      url: new URL(url).origin + new URL(url).pathname,
      grantAndSignMs: Math.round(signed - started),
      firstByteMs: Math.round(headers - signed),
      transferMs: Math.round(transfer),
      totalMs: Math.round(finished - started),
      bytes: size,
      mbPerSecond: transfer > 0 ? Number((size / 1e6 / (transfer / 1000)).toFixed(2)) : null,
      chunks: chunks.length,
      contentLength: response.headers.get('content-length'),
      contentEncoding: response.headers.get('content-encoding'),
      cacheControl: response.headers.get('cache-control'),
      server: response.headers.get('server'),
      xCache: response.headers.get('x-cache'),
    });
    return bytes;
  }, [client, endpoint, stored]);

  return React.useMemo<BlokAsset>(() => {
    if (!name) return {status: 'unknown', reason: 'No asset is named.'};
    if (!agent) return {status: 'unknown', reason: `"${dependency}" is not bound to an agent.`};
    if (declared?.asset) return {status: 'ready', ref: declared.asset.ref, kind: declared.asset.kind, load};
    if (declared) return {status: 'awaited', kind: declared.kind, source};
    if (loading) return {status: 'loading'};
    if (error) return {status: 'unknown', reason: `The asset store could not be asked: ${error.message}`};
    return {status: 'unknown', reason: `Its app registers no asset named "${name}".`};
  }, [agent, declared, dependency, error, load, loading, name, source]);
};

const HOST: BlokAssetHost = {useAsset};

export const RekuestAssetHost = ({
  agents,
  children,
}: {
  /** Dependency key to the id of the agent it is bound to. */
  agents: ReadonlyMap<string, string>;
  children: React.ReactNode;
}) => (
  <BoundAgentsContext.Provider value={agents}>
    <BlokAssetHostProvider value={HOST}>{children}</BlokAssetHostProvider>
  </BoundAgentsContext.Provider>
);
