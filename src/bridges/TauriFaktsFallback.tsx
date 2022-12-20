import { listen } from "@tauri-apps/api/event";
import React, { useEffect, useState } from "react";
import { buildFaktsRetrieveGrant, Fakts, useFakts } from "@jhnnsrs/fakts";
import { PublicNavigationBar } from "../components/navigation/PublicNavigationBar";
import { SubmitButton } from "../components/forms/fields/SubmitButton";
import { TextInputField } from "../components/forms/fields/text_input";
import { Form, Formik } from "formik";
import { useAlert } from "../components/alerter/alerter-context";
import CancelablePromise from "cancelable-promise";
import { grantBuilder } from "../constants";
import { Disclosure } from "@headlessui/react";

export interface CallbackProps {}

export interface ConfigValues {
  host: string;
}

export interface Beacon {
  name: string;
  base_url: string;
}

export const TauriFaktsFallback: React.FC<CallbackProps> = (props) => {
  const { load } = useFakts();
  const [endpoints, setEndpoints] = useState<Beacon[]>([]);
  const { alert } = useAlert();
  const [future, setFuture] = useState<CancelablePromise<Fakts> | null>(null);

  useEffect(() => {
    const unlisten = listen("fakts", async (event) => {
      let beacon = event.payload as Beacon;

      setEndpoints((endpoints) => {
        // Check if we already have this endpoint
        if (endpoints.find((e) => e.base_url === beacon.base_url)) {
          return endpoints;
        }
        return [...endpoints, beacon];
      });
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <>
      <div className="flex flex-col h-screen sm:flex-row-reverse">
        <div className="flex-grow flex flex-col bg-slate-900 overflow-y-auto">
          <main className="mt-10 mx-auto px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28 ">
            <div className="sm:text-center lg:text-left">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block xl:inline text-white">Choose your </span>{" "}
                <span className="block text-primary-300 xl:inline drop-shadow-2xl ">
                  Fakts
                </span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                We don't know yet where all of your services are being hosted,
                in order to use this website with your data you need to point us
                to your configuration. We are trying to autodiscover all
                instances in your network.
              </p>
              {endpoints.length > 0 && (
                <div className="mt-3 text-white text-xl">
                  Found these endpoints
                </div>
              )}
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start text-white gap-2">
                {endpoints.map((endpoint) => (
                  <button
                    key={endpoint.name}
                    className="rounded rounded-md border border-gray-300 p-3 flex flex-col hover:bg-primary-300 cursor-pointer"
                    onClick={() => {
                      setFuture(
                        load(grantBuilder(endpoint))
                          .then(() => {
                            setFuture(null);
                          })
                          .catch((e) => {
                            alert({ message: e.message, subtitle: e.stack });
                          })
                          .finally(() => {
                            setFuture(null);
                          }, true)
                      );
                    }}
                  >
                    {endpoint.name}
                    <span className="text-gray-500 text-xs">
                      {endpoint.base_url}
                    </span>
                  </button>
                ))}
              </div>
              <Disclosure>
                {({ open }) => (
                  <>
                    <Disclosure.Button className="py-2 sm:justify-center lg:justify-start cursor-pointer  text-gray-500">
                      Advanced {open ? "▲" : "▼"}
                    </Disclosure.Button>
                    <Disclosure.Panel className=" sm:flex sm:justify-center lg:justify-start p-2 border-gray-200 rounded border rounded-md">
                      <Formik<ConfigValues>
                        initialValues={{
                          host: `${window.location}`,
                        }}
                        onSubmit={({ host }, { setSubmitting }) => {
                          setSubmitting(true);
                          setFuture(
                            load(
                              grantBuilder({
                                name: "Localhost",
                                base_url: host,
                              })
                            )
                              .then(() => {
                                setFuture(null);
                                setSubmitting(false);
                              })
                              .catch((e) => {
                                alert({
                                  message: e.message,
                                  subtitle: e.stack,
                                });
                              })
                              .finally(() => {
                                setFuture(null);
                                setSubmitting(false);
                              }, true)
                          );
                        }}
                      >
                        {(formikProps) => (
                          <Form>
                            <div className="text-gray-500">
                              You can choose a different fakts endpoint here
                            </div>
                            <div className="text-left overflow-hidden text-gray-500 flex w-full flex-col">
                              <div className="mt-1 test-center w-full">
                                <div className="mt-2 align-left text-left  ">
                                  <TextInputField
                                    name="host"
                                    label="Host"
                                    description="The adress of your host"
                                  />
                                </div>
                              </div>
                              <div className="ml-3 pb-2 my-auto">
                                {future ? (
                                  <button
                                    onClick={() => future.cancel()}
                                    className="w-full shadow-lg shadow-red-700/90 flex items-center justify-center px-2 py-1 border border-transparent text-base font-medium rounded-md text-white bg-red-300 hover:bg-red-400 md:py-1 md:text-lg md:px-10"
                                  >
                                    {" "}
                                    Cancel{" "}
                                  </button>
                                ) : (
                                  <SubmitButton className="w-full shadow-lg shadow-primary-700/90 flex items-center justify-center px-2 py-1 border border-transparent text-base font-medium rounded-md text-white bg-primary-300 hover:bg-primary-400 md:py-1 md:text-lg md:px-10">
                                    Use
                                  </SubmitButton>
                                )}
                              </div>
                            </div>
                          </Form>
                        )}
                      </Formik>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            </div>
          </main>
        </div>
        <div className="flex-initial sm:flex-initial sm:static sm:w-20">
          <PublicNavigationBar />
        </div>
      </div>
    </>
  );
};
