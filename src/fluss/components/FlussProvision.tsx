import React from "react";
import { TraceRiver } from "../../floating/trace/TraceRiver";
import { DetailProvisionFragment } from "../../rekuest/api/graphql";
import { useDetailConditionQuery } from "../api/graphql";
import { withFluss } from "../fluss";

export interface FlussProvisionProps {
  provision: DetailProvisionFragment;
}

export const FlussProvision: React.FC<FlussProvisionProps> = ({
  provision,
}) => {
  const { data } = withFluss(useDetailConditionQuery)({
    variables: { provision: provision.id },
  });

  return data?.condition?.id ? (
    <>
      <TraceRiver id={data.condition.id} />
    </>
  ) : (
    <>Loading</>
  );
};
