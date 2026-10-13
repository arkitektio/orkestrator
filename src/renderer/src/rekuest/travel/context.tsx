import * as React from "react";
import { BlokSceneStillProvider } from "@/core/blok/renderer/bloks/scene/host";
import { useLatestRef } from "@/core/util/hooks/useLatestRef";
import {
  CheckoutAgentDocument,
  type CheckoutAgentQuery,
  type CheckoutAgentQueryVariables,
  SessionBoundariesDocument,
  type SessionBoundariesQuery,
  type SessionBoundariesQueryVariables,
  CheckoutAgentRevisionDocument,
  type CheckoutAgentRevisionQuery,
  type CheckoutAgentRevisionQueryVariables,
} from "@/rekuest/api/graphql";
import { useRekuest } from "@/rekuest/api/hooks";
import { useAgentLiveState } from "@/rekuest/hooks/useLiveState";
import {
  createTravelSource,
  EMPTY_TRAVEL_STATE,
  type TravelSnapshot,
  type TravelSource,
} from "./travelSource";

/**
 * Whether the bloks below show the present or a moment in the past.
 *
 * `null` is the present: every blok watches its agents live. A source is the
 * past: every blok below reads its agents' state from it, at the source's one
 * clock. The provider goes above the scene surface, not inside one blok: the
 * cards a scene opens (a model's decorations, `OnClick open=`) are bloks of
 * their own and must show the same moment.
 */
const BlokTravelContext = React.createContext<TravelSource | null>(null);

export const BlokTravelProvider = ({
  source,
  children,
}: {
  source: TravelSource | null;
  children: React.ReactNode;
}) => (
  <BlokTravelContext.Provider value={source}>
    <BlokSceneStillProvider value={source !== null}>{children}</BlokSceneStillProvider>
  </BlokTravelContext.Provider>
);

export const useBlokTravelSource = (): TravelSource | null => React.useContext(BlokTravelContext);

const unwatched = () => {};

/**
 * One state of one agent as the surrounding blok should show it: live, or at
 * the moment the travel source stands on. `known: false` means there is no
 * answer yet and whatever is shown stays.
 */
export const useBoundState = ({
  agentID,
  stateInterface,
}: {
  agentID: string;
  stateInterface: string;
}): TravelSnapshot => {
  const source = useBlokTravelSource();
  const live = useAgentLiveState({ agentID, stateInterface, skip: source !== null });

  const subscribe = React.useCallback(
    (onStoreChange: () => void) =>
      source ? source.acquire(agentID, stateInterface, onStoreChange) : unwatched,
    [agentID, source, stateInterface],
  );
  const getSnapshot = React.useCallback(
    () => (source ? source.getSnapshot(agentID, stateInterface) : EMPTY_TRAVEL_STATE),
    [agentID, source, stateInterface],
  );
  const travelled = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return React.useMemo(
    () =>
      source ? travelled : { value: live.value, revision: live.revision, known: live.value !== null },
    [live.revision, live.value, source, travelled],
  );
};

/**
 * A travel source on rekuest's client. It asks nothing until something below
 * a `BlokTravelProvider` watches it.
 */
export const useRekuestTravelSource = (options?: { onReachedLive?: () => void }): TravelSource => {
  const client = useLatestRef(useRekuest());
  const onReachedLive = useLatestRef(options?.onReachedLive);

  const [source] = React.useState(() =>
    createTravelSource({
      checkout: async (agent, request) => {
        if (!client.current) throw new Error("Rekuest is not connected.");
        if (request.revision) {
          // A revision restarts with every session of the agent: never one without the other.
          const { globalRevision, sessionId } = request.revision;
          const result = await client.current.query<
            CheckoutAgentRevisionQuery,
            CheckoutAgentRevisionQueryVariables
          >({
            query: CheckoutAgentRevisionDocument,
            variables: {
              agent,
              ...(globalRevision === null
                ? { timestamp: new Date(request.timestamp).toISOString() }
                : { globalRevision, sessionId }),
              forwardPatchCount: request.forwardPatchCount,
              backwardPatchCount: request.backwardPatchCount,
            },
            fetchPolicy: "no-cache",
          });
          return result.data.checkoutAgent;
        }
        const result = await client.current.query<CheckoutAgentQuery, CheckoutAgentQueryVariables>({
          query: CheckoutAgentDocument,
          variables: {
            agent,
            timestamp: new Date(request.timestamp).toISOString(),
            forwardPatchCount: request.forwardPatchCount,
            backwardPatchCount: request.backwardPatchCount,
          },
          // Every moment a slider passes would otherwise stay in the cache for good.
          fetchPolicy: "no-cache",
        });
        return result.data.checkoutAgent;
      },
      sessionEnd: async (_agent, sessionId) => {
        if (!client.current) throw new Error("Rekuest is not connected.");
        const result = await client.current.query<SessionBoundariesQuery, SessionBoundariesQueryVariables>({
          query: SessionBoundariesDocument,
          variables: { sessionId },
          // A session that is still running grows.
          fetchPolicy: "no-cache",
        });
        return result.data.sessionBoundaries?.endGlobalRevision ?? null;
      },
      onReachedLive: () => onReachedLive.current?.(),
    }),
  );

  React.useEffect(() => () => source.stop(), [source]);

  return source;
};
