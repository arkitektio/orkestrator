import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { EditRiver } from "../../../floating/edit/Edit";
import { noTypename } from "../../../floating/utils";
import {
  DiagramDocument,
  GraphInput,
  SearchFlowsDocument,
  SearchFlowsQuery,
  useDiagramQuery,
  useUpdateFlowMutation,
} from "../../../fluss/api/graphql";
import { withFluss } from "../../../fluss/fluss";

export interface FlowDiagramHomeProps {}

export const FlowDiagramHome: React.FC<FlowDiagramHomeProps> = (props) => {
  let { diagram } = useParams<{ diagram: string }>();

  if (!diagram) return <></>;

  let { data } = withFluss(useDiagramQuery)({
    variables: { id: diagram },
  });

  let [saveFlow] = withFluss(useUpdateFlowMutation)({
    update: (cache, { data }) => {
      let x = cache.readQuery<SearchFlowsQuery>({
        variables: { id: diagram },
        query: SearchFlowsDocument,
      });
      if (data?.updatediagram?.latestFlow) {
        cache.writeQuery({
          query: SearchFlowsDocument,
          variables: { id: diagram },
          data: {
            flows:
              x?.flows && x.flows.concat([data?.updatediagram?.latestFlow]),
          },
        });
      }
    },
  });

  if (!data?.diagram?.latestFlow?.id) return <>Loading</>;

  const saveDiagram = async (graph_input: GraphInput) => {
    if (!data?.diagram?.id) return;

    let variables = {
      id: data?.diagram?.id,
      graph: graph_input,
    };

    console.log("Sending variables", variables);

    await saveFlow({ variables: noTypename(variables) });
  };

  return (
    <>
      <EditRiver flow={data?.diagram?.latestFlow} onFlowSave={saveDiagram} />
    </>
  );
};
