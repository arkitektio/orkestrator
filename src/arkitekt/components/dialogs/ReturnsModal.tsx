import { Dialog } from "@headlessui/react";
import { Maybe } from "graphql/jsutils/Maybe";
import React, { ReactNode } from "react";
import { useAlert } from "../../../components/alerter/alerter-context";
import { useModal } from "../../../components/modals/modal-context";
import { ReturnPortFragment } from "../../api/graphql";
import { Kwargs, Returns } from "../../arkitekt-types";
import { Args } from "../../postman/messages/base";
import { WidgetRegistry } from "../../widgets/registry";
import { useWidgetRegistry } from "../../widgets/widget-context";

export type IReturnsModalProps = {
  node: string;
  returns?: Returns;
};

export type AssignValues = {
  args: Args;
  kwargs: Kwargs;
};

export type PortValues = {
  [key: string]: any;
};

export const portToReturnWidget = (
  port: Maybe<ReturnPortFragment>,
  value: any,
  widgetRegistry: WidgetRegistry
): ReactNode => {
  if (!widgetRegistry) {
    return <> No Widget Registry</>;
  }
  if (!port) {
    return <> No Port ...</>;
  }
  let Widget = widgetRegistry.getReturnWidgetForPort(port);
  return (
    <Widget
      port={port}
      widget={port?.widget}
      value={value}
      ward_registry={widgetRegistry.ward_registry}
    />
  );
};

const ReturnsModal: React.FC<IReturnsModalProps> = ({ node, returns }) => {
  const { close, show } = useModal();
  const { alert } = useAlert();
  const { registry } = useWidgetRegistry();

  return (
    <div className="inline-block align-middle rounded bg-white text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
      <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
        <div className="sm:w-full sm:items-start">
          <div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <Dialog.Title
              as="h3"
              className="text-xl font-light mt-2 mb-4 leading-6 text-gray-900"
            ></Dialog.Title>
            <div className="pt-3 pb-2"></div>
            <div className="mt-2 align-left text-left">
              {returns && returns?.length > 0 && (
                <>
                  <div className="font-light text-xl mb-2">Returns</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
        <button
          type="button"
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
          onClick={() => close()}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export { ReturnsModal };
