import React, { useState } from "react";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { LokTeam } from "../linker";
import { withLok } from "../lok/LokContext";
import { useMyGroupsQuery } from "../lok/api/graphql";
export type IMyRepresentationsProps = {};

const limit = 20;

const MyTeams: React.FC<IMyRepresentationsProps> = () => {
  const [offset, setOffset] = useState(0);

  const { data } = withLok(useMyGroupsQuery)({
    //pollInterval: 1000,
  });

  return (
    <>
      <LokTeam.ListLink>
        <SectionTitle>My Teams</SectionTitle>
      </LokTeam.ListLink>
      {data?.mygroups?.filter(notEmpty).map((group, index) => (
        <LokTeam.Smart
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
            <LokTeam.DetailLink
              className={"font-bold text-md mb-2 cursor-pointer "}
              object={group?.id}
            >
              <span className="truncate">{group?.name}</span>
            </LokTeam.DetailLink>
            <p className="text-white-700 text-base"></p>
          </div>
        </LokTeam.Smart>
      ))}
    </>
  );
};

export { MyTeams };
