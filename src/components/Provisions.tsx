import React from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsCheckCircle,
  BsExclamationTriangle,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { ProvisionStatus } from "../rekuest/api/graphql";
import { UnprovideButton } from "../rekuest/components/UnprovideButton";
import { usePostman } from "../rekuest/postman/graphql/postman-context";
import { colorFromProvisionStatus } from "../rekuest/ui/utils";
import { notEmpty } from "../floating/utils";
import { Provision } from "../linker";
import { UserEmblem } from "../lok/components/UserEmblem";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyProvisionsProps = {};

const Provisions: React.FC<IMyProvisionsProps> = () => {
  const { provisions } = usePostman();
  const navigate = useNavigate();

  return (
    <>
      <Provision.ListLink className="font-light text-xl dark:text-white">
        Provisions of this App
      </Provision.ListLink>
      <ResponsiveGrid>
        {provisions?.provisions?.filter(notEmpty).map((prov, index) => (
          <div
            key={index}
            className={`rounded border relative shadow-md ${colorFromProvisionStatus(
              prov?.status
            )}`}
          >
            <Provision.DetailLink object={prov.id} className="p-2">
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
            </Provision.DetailLink>
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
      </ResponsiveGrid>
    </>
  );
};

export { Provisions };
