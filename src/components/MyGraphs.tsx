import React, { useEffect, useState } from "react";
import { ListRender } from "../layout/SectionTitle";
import { useDialog } from "../layout/dialog/DialogProvider";
import { Graph } from "../linker";
import { useDeleteGraphMate } from "../mates/graph/useDeleteGraphMate";
import { withMikro } from "../mikro/MikroContext";
import { useMyGraphsQuery } from "../mikro/api/graphql";
import { GraphCard } from "../mikro/components/cards/GraphCard";
import { DataHomeFilterParams } from "../pages/data/Home";

export type IMyExperimentsProps = {};

const limit = 20;

const MyGraphs: React.FC<IMyExperimentsProps & DataHomeFilterParams> = ({
  createdDay,
}) => {
  const variables = { limit: 20, offset: 0, createdDay: createdDay };

  const { data, error, subscribeToMore, refetch } = withMikro(useMyGraphsQuery)(
    {
      variables,
      //pollInterval: 1000,
    }
  );

  const deleteGraphMate = useDeleteGraphMate();

  const { ask } = useDialog();
  const [show, setShow] = useState(false);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch({ limit: 20, offset: offset });
  }, [offset, limit]);

  if (error) return <div>{error.message}</div>;

  return (
    <ListRender
      array={data?.mygraphs}
      title={<Graph.ListLink className="flex-0">Contexts</Graph.ListLink>}
      refetch={refetch}
    >
      {(ex, index) => (
        <GraphCard key={index} graph={ex} mates={[deleteGraphMate(ex)]} />
      )}
    </ListRender>
  );
};

export { MyGraphs };
