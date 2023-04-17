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
import { SectionTitle } from "../layout/SectionTitle";
import { Dataset, Experiment } from "../linker";
import { useDeleteDatesetMate } from "../mates/dataset/useDeleteDatasetMate";
import {
  ListExperimentFragment,
  MyExperimentsEventDocument,
  MyExperimentsEventSubscriptionResult,
  MyExperimentsQuery,
  useDeleteExperimentMutation,
  useMyDatasetsQuery,
  useMyExperimentsQuery,
} from "../mikro/api/graphql";
import { DatasetCard } from "../mikro/components/cards/DatasetCard";
import { CreateDatasetModal } from "../mikro/components/dialogs/CreateDatasetModal";
import { CreateExperimentModal } from "../mikro/components/dialogs/CreateExperimentModal";
import { withMikro } from "../mikro/MikroContext";
import { DataHomeFilterParams } from "../pages/data/Home";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyExperimentsProps = {
  subscribe?: Maybe<boolean>;
} & DataHomeFilterParams;

const MyDatasets: React.FC<IMyExperimentsProps> = ({
  limit,
  createdDay,
  subscribe,
}) => {
  const variables = { limit: limit, offset: 0, createdDay: createdDay };

  const { data, error, subscribeToMore, refetch } = withMikro(
    useMyDatasetsQuery
  )({
    variables: variables,
  });

  const [show, setShow] = useState(false);

  const [offset, setOffset] = useState(0);

  const { ask } = useDialog();

  const deleteDatasetMate = useDeleteDatesetMate();

  useEffect(() => {
    refetch({ limit: limit, offset: offset });
  }, [offset, limit]);

  if (error) return <div>{error.message}</div>;

  return (
    <>
      <SectionTitle>
        <div className="flex flex-row">
          <Dataset.ListLink className="flex-0">Datasets</Dataset.ListLink>
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
            {data?.mydatasets && data?.mydatasets.length == limit && (
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
        {data?.mydatasets
          ?.slice(0, limit)
          .filter(notEmpty)
          .map((ex, index) => (
            <DatasetCard
              key={index}
              dataset={ex}
              mates={[deleteDatasetMate(ex)]}
            />
          ))}
        <ActionButton
          label="Create new Dataset"
          description="Create a new Dataset"
          className="text-white "
          onAction={async () => {
            console.log("create dataset", "LOOOOLK");

            await ask(CreateDatasetModal, {});
            await refetch();
          }}
        >
          <BsPlusCircle />
        </ActionButton>
      </ResponsiveContainerGrid>
      <CreateExperimentModal show={show} setShow={setShow} />
    </>
  );
};

export { MyDatasets };
