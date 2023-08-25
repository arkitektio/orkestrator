import React from "react";
import { BsCheckCircle, BsExclamationTriangle } from "react-icons/bs";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { RekuestProvision } from "../linker";
import { UserEmblem } from "../lok/components/UserEmblem";
import { ProvisionStatus } from "../rekuest/api/graphql";
import { UnprovideButton } from "../rekuest/components/UnprovideButton";
import { usePostman } from "../rekuest/providers/legacy/postman-context";
import { colorFromProvisionStatus } from "../rekuest/ui/utils";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";

export type IMyProvisionsProps = {};

const Provisions: React.FC<IMyProvisionsProps> = () => {
  const { provisions } = usePostman();
  const navigate = useNavigate();

  return (
    <>
      <RekuestProvision.ListLink className="font-light text-xl dark:text-white">
        This app is being used by
      </RekuestProvision.ListLink>
      <ResponsiveContainerGrid>
        {provisions?.provisions?.filter(notEmpty).map((prov, index) => (
          <div
            key={index}
            className={`rounded border relative shadow-md ${colorFromProvisionStatus(
              prov?.status
            )}`}
          >
            <RekuestProvision.DetailLink object={prov.id} className="p-2">
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
                    Please Start {prov?.agent?.registry?.app?.identifier}
                    {" as "}
                    {prov?.agent?.registry?.user?.sub}
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
                    {prov?.agent?.registry?.app?.identifier}
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
                    {prov?.agent?.registry?.app?.identifier}
                    {" under "}
                    {prov?.agent?.registry?.user?.sub} is Active
                  </div>
                </div>
              )}
            </RekuestProvision.DetailLink>
            <div className="ml-2 pb-2 text-sm">
              {prov?.id && (
                <UnprovideButton
                  provision={prov?.id}
                  className=" dark:text-slate-50 hover:bg-gray-400 text-gray-800 py-1 px-1 border border-slate-700 rounded"
                >
                  Unprovide
                </UnprovideButton>
              )}
            </div>
            {prov?.agent?.registry?.user?.sub && (
              <UserEmblem sub={prov?.agent?.registry?.user?.sub} />
            )}
          </div>
        ))}
      </ResponsiveContainerGrid>
    </>
  );
};

export { Provisions };
