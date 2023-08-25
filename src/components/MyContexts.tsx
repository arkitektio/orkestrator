import React from "react";
import { ListRender } from "../layout/SectionTitle";
import { MikroContext } from "../linker";
import { useDeleteContextMate } from "../mates/context/useDeleteContextMate";
import { withMikro } from "../mikro/MikroContext";
import { useMyContextsQuery } from "../mikro/api/graphql";
import { ContextCard } from "../mikro/components/cards/ContextCard";
import { DataHomeFilterParams } from "../pages/data/Home";

export type IMyExperimentsProps = {};

const limit = 20;

const MyContexts: React.FC<IMyExperimentsProps & DataHomeFilterParams> = ({
  createdDay,
}) => {
  const variables = { limit: 20, offset: 0, createdDay: createdDay };

  const { data, error, subscribeToMore, refetch } = withMikro(
    useMyContextsQuery
  )({
    variables,
    //pollInterval: 1000,
  });

  const deleteContexMate = useDeleteContextMate();

  return (
    <ListRender
      array={data?.mycontexts}
      title={
        <MikroContext.ListLink className="flex-0">
          Contexts
        </MikroContext.ListLink>
      }
      refetch={refetch}
    >
      {(ex, index) => (
        <ContextCard key={index} context={ex} mates={[deleteContexMate(ex)]} />
      )}
    </ListRender>
  );
};

export { MyContexts };
