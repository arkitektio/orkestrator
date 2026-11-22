import {
  TodoChangeKind,
  TodoChangedSubscription,
  TodoItemProgressFragment,
  TodoItemProgressFragmentDoc,
  TodoItemWithListFragmentDoc,
  TodoProgressFragment,
  TodoStatus,
  useTodoChangedSubscription,
} from "@/kraph/api/graphql";
import type { ApolloCache, ApolloClient, NormalizedCache } from "@apollo/client";
import React from "react";

type Change = NonNullable<TodoChangedSubscription["todoChanged"]>;

/** The reads that hold items, which only the server can answer again for an item they have not got. */
export const TODO_LISTINGS = ["TodoList", "TodoItems", "TodoTrack", "TodoSummary", "TodoItemObjects"];

/** What a change asks of the cache once its item is written: reads to run again, and how a list's Done count moves. */
export type TodoChangePlan = {
  refetch: string[];
  /** The change to `TodoList.progress.done` of the item's list, for a card that moved into or out of Done. */
  doneDelta: number;
};

const NOTHING: TodoChangePlan = { refetch: [], doneDelta: 0 };

const isDone = (status: TodoStatus) => status === TodoStatus.Done;

/**
 * What one change needs beyond the item the payload carries (which the cache
 * takes as is). `before` is the item as the cache held it, or null when it did
 * not: an item this client has never seen, or one that came over from another
 * list, has to be listed by the server; one it holds only moved its counts.
 */
export const planTodoChange = (change: Change, before: TodoItemProgressFragment | null): TodoChangePlan => {
  if (change.kind === TodoChangeKind.Deleted) return { refetch: TODO_LISTINGS, doneDelta: 0 };
  const after = change.item;
  if (!after) return NOTHING;
  if (!before || before.list.id !== change.listId) return { refetch: TODO_LISTINGS, doneDelta: 0 };

  const moved = before.status !== after.status;
  const ticked = before.progress.done !== after.progress.done || before.progress.total !== after.progress.total;
  if (!moved && !ticked) return NOTHING;
  return {
    // The summary counts columns and objects; an open "+N" popover lists the item's objects.
    refetch: ticked ? ["TodoSummary", "TodoItemObjects"] : ["TodoSummary"],
    doneDelta: Number(isDone(after.status)) - Number(isDone(before.status)),
  };
};

const readBefore = (cache: ApolloCache<unknown>, itemId: string): TodoItemProgressFragment | null => {
  const id = cache.identify({ __typename: "TodoItem", id: itemId });
  if (!id) return null;
  return cache.readFragment<TodoItemProgressFragment>({
    id,
    fragment: TodoItemProgressFragmentDoc,
    fragmentName: "TodoItemProgress",
  });
};

/** Several changes in a burst (a bulk tick) are one refetch. */
const BURST = 400;

export type TodoLiveScope = {
  /** One board: its list's changes. */
  list?: string;
  /** One object (given together with `object`): the changes to the items it is on, and the one that takes it off. */
  identifier?: string;
  object?: string;
  /** Hears every change, for a view with a rule of its own. */
  onChange?: (change: Change) => void;
};

/**
 * Follow the organization's todo lists live (`todoChanged`), narrowed to one
 * board (`list`) or to one object's track (`identifier` + `object`).
 *
 * The item each change carries is written into the cache here, after reading
 * what the cache held of it (`planTodoChange` decides what else to do): a card
 * the cache already showed updates in place and only the counts are read again;
 * a deleted item is evicted; an unseen one has the listings read again. An
 * object's track reads its own rows again (`TodoTrack`) on every change the
 * server says concerns it: its own tick may not be among the item's next few.
 */
export const useTodoLive = ({ list, identifier, object, onChange }: TodoLiveScope = {}) => {
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = React.useRef(new Set<string>());
  React.useEffect(() => () => clearTimeout(timer.current), []);

  const refetchSoon = (client: ApolloClient<NormalizedCache>, names: readonly string[]) => {
    if (names.length === 0) return;
    names.forEach((name) => pending.current.add(name));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const include = [...pending.current];
      pending.current.clear();
      void client.refetchQueries({ include });
    }, BURST);
  };

  const scopedToObject = identifier !== undefined && object !== undefined;

  useTodoChangedSubscription({
    variables: scopedToObject ? { list, identifier, object } : { list },
    // Written by hand below, so the cache can be read before it changes.
    fetchPolicy: "no-cache",
    onData: ({ client, data }) => {
      const change = data.data?.todoChanged;
      if (!change) return;
      const kraph = client as ApolloClient<NormalizedCache>;
      const cache = kraph.cache;
      const before = change.itemId ? readBefore(cache, change.itemId) : null;

      if (change.kind === TodoChangeKind.Deleted && change.itemId) {
        cache.evict({ id: cache.identify({ __typename: "TodoItem", id: change.itemId }) });
        cache.gc();
      }
      if (change.item) {
        cache.writeFragment({
          fragment: TodoItemWithListFragmentDoc,
          fragmentName: "TodoItemWithList",
          data: change.item,
        });
      }

      const plan = planTodoChange(change, before);
      if (plan.doneDelta !== 0) {
        cache.modify<{ progress: TodoProgressFragment }>({
          id: cache.identify({ __typename: "TodoList", id: change.listId }),
          fields: {
            progress: (existing) =>
              existing && "done" in existing ? { ...existing, done: Math.max(0, existing.done + plan.doneDelta) } : existing,
          },
        });
      }
      refetchSoon(kraph, scopedToObject ? ["TodoTrack"] : plan.refetch);
      onChange?.(change);
    },
  });
};
