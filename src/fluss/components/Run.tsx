import React from "react";
import { TrackRiver } from "../../floating/track/TrackRiver";
import {
  useDetailRunQuery
} from "../api/graphql";
import { withFluss } from "../fluss";
import "./run.css";
export type RunProps = {
  id: string;
};

const Run: React.FC<RunProps> = ({ id }) => {
  const { data, refetch } = withFluss(useDetailRunQuery)({
    variables: { id: id },
  });

  return <>{data?.run?.id && <TrackRiver id={data?.run.id} />}</>;
};

export { Run };
