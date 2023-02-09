import { Dialog, Transition } from "@headlessui/react";
import { FormikHelpers } from "formik";
import React, { Fragment, useEffect, useState } from "react";
import { ReserveForm } from "../../components/ReserveForm";
import { usePostman } from "../graphql/postman-context";
import {
  ReserveOptions,
  ReserveRequest,
  useReserver,
} from "./reserver-context";

export type PortValues = {
  [key: string]: any;
};

export const ResolveReserveOnce = ({
  request,
}: {
  request: ReserveRequest;
}) => {
  const { resolve, reject } = useReserver();
  const [params, setParams] = useState<PortValues>({});

  const onSubmit = async (
    values: ReserveOptions,
    { setSubmitting }: FormikHelpers<any>
  ) => {
    await resolve({ ...request, options: values });
    setSubmitting(false);
  };

  return (
    <>
      <ReserveForm initial={request.options} onSubmit={onSubmit} />
    </>
  );
};

export const ReserveResolver: React.FC<{}> = () => {
  const { pending, resolve } = useReserver();
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
        className="fixed z-10 inset-0 overflow-y-auto "
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
              <div className="inline-block align-middle rounded bg-white text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ">
                <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4 rounded-md rounded">
                  <div className="sm:w-full sm:items-start">
                    <div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-xl font-light mt-2 mb-4 leading-6 text-gray-900">
                        Fullfill reservation {pending.length}
                      </h3>
                      <div className="border p-1">
                        {pending.slice(-1).map((p) => (
                          <ResolveReserveOnce key={p.id} request={p} />
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
