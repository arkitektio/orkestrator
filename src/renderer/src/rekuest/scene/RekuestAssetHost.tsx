import * as React from 'react';
import {BlokAssetHostProvider, type BlokAsset, type BlokAssetHost} from '@/core/blok/renderer/assets';
import {useDatalayerEndpoint} from '@/core/connection/arkitekt/host';
import {useAgentAssetsQuery, type MediaStoreFragment} from '@/rekuest/api/graphql';
import {useRekuest} from '@/rekuest/api/hooks';
import {getRekuestMediaUrl} from '@/rekuest/datalayer/rekuestAccess';

/**
 * rekuest as the host of a blok's assets: `@<dependency>.assets.<name>` is the
 * file the agent bound to `dependency` registered as `name`.
 *
 * An agent declares its assets when it registers and uploads them right after,
 * so a blok can be shown before its files are there: the asset is then awaited,
 * and asked for again until it arrives.
 */

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
  const file: MediaStoreFragment | undefined = declared?.asset?.file;
  const awaited = Boolean(declared) && !declared?.asset;
  React.useEffect(() => {
    if (!awaited) return;
    startPolling(AWAITED_ASSET_POLL_MS);
    return stopPolling;
  }, [awaited, startPolling, stopPolling]);

  const load = React.useCallback(async (): Promise<Uint8Array> => {
    if (!file || !endpoint) throw new Error('The asset store is not reachable.');
    const response = await fetch(await getRekuestMediaUrl(file, client, endpoint));
    if (!response.ok) throw new Error(`The asset store answered ${response.status}.`);
    return new Uint8Array(await response.arrayBuffer());
  }, [client, endpoint, file]);

  return React.useMemo<BlokAsset>(() => {
    if (!name) return {status: 'unknown', reason: 'No asset is named.'};
    if (!agent) return {status: 'unknown', reason: `"${dependency}" is not bound to an agent.`};
    if (declared?.asset) return {status: 'ready', ref: declared.asset.ref, kind: declared.asset.kind, load};
    if (declared) return {status: 'awaited', kind: declared.kind};
    if (loading) return {status: 'loading'};
    if (error) return {status: 'unknown', reason: `The asset store could not be asked: ${error.message}`};
    return {status: 'unknown', reason: `Its app registers no asset named "${name}".`};
  }, [agent, declared, dependency, error, load, loading, name]);
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
