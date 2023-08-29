import React from "react";
import { BsCheckCircle, BsExclamationTriangle } from "react-icons/bs";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { RekuestProvision } from "../linker";
import { UserEmblem } from "../lok/components/UserEmblem";
import { withRekuest } from "../rekuest";
import { ProvisionStatus, useMyProvisionsQuery } from "../rekuest/api/graphql";
import { colorFromProvisionStatus } from "../rekuest/ui/utils";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyProvisionsProps = {};

const MyProvisions: React.FC<IMyProvisionsProps> = () => {
  const { data } = withRekuest(useMyProvisionsQuery)();
  const navigate = useNavigate();

  return (
    <>
      <RekuestProvision.ListLink>
        <span className="font-light text-xl dark:text-white">
          My Provisions
        </span>
      </RekuestProvision.ListLink>
      <ResponsiveGrid>
        {data?.myprovisions?.filter(notEmpty).map((prov, index) => (
          <RekuestProvision.Smart
            key={index}
            className={`max-w-sm rounded border relative p-2 shadow-md ${colorFromProvisionStatus(
              prov?.status
            )}`}
            object={prov.id}
          >
            <RekuestProvision.DetailLink className="" object={prov.id}>
              <div className="text-xl font-light mb-2 flex">
                <div className="text-xl font-light flex-initial">
                  {prov?.template?.interface}
                </div>
                <div className="flex-grow"></div>
                <div className="text-xs">{prov?.agent?.instanceId}</div>
              </div>
              {prov?.status}
              {prov?.status == ProvisionStatus.Lost && (
                <div className="flex flex-row">
                  {" "}
                  <div className="mt-1 text-xs mr-2">
                    <BsExclamationTriangle />
                  </div>{" "}
                  <div className="font-light text-xs">
                    Please Start {prov?.agent?.registry?.app?.identifier}:
                    {prov?.agent?.registry?.app?.version}
                    {" as "}
                    {prov?.agent?.registry?.user?.sub} under{" "}
                    {prov?.agent?.instanceId}
                  </div>
                </div>
              )}
              {prov?.status == ProvisionStatus.Providing && (
                <div className="flex flex-row">
                  {" "}
                  <div className="mt-1 text-xs mr-2">
                    <BsExclamationTriangle />
                  </div>{" "}
                  <div className="font-light text-xs">Providing...</div>
                </div>
              )}
              {prov?.status == ProvisionStatus.Pending && (
                <div className="flex flex-row">
                  {" "}
                  <div className="mt-1 text-xs mr-2">
                    <BsExclamationTriangle />
                  </div>{" "}
                  <div className="font-light text-xs">
                    Pending... Please Start{" "}
                    {prov?.agent?.registry?.app?.identifier}:
                    {prov?.agent?.registry?.app?.version}
                    {"  as "}
                    {prov?.agent?.registry?.user?.sub}
                  </div>
                </div>
              )}
              {prov?.status == ProvisionStatus.Active && (
                <div className="flex flex-row">
                  {" "}
                  <div className="mt-1 text-xs mr-2">
                    <BsCheckCircle />
                  </div>{" "}
                  <div className="font-light text-xs">
                    {prov?.agent?.registry?.app?.identifier}:
                    {prov?.agent?.registry?.app?.version}
                    {prov?.agent?.registry?.user?.sub} is Active
                  </div>
                </div>
              )}
            </RekuestProvision.DetailLink>
            {prov?.agent?.registry?.user?.sub && (
              <UserEmblem sub={prov?.agent?.registry?.user?.sub} />
            )}
          </RekuestProvision.Smart>
        ))}
      </ResponsiveGrid>
    </>
  );
};

export { MyProvisions };
