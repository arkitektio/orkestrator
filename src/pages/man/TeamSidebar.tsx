import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { notEmpty } from "../../floating/utils";
import { Team } from "../../linker";
import { useMyGroupsQuery } from "../../man/api/graphql";
import { withMan } from "../../man/man";
export type IMyRepresentationsProps = {};

const limit = 20;

const TeamSidebar: React.FC<IMyRepresentationsProps> = () => {
  const [filter, setFilter] = React.useState<{ search?: string }>({
    search: "",
  });
  const { data, refetch } = withMan(useMyGroupsQuery)({
    //pollInterval: 1000,
  });

  useEffect(() => {
    refetch(filter);
  }, [filter, fetch]);

  return (
    <div className="flex flex-col gap-2  pt-6 h-full">
      <div className="flex-grow p-5 dark:text-slate-50">
        <div className="mt-2">
          {data?.mygroups?.filter(notEmpty).map((group, index) => (
            <div
              key={index}
              className="rounded shadow-xl group border border-gray-500 mt-2 dark:text-slate-200 "
            >
              <div className="px-6 py-4">
                <div className="flex">
                  <span className="flex-grow cursor-pointer font-semibold text-xs truncate">
                    {group?.name || "No Sample"}
                  </span>
                </div>
                <Team.DetailLink
                  className={({ isActive }) =>
                    "font-bold text-md mb-2 cursor-pointer " +
                    (isActive ? "text-blue-500" : "")
                  }
                  object={group.id}
                >
                  <span className="truncate">{group?.name}</span>
                </Team.DetailLink>
                <p className="text-white-700 text-base"></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { TeamSidebar };
