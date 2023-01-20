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
import { useDialog } from "../layout/dialog/DialogProvider";
import { Context, Experiment } from "../linker";
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
import { CreateContextModal } from "../mikro/components/dialogs/CreateContextModal";
import { CreateExperimentModal } from "../mikro/components/dialogs/CreateExperimentModal";
import { withMikro } from "../mikro/MikroContext";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyExperimentsProps = {};

const ContextCard: React.FC<{
  context: Maybe<ListContextFragment>;
}> = ({ context }) => {
  const onDrop = (...args: any) => {
    console.log(args);
  };

  const { confirm } = useConfirm();

  const [deleteContext, res] = withMikro(useDeleteContextMutation)();

  if (!context?.id) return <></>;

  return (
    <Context.Smart
      object={context?.id}
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

              await deleteContext({
                variables: { id: context.id },
              });
            },
            label: <BsTrash />,
            description: "Delete",
          },
        ];
      }}
    >
      <div className="px-1 py-2 truncate">
        <Context.DetailLink
          className="flex-grow cursor-pointer font-semibold"
          object={context.id}
        >
          {context?.name}
        </Context.DetailLink>
      </div>
    </Context.Smart>
  );
};

const limit = 20;

const MyContexts: React.FC<IMyExperimentsProps> = () => {
  const { data, error, subscribeToMore, refetch } = withMikro(
    useMyContextsQuery
  )({
    //pollInterval: 1000,
  });

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
        <Experiment.ListLink className="flex-0">
          Latest Contexts
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
          {data?.mycontexts && data?.mycontexts.length == limit && (
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
        {data?.mycontexts?.slice(0, limit).map((ex, index) => (
          <ContextCard key={index} context={ex} />
        ))}
        <ActionButton
          label="Create new Experiment"
          description="Create a new experiment"
          className="text-white "
          onAction={async () => {
            await ask(CreateContextModal, {});
          }}
        >
          <BsPlusCircle />
        </ActionButton>
      </ResponsiveGrid>
      <CreateExperimentModal show={show} setShow={setShow} />
    </div>
  );
};

export { MyContexts };
