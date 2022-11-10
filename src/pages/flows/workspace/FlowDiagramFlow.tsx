import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { EditRiver } from "../../../floating/edit/Edit";
import { noTypename } from "../../../floating/utils";
import {
  GraphInput,
  SearchFlowsDocument,
  SearchFlowsQuery,
  useFlowQuery,
  useUpdateFlowMutation,
} from "../../../fluss/api/graphql";
import { withFluss } from "../../../fluss/fluss";

export interface FlowDiagramHomeProps {}

export const FlowDiagramFlow: React.FC<FlowDiagramHomeProps> = (props) => {
  let { diagram, flow } = useParams<{ diagram: string; flow: string }>();

  if (!flow && !diagram) return <></>;

  let { data, refetch } = withFluss(useFlowQuery)({
    variables: { id: flow },
    nextFetchPolicy: "network-only",
  });

  useEffect(() => {
    refetch({ id: flow });
  }, [flow]);

  const navigate = useNavigate();

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

  const saveDiagram = async (graph_input: GraphInput) => {
    if (!diagram) return;

    let variables = {
      id: diagram,
      graph: graph_input,
    };

    console.log("Sending variables", variables);

    let flow = await saveFlow({ variables: noTypename(variables) });
    navigate(
      `/diagrams/${diagram}/flows/${flow.data?.updatediagram?.latestFlow?.id}`
    );
  };

  return (
    <>
      {data?.flow && <EditRiver flow={data?.flow} onFlowSave={saveDiagram} />}
    </>
  );
};
