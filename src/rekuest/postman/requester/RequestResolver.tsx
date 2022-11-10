import { Dialog, Transition } from "@headlessui/react";
import { FormikHelpers } from "formik";
import React, { Fragment, useEffect, useState } from "react";
import { useAlert } from "../../../components/alerter/alerter-context";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { ConstantsForm } from "../../components/ConstantsForm";
import { AssignRequest, useRequester } from "./requester-context";

export type PortValues = {
  [key: string]: any;
};

const ResolveOnce = ({ request }: { request: AssignRequest }) => {
  const { alert } = useAlert();
  const { resolve, reject } = useRequester();
  const [params, setParams] = useState<PortValues>({});

  const onSubmit = async (
    args: any[],
    dict_args: { [key: string]: any },
    { setSubmitting }: FormikHelpers<any>
  ) => {
    console.log("This is the args", args);

    await resolve({
      ...request,
      options: {
        reservation: request.variables.reservation.id,
        args: args || [],
      },
    });

    setSubmitting(false);
  };

  return (
    <>
      <div className="text-xl">{request?.variables.reservation.node.name}</div>
      {request?.variables.reservation?.node?.id && (
        <ConstantsForm
          autoSubmit={false}
          node={request?.variables.reservation?.node.id}
          disable={
            request.variables.defaults &&
            Object.keys(request.variables.defaults)
          }
          initial={request.variables.defaults}
          onSubmit={onSubmit}
        >
          <div className="flex flex-row">
            <div className="flex-grow"></div>
            <button
              className="bg-red-400 px-3 py-1 border rounded text-white"
              onClick={() => reject(request)}
            >
              Cancel
            </button>
            <SubmitButton className="bg-primary-400 px-3 py-1 border rounded text-white disabled:hidden visible ">
              Assign
            </SubmitButton>
          </div>
        </ConstantsForm>
      )}
    </>
  );
};

export const RequestResolver: React.FC<{}> = () => {
  const { pending, resolve } = useRequester();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pending.length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [pending]);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        static
        className="fixed z-10 inset-0 overflow-y-auto rounded-md"
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0 ">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div>
              <div className="inline-block align-middle bg-white text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full rounded-md">
                <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4 rounded-lg">
                  <div className="sm:w-full sm:items-start">
                    <div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <div className="">
                        {pending.slice(-1).map((p) => (
                          <ResolveOnce key={p.id} request={p} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
