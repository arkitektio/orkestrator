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
import { Context, Experiment } from "../linker";
import { useDeleteContextMate } from "../mates/context/useDeleteContextMate";
import {
  ListContextFragment,
  ListExperimentFragment,
  MyExperimentsEventDocument,
  MyExperimentsEventSubscriptionResult,
  MyExperimentsQuery,
  useDeleteContextMutation,
  useDeleteExperimentMutation,
  useMyContextsQuery,
  useMyExperimentsQuery,
} from "../mikro/api/graphql";
import { ContextCard } from "../mikro/components/cards/ContextCard";
import { CreateContextModal } from "../mikro/components/dialogs/CreateContextModal";
import { CreateExperimentModal } from "../mikro/components/dialogs/CreateExperimentModal";
import useDeleteContext from "../mikro/hooks/useDeleteContext";
import { withDelete } from "../mikro/hooks/withDelete";
import { withMikro } from "../mikro/MikroContext";
import { DataHomeFilterParams } from "../pages/data/Home";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

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
        <Experiment.ListLink className="flex-0">Contexts</Experiment.ListLink>
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
          {data?.mycontexts && data?.mycontexts.length == limit && (
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
        {data?.mycontexts
          ?.slice(0, limit)
          .filter(notEmpty)
          .map((ex, index) => (
            <ContextCard
              key={index}
              context={ex}
              mates={[deleteContexMate(ex)]}
            />
          ))}
        <ActionButton
          label="Create new Experiment"
          description="Create a new experiment"
          className="text-white "
          onAction={async () => {
            await ask(CreateContextModal, {});
            await refetch();
          }}
        >
          <BsPlusCircle />
        </ActionButton>
      </ResponsiveContainerGrid>
      <CreateExperimentModal show={show} setShow={setShow} />
    </div>
  );
};

export { MyContexts };
