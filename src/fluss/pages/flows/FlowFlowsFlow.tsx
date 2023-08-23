import React, { useEffect } from "react";
import { useParams } from "react-router";
import { ShowRiver } from "../../../floating/show/ShowRiver";
import { useFlowQuery } from "../../../fluss/api/graphql";
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
