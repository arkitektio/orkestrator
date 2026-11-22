import { useEffect } from "react";
import { useQuery, type ApolloCache, type ApolloClient } from "@apollo/client";

import {
  ClientChipDocument,
  ClientChipsDocument,
  DeviceChipDocument,
  DeviceChipsDocument,
  type ClientChipFragment,
  type ClientChipQuery,
  type ClientChipQueryVariables,
  type ClientChipsQuery,
  type ClientChipsQueryVariables,
  type DeviceChipFragment,
  type DeviceChipQuery,
  type DeviceChipQueryVariables,
  type DeviceChipsQuery,
  type DeviceChipsQueryVariables,
} from "../api/graphql";
import { useLok } from "../api/hooks";

/**
 * Lok objects that other services name by an id of their own, fetched together:
 * a device by the device id rekuest reports for an agent, a client by the OAuth
 * client id a provenance entry or a metric carries.
 *
 * The same idea as `userChips`, keyed by that outside id instead of lok's: a
 * display reads its chip from the cache (`<x>Chip(key)`, `cache-only`) and, on
 * a miss, asks for the key here. Every key asked for in the same tick goes out
 * as ONE request (`devices(filters: {deviceIds})`, `clientsByClientId`), and
 * each answer is written as that one key's chip query. A key lok does not know
 * stays a miss: the display shows the raw id, and it is not asked for again
 * for a minute.
 */

/** How long a requested key is not asked for again (it failed or is unknown). */
const RETRY_AFTER_MS = 60_000;
/** Keys per request. */
const MAX_BATCH = 100;

type Batcher = {
  queued: Set<string>;
  requestedAt: Map<string, number>;
  timer: ReturnType<typeof setTimeout> | null;
};

type Lookup = {
  /** Fetch the chips of these keys, and write each under its key. */
  fetch: (client: ApolloClient<unknown>, keys: string[]) => Promise<void>;
  batchers: WeakMap<ApolloClient<unknown>, Batcher>;
};

const lookup = (fetch: Lookup["fetch"]): Lookup => ({ fetch, batchers: new WeakMap() });

const request = (kind: Lookup, client: ApolloClient<unknown>, key: string) => {
  let batcher = kind.batchers.get(client);
  if (!batcher) {
    batcher = { queued: new Set(), requestedAt: new Map(), timer: null };
    kind.batchers.set(client, batcher);
  }
  const last = batcher.requestedAt.get(key);
  if (batcher.queued.has(key) || (last !== undefined && Date.now() - last < RETRY_AFTER_MS)) return;
  batcher.requestedAt.set(key, Date.now());
  batcher.queued.add(key);
  if (batcher.timer) return;
  const pending = batcher;
  pending.timer = setTimeout(() => {
    pending.timer = null;
    const keys = [...pending.queued];
    pending.queued.clear();
    for (let start = 0; start < keys.length; start += MAX_BATCH) {
      kind
        .fetch(client, keys.slice(start, start + MAX_BATCH))
        .catch((error) => console.warn("[keyedChips] batch failed:", error));
    }
  }, 0);
};

const DEVICES = lookup(async (client, deviceIds) => {
  const { data } = await client.query<DeviceChipsQuery, DeviceChipsQueryVariables>({
    query: DeviceChipsDocument,
    variables: { deviceIds, limit: deviceIds.length },
    fetchPolicy: "no-cache",
  });
  client.cache.batch({
    update: (cache: ApolloCache<unknown>) => {
      for (const device of data?.devices ?? []) {
        cache.writeQuery<DeviceChipQuery, DeviceChipQueryVariables>({
          query: DeviceChipDocument,
          variables: { id: device.deviceId },
          data: { deviceByDeviceId: { __typename: "Device", ...device } },
        });
      }
    },
  });
});

const CLIENTS = lookup(async (client, clientIds) => {
  const { data } = await client.query<ClientChipsQuery, ClientChipsQueryVariables>({
    query: ClientChipsDocument,
    variables: { clientIds },
    fetchPolicy: "no-cache",
  });
  client.cache.batch({
    update: (cache: ApolloCache<unknown>) => {
      // Under the id that was asked for: a client's current `clientId` may be another release's.
      for (const { requestedId, client: found } of data?.clientsByClientId ?? []) {
        cache.writeQuery<ClientChipQuery, ClientChipQueryVariables>({
          query: ClientChipDocument,
          variables: { clientId: requestedId },
          data: { client: { __typename: "Client", ...found } },
        });
      }
    },
  });
});

/** A device as rows name it, by its device id; fetched (batched) on a miss. */
export const useDeviceChip = (deviceId: string | null | undefined): DeviceChipFragment | undefined => {
  const client = useLok() as ApolloClient<unknown> | undefined;
  const { data } = useQuery<DeviceChipQuery, DeviceChipQueryVariables>(DeviceChipDocument, {
    client,
    variables: { id: deviceId ?? "" },
    skip: !client || !deviceId,
    fetchPolicy: "cache-only",
  });
  const device = data?.deviceByDeviceId;
  useEffect(() => {
    if (client && deviceId && !device) request(DEVICES, client, deviceId);
  }, [client, deviceId, device]);
  return device;
};

/** A client as rows name it, by its OAuth client id; fetched (batched) on a miss. */
export const useClientChip = (clientId: string | null | undefined): ClientChipFragment | undefined => {
  const client = useLok() as ApolloClient<unknown> | undefined;
  const { data } = useQuery<ClientChipQuery, ClientChipQueryVariables>(ClientChipDocument, {
    client,
    variables: { clientId: clientId ?? "" },
    skip: !client || !clientId,
    fetchPolicy: "cache-only",
  });
  const found = data?.client;
  useEffect(() => {
    if (client && clientId && !found) request(CLIENTS, client, clientId);
  }, [client, clientId, found]);
  return found;
};
