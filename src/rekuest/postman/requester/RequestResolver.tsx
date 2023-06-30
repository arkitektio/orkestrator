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

  console.log("This is the request", request.variables.defaults);

  return (
    <>
      <div className="font-semibold mb-2 text-xs">Assign to Reservation</div>
      <div className="text-2xl mb-2">
        {request?.variables.reservation.node.name}
      </div>
      <div className="text-sm mb-2">
        {request?.variables.reservation.node.description}
      </div>
      <div className="text-sm mb-2 rounded p-1">

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
          <div className="flex flex-row gap-2 mt-2">
            <div className="flex-grow"></div>
            <button
              className="backdrop-blur-md focus:ring-0 focus:ring-gray-300  text-white bg-opacity-20 shadow-md bg-back-500 disabled:shadow-none font-light items-center cursor-pointer z-50 border border-slate-300 p-2 rounded-md disabled:bg-gray-800 disabled:border-gray-800 truncate transition-all ease-in-out duration-300 disabled:cursor-not-allowed hover:bg-opacity-70"
              onClick={() => reject(request)}
            >
              Cancel
            </button>
            <SubmitButton className="backdrop-blur-md text-white bg-opacity-20 hover:bg-opacity-80 shadow-md bg-back-500 disabled:shadow-none font-light items-center cursor-pointer z-50 border border-slate-300 p-2 rounded-md disabled:bg-gray-800 disabled:border-gray-700 truncate transition-all ease-in-out duration-300 disabled:cursor-not-allowed hover:bg-opacity-70"
              >
              Assign
            </SubmitButton>
          </div>
        </ConstantsForm>
      )}

      </div>
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
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" />
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
              <div className="shadow shadow-2xl border border-back-800 inline-block align-middle bg-back-900 text-left text-slate-200 shadow-xl transform transition-all min-w-xl sm:my-8 sm:align-middle sm:max-w-2xl xl:max-w-4xl sm:w-full rounded-md">
                <div className="px-4 pt-2 pb-4 sm:p-6 sm:pb-4 rounded-lg @container">
                  
                    {pending.slice(-1).map((p) => (
                      <ResolveOnce key={p.id} request={p} />
                    ))}
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
