import React from "react";
import { useMyRunsQuery } from "../fluss/api/graphql";
import { RunCard } from "../fluss/components/cards/RunCard";
import { withFluss } from "../fluss/fluss";
import { ListRender } from "../layout/SectionTitle";
import { Run } from "../linker";
import { useDeleteRunMate } from "../mates/run/useDeleteRunMate";
import { usePinRunMate } from "../mates/run/usePinRunMate";
import { FlowHomeFilterParams } from "../pages/flows/FlowHome";
import { useConfirm } from "./confirmer/confirmer-context";
export type IMyGraphsProps = {} & FlowHomeFilterParams;

const MyRuns: React.FC<IMyGraphsProps> = ({ limit, createdDay }) => {
  const { data, error, loading, refetch } = withFluss(useMyRunsQuery)({
    variables: { limit: limit, offset: 0, createdDay: createdDay },
  });

  const deleteRunMate = useDeleteRunMate();
  const pinRunMate = usePinRunMate();
  const { confirm } = useConfirm();

  return (
    <ListRender
      array={data?.myruns}
      loading={loading}
      title={<Run.ListLink className="flex-0">Datasets</Run.ListLink>}
      refetch={refetch}
    >
      {(s, index) => (
        <RunCard
          run={s}
          key={index}
          mates={[deleteRunMate(s), pinRunMate(s)]}
        />
      )}
    </ListRender>
  );
};

export { MyRuns };
