import { StreamPort } from "@/reaktion/types";
import {
  DemandKind,
  ListActionFragment,
  PortDemandInput,
  PortMatchInput,
  useAllActionsQuery,
} from "@/rekuest/api/graphql";
import { useMemo } from "react";

const EMPTY_ACTIONS: readonly ListActionFragment[] = Object.freeze([]);

export const portMatches = (ports: readonly StreamPort[] | undefined): PortMatchInput[] =>
  ports?.map((port, index) => ({
    at: index,
    kind: port.kind,
    identifier: port.identifier,
    children: port.children?.map((child, childIndex) => ({
      at: childIndex,
      kind: child.kind,
      identifier: child.identifier,
    })),
  })) ?? [];

export const portDemand = (
  kind: DemandKind,
  ports: readonly StreamPort[] | undefined,
): PortDemandInput => ({
  kind,
  matches: portMatches(ports),
  forceNonNullableLength: ports?.length ?? 0,
});

export type ActionSearchArgs = {
  search?: string;
  protocol?: string;
  demands?: PortDemandInput[];
  stateful?: boolean;
  appIdentifier?: string;
  limit?: number;
};

/**
 * One `AllActions` query whose variables are derived (memoised) from the
 * arguments. No `refetch` effects, no `useState` copy of the variables: a
 * change in the search text is a change in the query key, nothing more.
 */
export const useActionSearch = (args: ActionSearchArgs) => {
  const demandsKey = JSON.stringify(args.demands ?? null);
  const variables = useMemo(
    () => ({
      filters: {
        search: args.search,
        protocols: args.protocol ? [args.protocol] : undefined,
        demands: args.demands,
        stateful: args.stateful,
        appIdentifier: args.appIdentifier,
      },
      pagination: { limit: args.limit ?? 5 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [args.search, args.protocol, demandsKey, args.stateful, args.appIdentifier, args.limit],
  );

  const { data, error, loading } = useAllActionsQuery({ variables });
  return { actions: data?.actions ?? EMPTY_ACTIONS, error, loading };
};
