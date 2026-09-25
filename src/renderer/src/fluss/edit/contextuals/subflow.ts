import { useRekuest } from "@/app/Arkitekt";
import { rekuestActionToMatchingNode } from "@/fluss/plugins/rekuest";
import { FlowNode } from "@/fluss/types";
import { ConstantActionDocument, ConstantActionQuery } from "@/rekuest/api/graphql";
import type { XYPosition } from "@xyflow/react";
import { useCallback } from "react";
import { wrapInSubflow } from "../store/graph";

export type FetchedAction = {
  action: ConstantActionQuery["action"];
  node: FlowNode;
};

/**
 * Resolves a rekuest action id into a flow node. `wrapped` additionally
 * returns a fresh agent-subflow wrapper (positioned at `position`) with the
 * node parented inside it.
 */
export const useActionNodeFactory = () => {
  const client = useRekuest();

  const fetchAction = useCallback(
    async (actionId: string, position: XYPosition): Promise<FetchedAction | null> => {
      if (!client) return null;
      const { data } = await client.query<ConstantActionQuery>({
        query: ConstantActionDocument,
        variables: { id: actionId },
      });
      if (!data?.action) return null;
      return { action: data.action, node: rekuestActionToMatchingNode(data.action, position) };
    },
    [client],
  );

  const fetchWrapped = useCallback(
    async (actionId: string, position: XYPosition) => {
      const fetched = await fetchAction(actionId, position);
      if (!fetched) return null;
      const { parent, child } = wrapInSubflow(fetched.node, {
        appFilter: fetched.action.app?.identifier,
        position,
      });
      return { ...fetched, parent, child };
    },
    [fetchAction],
  );

  return { fetchAction, fetchWrapped };
};
