import React, { useEffect, useState } from "react";
import { BsCaretLeft, BsCaretRight } from "react-icons/bs";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { Stage } from "../../linker";
import { DataHomeFilterParams } from "../../pages/data/Home";
import { withMikro } from "../MikroContext";
import { useMyErasQuery } from "../api/graphql";
import { EraCard } from "./cards/EraCard";

export type MyAcquisitionsProps = {};

const MyEras: React.FC<MyAcquisitionsProps & DataHomeFilterParams> = ({
  createdDay,
  limit,
}) => {
  const { data, error, subscribeToMore, refetch } = withMikro(useMyErasQuery)({
    variables: { limit: limit, offset: 0, createdDay: createdDay },
  });

  const [show, setShow] = useState(false);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch({ limit: limit, offset: offset });
  }, [offset, limit]);

  if (error) return <div>{error.message}</div>;

  return (
    <div>
      {data?.myeras && data?.myeras.length > 0 && <><div className="font-light text-xl flex mr-2 dark:text-white">
        <Stage.ListLink className="flex-0">Eras</Stage.ListLink>
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
          {data?.myeras && data?.myeras.length == limit && (
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
        {data?.myeras
          ?.slice(0, limit)
          .filter(notEmpty)
          .map((e, index) => (
            <EraCard key={index} era={e} mates={[]} />
          ))}
      </ResponsiveContainerGrid></>
}
    </div>
  );
};

export { MyEras };
