import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect, useState } from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { ActionButton } from "../layout/ActionButton";
import { useDialog } from "../layout/dialog/DialogProvider";
import { Context, Experiment, Model } from "../linker";
import {
  ListContextFragment,
  ListExperimentFragment,
  ListModelFragment,
  MyExperimentsEventDocument,
  MyExperimentsEventSubscriptionResult,
  MyExperimentsQuery,
  useDeleteContextMutation,
  useDeleteExperimentMutation,
  useDeleteModelMutation,
  useMyContextsQuery,
  useMyExperimentsQuery,
  useMyModelsQuery,
} from "../mikro/api/graphql";
import { CreateContextModal } from "../mikro/components/dialogs/CreateContextModal";
import { CreateExperimentModal } from "../mikro/components/dialogs/CreateExperimentModal";
import { useDeleteModel } from "../mikro/hooks/useDeleteModel";
import { withDelete } from "../mikro/hooks/withDelete";
import { withMikro } from "../mikro/MikroContext";
import { DataHomeFilterParams } from "../pages/data/Home";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyExperimentsProps = {};

const ModelCard: React.FC<{
  model: ListModelFragment;
}> = ({ model }) => {
  const onDrop = (...args: any) => {
    console.log(args);
  };

  const { confirm } = useConfirm();

  const [deleteModel] = withMikro(withDelete(useDeleteModelMutation, model))();

  if (!model?.id) return <></>;

  return (
    <Model.Smart
      object={model?.id}
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

              await deleteModel({ variables: { id: model.id } });
            },
            label: <BsTrash />,
            description: "Delete",
          },
        ];
      }}
    >
      <div className="px-1 py-2 truncate">
        <Model.DetailLink
          className="flex-grow cursor-pointer font-semibold"
          object={model.id}
        >
          {model?.name}
        </Model.DetailLink>
      </div>
    </Model.Smart>
  );
};

const limit = 20;

const MyModels: React.FC<IMyExperimentsProps & DataHomeFilterParams> = ({
  createdDay,
}) => {
  const { data, error, subscribeToMore, refetch } = withMikro(useMyModelsQuery)(
    {
      variables: { limit: 20, offset: 0, createdDay: createdDay },
    }
  );

  const { ask } = useDialog();
  const [show, setShow] = useState(false);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch({ limit: 20, offset: offset });
  }, [offset, limit]);

  if (error) return <div>{error.message}</div>;

  return (
    <div>
      <div className="font-light text-xl flex mr-2 dark:text-white">
        <Model.ListLink className="flex-0">Models</Model.ListLink>
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
          {data?.mymodels && data?.mymodels.length == limit && (
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
      <ResponsiveContainerGrid>
        {data?.mymodels
          ?.slice(0, limit)
          .filter(notEmpty)
          .map((m, index) => (
            <ModelCard key={index} model={m} />
          ))}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyModels };
