import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect, useState } from "react";
import { ListRender } from "../layout/SectionTitle";
import { MikroExperiment } from "../linker";
import { useDeleteExperimentMate } from "../mates/experiment/useDeleteExperimentMate";
import { withMikro } from "../mikro/MikroContext";
import {
  MyExperimentsEventDocument,
  MyExperimentsEventSubscriptionResult,
  MyExperimentsQuery,
  useMyExperimentsQuery,
} from "../mikro/api/graphql";
import { ExperimentCard } from "../mikro/components/cards/ExperimentCard";
import { DataHomeFilterParams } from "../mikro/pages/Home";

export type IMyExperimentsProps = {
  subscribe?: Maybe<boolean>;
} & DataHomeFilterParams;

const MyExperiments: React.FC<IMyExperimentsProps> = ({
  limit,
  createdDay,
  subscribe,
}) => {
  const variables = { limit: limit, offset: 0, createdDay: createdDay };

  const {
    data: experiments,
    error,
    subscribeToMore,
    refetch,
  } = withMikro(useMyExperimentsQuery)({
    variables: variables,
  });

  const deleteExperimentMate = useDeleteExperimentMate();

  const [show, setShow] = useState(false);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch({ limit: limit, offset: offset });
  }, [offset, limit]);

  useEffect(() => {
    if (!subscribe) return;

    console.log("Subscribing to My Experiments");
    const unsubscribe = subscribeToMore({
      document: MyExperimentsEventDocument,
      variables: {},
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Experiment", subscriptionData);
        var data = subscriptionData as MyExperimentsEventSubscriptionResult;
        let action = data.data?.myExperiments;
        let newelements;
        // Try to update
        if (action?.update) {
          let updated_res = action.update;
          newelements = prev.myexperiments?.map((item: any) =>
            item.id === updated_res?.id
              ? { ...item, data: { ...item.data, ...updated_res } }
              : item
          );
        }

        if (action?.deleted) {
          let ended_res = action.deleted;
          newelements = prev.myexperiments
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.create) {
          let updated_res = action.create;
          newelements = prev.myexperiments?.concat(updated_res);
        }

        console.log("Received Experiment", subscriptionData);
        return {
          ...prev,
          myexperiments: newelements,
        } as MyExperimentsQuery;
      },
    });
    return () => unsubscribe();
  }, [subscribeToMore, subscribe]);

  if (error) return <div>{error.message}</div>;

  return (
    <ListRender
      array={experiments?.myexperiments}
      title={
        <MikroExperiment.ListLink className="flex-0">
          Experiments
        </MikroExperiment.ListLink>
      }
      refetch={refetch}
    >
      {(ex, index) => (
        <ExperimentCard
          key={index}
          experiment={ex}
          mates={[deleteExperimentMate(ex)]}
        />
      )}
    </ListRender>
  );
};

export { MyExperiments };
