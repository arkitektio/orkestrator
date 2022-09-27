import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { EditRiver } from "../../../floating/edit/Edit";
import { ShowRiver } from "../../../floating/show/ShowRiver";
import { noTypename } from "../../../floating/utils";
import {
  DiagramDocument,
  GraphInput,
  SearchFlowsDocument,
  SearchFlowsQuery,
  useDiagramQuery,
  useFlowQuery,
  useUpdateFlowMutation,
} from "../../../fluss/api/graphql";
import { withFluss } from "../../../fluss/fluss";

export interface FlowDiagramHomeProps {}

export const FlowFlowsFlow: React.FC<FlowDiagramHomeProps> = (props) => {
  let { flow } = useParams<{ flow: string }>();

  if (!flow) return <></>;

  let { data, refetch } = withFluss(useFlowQuery)({
    variables: { id: flow },
    nextFetchPolicy: "network-only",
  });

  useEffect(() => {
    refetch({ id: flow });
  }, [flow]);

  return <>{data?.flow && <ShowRiver flow={data?.flow} />}</>;
};
