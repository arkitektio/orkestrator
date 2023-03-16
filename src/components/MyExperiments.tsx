import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect, useState } from "react";
import { BsCaretLeft, BsCaretRight, BsPlusCircle } from "react-icons/bs";
import { notEmpty } from "../floating/utils";
import { ActionButton } from "../layout/ActionButton";
import { SectionTitle } from "../layout/SectionTitle";
import { Experiment } from "../linker";
import { useDeleteExperimentMate } from "../mates/experiment/useDeleteExperimentMate";
import {
  ListExperimentFragment,
  MyExperimentsEventDocument,
  MyExperimentsEventSubscriptionResult,
  MyExperimentsQuery,
  useMyExperimentsQuery,
} from "../mikro/api/graphql";
import { ExperimentCard } from "../mikro/components/cards/ExperimentCard";
import { CreateExperimentModal } from "../mikro/components/dialogs/CreateExperimentModal";
import { withMikro } from "../mikro/MikroContext";
import { DataHomeFilterParams } from "../pages/data/Home";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";

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
    <>
      <SectionTitle>
        <div className="flex flex-row">
          <Experiment.ListLink className="flex-0">
            Experiments
          </Experiment.ListLink>
          <div className="flex-grow"></div>
          <div className="flex-0">
            {offset != 0 && (
              <button
                type="button"
                className="p-1 text-gray-600 rounded"
                onClick={() => setOffset(offset - limit)}
              >
                {" "}
                <BsCaretLeft />{" "}
              </button>
            )}
            {experiments?.myexperiments &&
              experiments?.myexperiments.length == limit && (
                <button
                  type="button"
                  className="p-1 text-gray-600 rounded"
                  onClick={() => setOffset(offset + limit)}
                >
                  {" "}
                  <BsCaretRight />{" "}
                </button>
              )}
          </div>
        </div>
      </SectionTitle>

      <ResponsiveContainerGrid>
        {experiments?.myexperiments
          ?.slice(0, limit)
          .filter(notEmpty)
          .map((ex, index) => (
            <ExperimentCard
              key={index}
              experiment={ex}
              mates={[deleteExperimentMate(ex)]}
            />
          ))}
        <ActionButton
          label="Create new Experiment"
          description="Create a new experiment"
          className="text-white "
          onAction={async () => setShow((show) => true)}
        >
          <BsPlusCircle />
        </ActionButton>
      </ResponsiveContainerGrid>
      <CreateExperimentModal show={show} setShow={setShow} />
    </>
  );
};

export { MyExperiments };
