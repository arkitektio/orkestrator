import React, { useState } from "react";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Team } from "../linker";
import { useMyGroupsQuery } from "../man/api/graphql";
import { withMan } from "../man/context";
import { useConfirm } from "./confirmer/confirmer-context";
export type IMyRepresentationsProps = {};

const limit = 20;

const MyTeams: React.FC<IMyRepresentationsProps> = () => {
  const [offset, setOffset] = useState(0);

  const { data } = withMan(useMyGroupsQuery)({
    //pollInterval: 1000,
  });

  return (
    <>
      <Team.ListLink>
        <SectionTitle>My Teams</SectionTitle>
      </Team.ListLink>
      {data?.mygroups?.filter(notEmpty).map((group, index) => (
        <Team.Smart
          object={group.id}
          key={index}
          className="rounded shadow-xl group border border-gray-500 mt-2 text-white"
        >
          <div className="px-6 py-4">
            <div className="flex">
              <span className="flex-grow cursor-pointer font-semibold text-xs truncate">
                {group?.name || "No Sample"}
              </span>
            </div>
            <Team.DetailLink
              className={"font-bold text-md mb-2 cursor-pointer "}
              object={group?.id}
            >
              <span className="truncate">{group?.name}</span>
            </Team.DetailLink>
            <p className="text-white-700 text-base"></p>
          </div>
        </Team.Smart>
      ))}
    </>
  );
};

export { MyTeams };
