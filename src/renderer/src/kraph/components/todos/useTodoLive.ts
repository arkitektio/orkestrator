import { TodoChangeKind, TodoChangedSubscription, useTodoChangedSubscription } from "@/kraph/api/graphql";
import type { ApolloClient, NormalizedCache } from "@apollo/client";
import React from "react";

type Change = NonNullable<TodoChangedSubscription["todoChanged"]>;

/** The reads that only the server can answer again: lists that hold items, and counts. */
const LISTINGS = ["TodoList", "TodoItems", "SlimTodoItems", "TodoTrack", "TodoSummary", "TodoItemObjects"];

/** Several changes in a burst (a bulk tick) are one refetch. */
const BURST = 400;

/**
 * Follow the organization's todo lists live (`todoChanged`), narrowed to one
 * board with `list`. A changed item comes in the board's shape and the cache
 * merges it into every view of it; what the cache cannot do itself is done
 * here: a deleted item is evicted, and an item it has never seen (made by
 * someone else, or newly on this object) has the listings read again.
 * `onChange` hears every change, for a view with a rule of its own.
 */
export const useTodoLive = ({ list, onChange }: { list?: string; onChange?: (change: Change) => void } = {}) => {
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  const refetchSoon = (client: ApolloClient<NormalizedCache>) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void client.refetchQueries({ include: LISTINGS }), BURST);
  };

  useTodoChangedSubscription({
    variables: { list },
    onData: ({ client, data }) => {
      const change = data.data?.todoChanged;
      if (!change) return;
      const kraph = client as ApolloClient<NormalizedCache>;
      if (change.kind === TodoChangeKind.Deleted) {
        if (change.itemId) {
          kraph.cache.evict({ id: kraph.cache.identify({ __typename: "TodoItem", id: change.itemId }) });
          kraph.cache.gc();
        }
        refetchSoon(kraph);
      } else if (change.item) {
        // Counts move with any change; a card the cache already held updated itself above.
        refetchSoon(kraph);
      }
      onChange?.(change);
    },
  });
};
