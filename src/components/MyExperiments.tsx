import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect, useState } from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { ActionButton } from "../layout/ActionButton";
import { Experiment } from "../linker";
import {
  ListExperimentFragment,
  MyExperimentsEventDocument,
  MyExperimentsEventSubscriptionResult,
  MyExperimentsQuery,
  useDeleteExperimentMutation,
  useMyExperimentsQuery,
} from "../mikro/api/graphql";
import { CreateExperimentModal } from "../mikro/components/dialogs/CreateExperimentModal";
import { withMikro } from "../mikro/mikro-types";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyExperimentsProps = {};

const ExperimentCard: React.FC<{
  experiment: Maybe<ListExperimentFragment>;
}> = ({ experiment }) => {
  const onDrop = (...args: any) => {
    console.log(args);
  };

  const { confirm } = useConfirm();

  let h = withMikro(useDeleteExperimentMutation);

  const [deleteExperiment, res] = h();

  if (!experiment?.id) return <></>;

  return (
    <Experiment.Smart
      object={experiment?.id}
      className={`bg-slate-700 text-white rounded shadow-md pl-3  group`}
      additionalMates={(accept, self) => {
        if (!self) return [];

        return [
          {
            accepts: [accept],
            action: async (self, drops) => {
              await confirm({
                message: "Do you really want to delete?",
                subtitle: "Deletion is irreversible!",
                confirmLabel: "Yes delete!",
              });

              await deleteExperiment({
                variables: { id: experiment.id },
              });
            },
            label: <BsTrash />,
            description: "Delete",
          },
        ];
      }}
    >
      <div className="px-1 py-2">
        <Experiment.DetailLink
          className="flex-grow cursor-pointer font-semibold truncate"
          object={experiment.id}
        >
          {experiment?.name}
        </Experiment.DetailLink>
      </div>
    </Experiment.Smart>
  );
};

const limit = 20;

const MyExperiments: React.FC<IMyExperimentsProps> = () => {
  const {
    data: experiments,
    error,
    subscribeToMore,
    refetch,
  } = withMikro(useMyExperimentsQuery)({
    //pollInterval: 1000,
  });

  const [show, setShow] = useState(false);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch({ limit: 20, offset: offset });
  }, [offset, limit]);

  useEffect(() => {
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
  }, [subscribeToMore]);

  if (error) return <div>{error.message}</div>;

  return (
    <div>
      <div className="font-light text-xl flex mr-2 dark:text-white">
        <Experiment.ListLink className="flex-0">
          Latest Experiments
        </Experiment.ListLink>
        <div className="flex-grow"></div>
        <div className="flex-0">
          {offset != 0 && (
            <button
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
                className="p-1 text-gray-600 rounded"
                onClick={() => setOffset(offset + limit)}
              >
                {" "}
                <BsCaretRight />{" "}
              </button>
            )}
        </div>
      </div>
      <ResponsiveGrid>
        {experiments?.myexperiments?.slice(0, limit).map((ex, index) => (
          <ExperimentCard key={index} experiment={ex} />
        ))}
        <ActionButton
          label="Create new Experiment"
          description="Create a new experiment"
          className="text-white "
          onAction={async () => setShow((show) => true)}
        >
          <BsPlusCircle />
        </ActionButton>
      </ResponsiveGrid>
      <CreateExperimentModal show={show} setShow={setShow} />
    </div>
  );
};

export { MyExperiments };
