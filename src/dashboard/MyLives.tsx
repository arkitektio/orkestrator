import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect, useState } from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { Link } from "react-router-dom";
import { ResponsiveContainerGrid } from "../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../floating/utils";
import { Stage } from "../linker";
import { useMyStagesQuery } from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";

export type MyAcquisitionsProps = {
  limit?: number;
};

const MyLives: React.FC<MyAcquisitionsProps> = ({ limit = 20 }) => {
  const { data, error, subscribeToMore, refetch } = withMikro(useMyStagesQuery)(
    {
      variables: { limit: limit, offset: 0 },
    }
  );

  const [show, setShow] = useState(false);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch({ limit: limit, offset: offset });
  }, [offset, limit]);

  if (error) return <div>{error.message}</div>;

  return (
    <div>
      <div className="font-light text-xl flex mr-2 dark:text-white">
        <Stage.ListLink className="flex-0">Stage</Stage.ListLink>
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
          {data?.mystages && data?.mystages.length == limit && (
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
        {data?.mystages
          ?.slice(0, limit)
          .filter(notEmpty)
          .map((s, index) => (
            <Stage.Smart object={s.id} mates={[]}>
              <Link to={`/user/mikro/lives/${s.id}`}>Open {s.name}</Link>
            </Stage.Smart>
          ))}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyLives };
