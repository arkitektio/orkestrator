import { useEffect, useRef } from "react";
import type { DocumentNode } from "@apollo/client";
import {
  ListLensesDocument,
  useWatchLensesSubscription,
  type LensKind,
  type ListLensFragment,
} from "@/mikro/api/graphql";
import { LENS_KIND_ORDER, LENS_KINDS } from "@/mikro/lenses";

/** Lenses arriving in a burst (a task cutting a hundred crops) refetch once. */
const REFETCH_DELAY_MS = 400;
const DEFAULT_REFETCH = [ListLensesDocument];

/** Whether a lens event's create is news to the lists a hook refetches. */
export const createRefetches = (
  created: ListLensFragment | null | undefined,
  when?: (lens: ListLensFragment) => boolean,
): boolean => created != null && (!when || when(created));

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
 * - **delete** evicts the lens under the one typename its kind names
 *   (`deleteKind`), and the lists drop the dangling reference.
 *
 * Mount it where a lens list is shown; mounting IS listening. `refetch` names
 * the queries a create refetches, for a page whose lists are not lens lists
 * but grow with every new whole lens (a converted file's series); `when`
 * says which created lenses are such news (`isWholeLens` there: a crop cut
 * anywhere in the organization is not, and must not refetch the page).
 */
export const useLiveLenses = ({
  kind,
  container,
  refetch = DEFAULT_REFETCH,
  when,
}: {
  kind?: LensKind;
  container?: string;
  refetch?: DocumentNode[];
  when?: (lens: ListLensFragment) => boolean;
} = {}): void => {
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

      if (createRefetches(event.create, when)) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          timer.current = null;
          client.refetchQueries({ include: refetch });
        }, REFETCH_DELAY_MS);
      }

      if (event.delete) {
        // The kind names the typename it was cached under; without it (an
        // older server) every lens typename is tried.
        const typenames = event.deleteKind
          ? LENS_KIND_ORDER.filter((typename) => LENS_KINDS[typename].kind === event.deleteKind)
          : LENS_KIND_ORDER;
        for (const __typename of typenames) {
          client.cache.evict({ id: client.cache.identify({ __typename, id: event.delete }) });
        }
        // No `gc()` here: lists drop the dangling reference on read, and a full
        // sweep per event made a bulk delete N traversals of the whole cache.
        // `GcOnNavigate` collects the orphans when the browser is idle.
      }
    },
    onError: (error) => {
      console.error("Live lenses failed:", error);
    },
  });
};
