import React, { useState, useEffect } from "react";
import { DetailNodeFragment } from "../../rekuest/api/graphql";
import { ShowRiver } from "../../floating/show/ShowRiver";
import { useFlowQuery } from "../api/graphql";
import { withFluss } from "../fluss";

export interface FlussNodeProps {
  flow: string;
}

export const FlussTemplate: React.FC<FlussNodeProps> = (props) => {
  let { data, refetch } = withFluss(useFlowQuery)({
    variables: { id: props.flow },
    nextFetchPolicy: "network-only",
  });

  return (
    <>
      {data?.flow ? (
        <ShowRiver flow={data?.flow} />
      ) : (
        "Could not find approprate flow"
      )}
    </>
  );
};
