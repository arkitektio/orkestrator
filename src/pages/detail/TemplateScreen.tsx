import React, { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  DetailTemplateFragment,
  useDetailTemplateQuery,
} from "../../rekuest/api/graphql";
import { ProvisionPulse } from "../../rekuest/components/generic/StatusPulse";
import { notEmpty } from "../../floating/utils";
import { SectionTitle } from "../../layout/SectionTitle";
import { Provision } from "../../linker";
import { withRekuest } from "../../rekuest";
export type TemplateScreenProps = {};

export type TemplateToolBarProps = {
  template: DetailTemplateFragment;
};

const TemplateToolBar: React.FC<TemplateToolBarProps> = ({ template }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const navigate = useNavigate();

  return (
    <div className="flex flex-row w-100">
      <div className="flex-initial">
        <SectionTitle>
          <div>{template?.node?.name}</div>
          <div className="font-light mt-auto ml-4 ">
            {template?.node?.package}/{template?.node?.interface}:
            {template?.version || "no-version"}
          </div>
        </SectionTitle>
      </div>
      <div className="flex-grow"></div>
      <div className="flex-none">
        <div className="bg-white grid gap-2 rounded-lg p-3 shadow-lg ring-1 ring-black ring-opacity-5 focus:ring-4">
          {template?.provisions?.length == 0 && "No active Deployments"}
          {template?.provisions?.filter(notEmpty).map((prov) => (
            <Provision.DetailLink
              className="cursor-pointer flex flex-row border border-gray-400 rounded p-3"
              object={prov?.id}
            >
              <div className="flex-initial ">
                <div className="mt-3 mr-3">
                  <ProvisionPulse status={prov?.status} />
                </div>
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium text-gray-900">
                  {prov?.title ? prov.title : "Untitled Provision"} by{" "}
                  {prov?.creator?.email}
                </p>
                <p className="text-sm text-gray-500">
                  started on {prov?.app?.name}
                </p>
              </div>
            </Provision.DetailLink>
          ))}
        </div>
        <button
          className="text-black border border-gray-400 bg-white group bg-orange-700 px-3 py-2 rounded-md inline-flex items-center text-base font-medium hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        >
          Deployments
        </button>
      </div>
    </div>
  );
};

const TemplateScreen: React.FC<TemplateScreenProps> = ({}) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;
  const { data } = withRekuest(useDetailTemplateQuery)({
    variables: { id: id },
  });

  return (
    <div className="flex flex-col h-full px-6">
      <div className="flex-initial h-20">
        {data?.template && <TemplateToolBar template={data.template} />}
      </div>
      <div className="flex-grow dark:text-white">
        Fullfills extensions: {data?.template?.extensions?.map((ext) => ext)}
      </div>
    </div>
  );
};

export { TemplateScreen };
