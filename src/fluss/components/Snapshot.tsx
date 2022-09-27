import React from "react";
import { useNavigate } from "react-router";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { Snapshot } from "../../linker";
import { useDetailRunQuery, useDetailSnapshotQuery } from "../api/graphql";
import { withFluss } from "../fluss";

export type ISampleProps = {
  id: string;
};

const SnapshotScreen: React.FC<ISampleProps> = ({ id }) => {
  const { data } = withFluss(useDetailSnapshotQuery)({
    variables: { id: id },
  });

  const navigate = useNavigate();
  return (
    <div className="p-5 dark:text-white">
      <div className="text-xl font-light">sss{data?.snapshot?.id}</div>
      <div className="text-md mt-2"></div>
      {data?.snapshot?.run && (
        <Snapshot.DetailLink
          className="text-xl font-light cursor-pointer mb-1"
          object={data?.snapshot?.run?.id}
        >
          Open Run
        </Snapshot.DetailLink>
      )}
      <ResponsiveGrid>{JSON.stringify(data?.snapshot?.events)}</ResponsiveGrid>
    </div>
  );
};

export { SnapshotScreen as Snapshot };
