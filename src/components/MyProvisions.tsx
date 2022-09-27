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
import { ProvisionStatus, useMyProvisionsQuery } from "../arkitekt/api/graphql";
import { withArkitekt } from "../arkitekt/arkitekt";
import { UnprovideButton } from "../arkitekt/components/UnprovideButton";
import { colorFromProvisionStatus } from "../arkitekt/ui/utils";
import { notEmpty } from "../floating/utils";
import { Provision } from "../linker";
import { UserEmblem } from "../man/components/UserEmblem";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyProvisionsProps = {};

const MyProvisions: React.FC<IMyProvisionsProps> = () => {
  const { data } = withArkitekt(useMyProvisionsQuery)();
  const navigate = useNavigate();

  return (
    <>
      <Provision.ListLink>
        <span className="font-light text-xl dark:text-white">
          My Provisions
        </span>
      </Provision.ListLink>
      <ResponsiveGrid>
        {data?.myprovisions?.filter(notEmpty).map((prov, index) => (
          <Provision.Smart
            key={index}
            className={`max-w-sm rounded border relative p-2 shadow-md ${colorFromProvisionStatus(
              prov?.status
            )}`}
            object={prov.id}
          >
            <Provision.DetailLink className="" object={prov.id}>
              <div className="text-xl font-light mb-2 flex">
                <div className="text-xl font-light flex-initial">
                  {prov?.template?.node?.name}
                </div>
                <div className="flex-grow"></div>
                <div className="text-xs">{prov?.agent?.identifier}</div>
              </div>
              {prov?.status}
              {prov?.status == ProvisionStatus.Lost && (
                <div className="flex flex-row">
                  {" "}
                  <div className="mt-1 text-xs mr-2">
                    <BsExclamationTriangle />
                  </div>{" "}
                  <div className="font-light text-xs">
                    Please Start {prov?.agent?.registry?.app?.name}
                    {" as "}
                    {prov?.agent?.registry?.user?.email}
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
                    Pending... Please Start {prov?.agent?.registry?.app?.name}
                    {"  as "}
                    {prov?.agent?.registry?.user?.email}
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
                    {prov?.agent?.registry?.app?.name}
                    {" under "}
                    {prov?.agent?.registry?.user?.email} is Active
                  </div>
                </div>
              )}
            </Provision.DetailLink>
            <div className=" text-sm">
              {prov?.id && (
                <UnprovideButton
                  provision={prov?.id}
                  className=" dark:text-slate-50 hover:bg-gray-400 text-gray-800 py-1 px-1 border border-slate-700 rounded"
                >
                  Unprovide
                </UnprovideButton>
              )}
            </div>
            {prov?.agent?.registry?.user?.email && (
              <UserEmblem email={prov?.agent?.registry?.user?.email} />
            )}
          </Provision.Smart>
        ))}
      </ResponsiveGrid>
    </>
  );
};

export { MyProvisions };
