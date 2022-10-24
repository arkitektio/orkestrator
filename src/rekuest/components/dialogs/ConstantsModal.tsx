import { Dialog } from "@headlessui/react";
import { Form, Formik } from "formik";
import { Maybe } from "graphql/jsutils/Maybe";
import React, { ReactNode, useEffect } from "react";
import { useAlert } from "../../../components/alerter/alerter-context";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { useModal } from "../../../components/modals/modal-context";
import {
  ArgPortFragment,
  AssignNodeEventDocument,
  AssignNodeEventSubscriptionResult,
  AssignNodeQuery,
  useAssignNodeQuery,
} from "../../api/graphql";
import { useRekuest, withRekuest } from "../../RekuestContext";
import { Kwargs } from "../../types";
import { Args } from "../../postman/messages/base";
import { WidgetRegistry } from "../../widgets/registry";
import { useWidgetRegistry } from "../../widgets/widget-context";

export type IConstantsModalProps = {
  node: string;
  args?: Args;
  kwargs?: Kwargs;
  onSubmit: (kwargs: AssignValues) => void;
};

export type AssignValues = {
  args: Args;
};

export type PortValues = {
  [key: string]: any;
};

export const portToWidget = (
  port: Maybe<ArgPortFragment>,
  widgetRegistry?: WidgetRegistry
): ReactNode => {
  if (!widgetRegistry) {
    return <> No Widget Registry</>;
  }
  if (!port) {
    return <> No Port ...</>;
  }

  let Widget = widgetRegistry.getInputWidgetForPort(port);

  return (
    <Widget
      port={port}
      widget={port?.widget}
      ward_registry={widgetRegistry.ward_registry}
    />
  );
};

const ConstantsModal: React.FC<IConstantsModalProps> = ({
  node,
  onSubmit,
  args,
  kwargs,
}) => {
  const { close, show } = useModal();
  const { alert } = useAlert();
  const { registry } = useWidgetRegistry();

  const { data, subscribeToMore } = withRekuest(useAssignNodeQuery)({
    variables: { id: node },
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    console.log("Subscribing to My Representations");
    const unsubscribe = subscribeToMore({
      document: AssignNodeEventDocument,
      variables: { id: node },
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Representation", subscriptionData);
        var data = subscriptionData as AssignNodeEventSubscriptionResult;
        let newnode = data.data?.nodeEvent;
        return {
          ...prev,
          node: newnode,
        } as AssignNodeQuery;
      },
    });
    return () => unsubscribe();
  });

  let initialValues = {
    ...data?.node?.args?.reduce((result: any, port) => {
      result[port?.key || "test"] = port?.default;
      return result;
    }, {}),
    ...kwargs,
  };

  let unsetArgs = data?.node?.args?.filter(
    (item, index) => !args || !args[index]
  );

  return (
    <Formik<PortValues>
      enableReinitialize
      initialValues={initialValues}
      onSubmit={(values, { setSubmitting }) => {
        console.log("Submitted", values);
        setSubmitting(true);

        let set_args = data?.node?.args?.map((port, index) => {
          if (args && args[index]) return args[index];
          if (port?.key && values[port?.key]) {
            return values[port?.key];
          }
          return undefined;
        });

        if (set_args?.includes(undefined)) {
          alert({
            message: "Args did not contain all of the required values",
          }).then(() => setSubmitting(false));
          return;
        }

        console.log("Calling with", set_args);
        onSubmit({ args: set_args || [] });
        setSubmitting(false);
        close();
      }}
    >
      {(formikProps) => (
        <Form>
          <div className="inline-block align-middle rounded bg-white text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:w-full sm:items-start">
                <div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-light mt-2 mb-4 leading-6 text-gray-900"
                  >
                    {data?.node?.name}
                  </Dialog.Title>
                  <div className="pt-3 pb-2">{data?.node?.description}</div>
                  <div className="mt-2 align-left text-left">
                    {unsetArgs && unsetArgs?.length > 0 && (
                      <>
                        <div className="font-light text-xl mb-2">Arguments</div>
                        {unsetArgs?.map((arg) => portToWidget(arg, registry))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
              <SubmitButton className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2  bg-blue-600 text-base font-medium text-white hover:bg-blue-800 sm:ml-3 sm:w-auto sm:text-sm">
                {" "}
                Assign
              </SubmitButton>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => close()}
              >
                Cancel
              </button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export { ConstantsModal };
