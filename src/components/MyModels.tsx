import React, { useEffect, useState } from "react";
import { BsCaretLeft, BsCaretRight } from "react-icons/bs";
import { notEmpty } from "../floating/utils";
import { useDialog } from "../layout/dialog/DialogProvider";
import { Model } from "../linker";
import { useDeleteModelMate } from "../mates/model/useDeleteModelMate";
import { useMyModelsQuery } from "../mikro/api/graphql";
import { ModelCard } from "../mikro/components/cards/ModelCard";
import { withMikro } from "../mikro/MikroContext";
import { DataHomeFilterParams } from "../pages/data/Home";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";

export type IMyExperimentsProps = {};

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

  const deleteModelMate = useDeleteModelMate();

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
            <ModelCard key={index} model={m} mates={[deleteModelMate(m)]} />
          ))}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyModels };
