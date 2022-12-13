import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect, useState } from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { ActionButton } from "../../layout/ActionButton";
import { Stage } from "../../linker";
import { useMyStagesQuery } from "../api/graphql";
import { withMikro } from "../MikroContext";
import { StageCard } from "./cards/StageCard";

export type MyAcquisitionsProps = {};

const limit = 20;

const MyStages: React.FC<MyAcquisitionsProps> = () => {
  const { data, error, subscribeToMore, refetch } = withMikro(useMyStagesQuery)(
    {
      //pollInterval: 1000,
    }
  );

  const [show, setShow] = useState(false);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch({ limit: 20, offset: offset });
  }, [offset, limit]);

  if (error) return <div>{error.message}</div>;

  return (
    <div>
      <div className="font-light text-xl flex mr-2 dark:text-white">
        <Stage.ListLink className="flex-0">Latest Stages</Stage.ListLink>
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
          {data?.mystages && data?.mystages.length == limit && (
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
      <ResponsiveContainerGrid>
        {data?.mystages
          ?.slice(0, limit)
          .filter(notEmpty)
          .map((s, index) => (
            <StageCard key={index} stage={s} />
          ))}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyStages };
