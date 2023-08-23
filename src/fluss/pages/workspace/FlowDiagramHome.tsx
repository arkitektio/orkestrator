import React from "react";
import { useParams } from "react-router";
import { EditRiver } from "../../../floating/edit/Edit";
import { noTypename } from "../../../floating/utils";
import {
  GraphInput,
  SearchFlowsDocument,
  SearchFlowsQuery,
  useUpdateFlowMutation,
  useWorkspaceQuery,
} from "../../../fluss/api/graphql";
import { withFluss } from "../../../fluss/fluss";

export interface FlowDiagramHomeProps {}

export const FlowDiagramHome: React.FC<FlowDiagramHomeProps> = (props) => {
  let { diagram } = useParams<{ diagram: string }>();

  if (!diagram) return <></>;

  let { data } = withFluss(useWorkspaceQuery)({
    variables: { id: diagram },
  });

  let [saveFlow] = withFluss(useUpdateFlowMutation)({
    update: (cache, { data }) => {
      let x = cache.readQuery<SearchFlowsQuery>({
        variables: { id: diagram },
        query: SearchFlowsDocument,
      });
      if (data?.updateworkspace?.latestFlow) {
        cache.writeQuery({
          query: SearchFlowsDocument,
          variables: { id: diagram },
          data: {
            flows:
              x?.flows && x.flows.concat([data?.updateworkspace?.latestFlow]),
          },
        });
      }
    },
  });

  if (!data?.workspace?.latestFlow?.id) return <>Loading</>;

  const saveDiagram = async (graph_input: GraphInput) => {
    if (!data?.workspace?.id) return;

    let variables = {
      id: data?.workspace?.id,
      graph: graph_input,
    };

    console.log("Sending variables", variables);

    await saveFlow({ variables: noTypename(variables) });
  };

  return (
    <>
      <EditRiver flow={data?.workspace?.latestFlow} onFlowSave={saveDiagram} />
    </>
  );
};
