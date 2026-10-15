import { useEffect } from "react";
import { useFragment, type ApolloClient } from "@apollo/client";

import {
  UserChipDocument,
  UserChipFragmentDoc,
  UserChipsDocument,
  type UserChipFragment,
  type UserChipQuery,
  type UserChipQueryVariables,
  type UserChipsQuery,
  type UserChipsQueryVariables,
} from "../api/graphql";
import { useLok } from "../api/hooks";

/**
 * People named in rows — an avatar per comment, a creator per card — fetched
 * together.
 *
 * Each `@lok/user` display used to run its own `user(id)` query for the full
 * `DetailUser`: a list of 50 rows by 12 people was 12 requests, each carrying
 * groups and memberships to draw a name. Now a display reads `User:<id>` from
 * the cache with `useFragment` and, on a miss, asks for the id here; every id
 * asked for in the same tick goes out as ONE `users(filters: {ids})` request
 * for the slim `UserChip`, written onto each user.
 *
 * `no-cache`, then each user written as `user(id)`: the answer lands on the
 * users themselves, not as a `users({ids:[…]})` list entry per batch that
 * nothing reads again — and hangs off the root, so `cache.gc()` (run on
 * navigation) keeps it. A fragment watch alone does not protect an entity.
 */

/** How long a requested id is not asked for again (it failed or is unknown). */
const RETRY_AFTER_MS = 60_000;
/** Ids per request: a long list stays a reasonable URL-less POST body. */
const MAX_BATCH = 100;

type Batcher = {
  queued: Set<string>;
  requestedAt: Map<string, number>;
  timer: ReturnType<typeof setTimeout> | null;
};

const batchers = new WeakMap<ApolloClient<unknown>, Batcher>();

const batcherFor = (client: ApolloClient<unknown>): Batcher => {
  let batcher = batchers.get(client);
  if (!batcher) {
    batcher = { queued: new Set(), requestedAt: new Map(), timer: null };
    batchers.set(client, batcher);
  }
  return batcher;
};

const flush = (client: ApolloClient<unknown>, batcher: Batcher) => {
  batcher.timer = null;
  const ids = [...batcher.queued];
  batcher.queued.clear();
  for (let start = 0; start < ids.length; start += MAX_BATCH) {
    const chunk = ids.slice(start, start + MAX_BATCH);
    void client
      .query<UserChipsQuery, UserChipsQueryVariables>({
        query: UserChipsDocument,
        variables: { ids: chunk, limit: chunk.length },
        fetchPolicy: "no-cache",
      })
      .then(({ data }) => {
        client.cache.batch({
          update: (cache) => {
            for (const user of data?.users ?? []) {
              cache.writeQuery<UserChipQuery, UserChipQueryVariables>({
                query: UserChipDocument,
                variables: { id: user.id },
                data: { user: { __typename: "User", ...user } },
              });
            }
          },
        });
      })
      .catch((error) => console.warn("[userChips] batch failed:", error));
  }
};

/** Ask for a user's chip; ids asked for in the same tick share one request. */
export const requestUserChip = (client: ApolloClient<unknown>, id: string) => {
  const batcher = batcherFor(client);
  const last = batcher.requestedAt.get(id);
  if (batcher.queued.has(id) || (last !== undefined && Date.now() - last < RETRY_AFTER_MS)) return;
  batcher.requestedAt.set(id, Date.now());
  batcher.queued.add(id);
  if (!batcher.timer) batcher.timer = setTimeout(() => flush(client, batcher), 0);
};

/** A user as rows show them, from the cache, fetched (batched) on a miss. */
export const useUserChip = (id: string | null | undefined): UserChipFragment | undefined => {
  const client = useLok() as ApolloClient<unknown> | undefined;
  const { data, complete } = useFragment<UserChipFragment>({
    fragment: UserChipFragmentDoc,
    fragmentName: "UserChip",
    from: id ? { __typename: "User", id } : null,
    client,
  });

  useEffect(() => {
    if (client && id && !complete) requestUserChip(client, id);
  }, [client, id, complete]);

  return complete ? (data as UserChipFragment) : undefined;
};
