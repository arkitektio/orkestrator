import { useEffect, useRef } from "react";
import {
  ListLensesDocument,
  useWatchLensesSubscription,
  type LensKind,
} from "@/mikro/api/graphql";
import { LENS_KIND_ORDER } from "@/mikro/lenses";

/** Lenses arriving in a burst (a task cutting a hundred crops) refetch once. */
const REFETCH_DELAY_MS = 400;

/**
 * Keep the lens lists on screen current: every lens someone else (or a task)
 * cuts, renames or deletes, for one container, one kind, or the whole
 * organization when neither is given.
 *
 * - **update** needs nothing: the event carries `ListLens`, Apollo writes it
 *   into the normalized lens, and every row showing it follows.
 * - **create** refetches the `ListLenses` queries on screen. Where a new lens
 *   belongs depends on each list's own filters, ordering and page, which only
 *   the server can answer, so it is not spliced in by hand.
 * - **delete** evicts the lens under each of its six possible typenames (the
 *   event carries only an id), and the lists drop the dangling reference.
 *
 * Mount it where a lens list is shown; mounting IS listening.
 */
export const useLiveLenses = ({
  kind,
  container,
}: { kind?: LensKind; container?: string } = {}): void => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useWatchLensesSubscription({
    variables: { kind, container },
    onData: ({ client, data }) => {
      const event = data.data?.lenses;
      if (!event) return;

      if (event.create) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          timer.current = null;
          client.refetchQueries({ include: [ListLensesDocument] });
        }, REFETCH_DELAY_MS);
      }

      if (event.delete) {
        for (const __typename of LENS_KIND_ORDER) {
          client.cache.evict({ id: client.cache.identify({ __typename, id: event.delete }) });
        }
        client.cache.gc();
      }
    },
    onError: (error) => {
      console.error("Live lenses failed:", error);
    },
  });
};
