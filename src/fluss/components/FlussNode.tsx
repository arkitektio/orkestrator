import React, { useState, useEffect } from "react";
import { DetailNodeFragment } from "../../arkitekt/api/graphql";
import { ShowRiver } from "../../floating/show/ShowRiver";
import { useFlowQuery } from "../api/graphql";
import { withFluss } from "../fluss";

export interface FlussNodeProps {
  node: DetailNodeFragment;
}

export const FlussNode: React.FC<FlussNodeProps> = (props) => {
  if (!props.node.meta.flow) return <></>;

  let { data, refetch } = withFluss(useFlowQuery)({
    variables: { id: props.node.meta.flow },
    nextFetchPolicy: "network-only",
  });

  return <>{data?.flow && <ShowRiver flow={data?.flow} />}</>;
};
