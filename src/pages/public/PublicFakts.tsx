import { Form, Formik } from "formik";
import React from "react";
import { SubmitButton } from "../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../components/forms/fields/text_input";
import { PublicNavigationBar } from "../../components/navigation/PublicNavigationBar";
import { buildFaktsRetrieveGrant, useFakts } from "@jhnnsrs/fakts";
import { grantBuilder } from "../../constants";
import { Disclosure } from "@headlessui/react";
import { useAlert } from "../../components/alerter/alerter-context";

export interface PublicHomeProps {}

export interface ConfigValues {
  host: string;
}

const advertisedHosts: string[] =
  import.meta.env.VITE_ADVERTISED_FAKT_ENDPOINTS != undefined
    ? import.meta.env.VITE_ADVERTISED_FAKT_ENDPOINTS.split(",")
    : [];

console.log("Advertised hosts", advertisedHosts);

export const PublicFakts: React.FC<PublicHomeProps> = (props) => {
  const { load } = useFakts();
  const { alert } = useAlert();

  return (
    <div className="flex flex-col h-screen sm:flex-row-reverse">
      <div className="flex-grow flex flex-col bg-slate-900 overflow-y-auto">
        <main className="mt-10 mx-auto px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28 ">
          <div className="sm:text-center lg:text-left">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block xl:inline text-white">Choose your </span>{" "}
              <span className="block text-primary-300 xl:inline drop-shadow-2xl ">
                Server
              </span>
            </h1>
            <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
              Arkitekt emphasises modularity, this means that you can choose to
              connect to different servers through this webinterface.
              <div className="mt-1 text-sm">
                If this is your first time using Arkitekt. Make sure you check
                out our{" "}
                <a
                  href="https://jhnnsrs.github.io/doks"
                  target={"_blank"}
                  className="underline"
                >
                  documentation
                </a>
                .
              </div>
            </p>
            <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start gap-2">
              {advertisedHosts.length > 0 ? (
                <>
                  {advertisedHosts.map((e) => (
                    <button
                      onClick={() =>
                        load(
                          grantBuilder({
                            name: e,
                            base_url: `${e}/f/`,
                          })
                        ).catch((e) => {
                          alert({
                            subtitle: e.message,
                            message: "Could not load fakts from this endpoint",
                          });
                        })
                      }
                      className="w-full shadow-lg shadow-primary-700/90 flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-300 hover:bg-primary-500 md:py-4 md:text-lg md:px-10"
                    >
                      Connect to {e}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <Formik<ConfigValues>
                    initialValues={{
                      host: `${window.location}`,
                    }}
                    onSubmit={({ host }, { setSubmitting }) => {
                      setSubmitting(true);
                      load(
                        grantBuilder({
                          name: "Localhost",
                          base_url: `${host}/f/`,
                        })
                      ).catch((e) => {
                        alert({
                          subtitle: e.message,
                          message: "Could not load fakts from this endpoint",
                        });
                      });
                    }}
                  >
                    {(formikProps) => (
                      <Form>
                        <div className="text-left overflow-hidden text-gray-500">
                          <div className="">
                            YOu can choose a different fakts endpoint hear
                            <div className=" w-full">
                              <div className="mt-1 test-center w-full">
                                <div className="mt-2 align-left text-left  ">
                                  <TextInputField
                                    name="host"
                                    label="Host"
                                    description="The adress of your host"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="pb-2">
                            <SubmitButton className="w-full shadow-lg shadow-primary-700/90 flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-300 hover:bg-primary-500 md:py-4 md:text-lg md:px-10">
                              {" "}
                              Use
                            </SubmitButton>
                          </div>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </>
              )}
            </div>
            <Disclosure defaultOpen={advertisedHosts.length == 0}>
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
                        load(
                          grantBuilder({
                            name: "Localhost",
                            base_url: `${host}/f/`,
                          })
                        ).catch((e) => {
                          alert({
                            subtitle: e.message,
                            message: "Could not load fakts from this endpoint",
                          });
                        });
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
                              <SubmitButton className=" shadow-lg shadow-primary-700/90 flex items-center justify-center px-4 py-1 border border-transparent text-base font-medium rounded-md text-white bg-primary-300 hover:bg-primary-500 ">
                                {" "}
                                Use
                              </SubmitButton>
                            </div>
                          </div>
                        </Form>
                      )}
                    </Formik>
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>

            <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start"></div>
          </div>
        </main>
      </div>
      <div className="flex-initial sm:flex-initial sm:static sm:w-20">
        <PublicNavigationBar />
      </div>
    </div>
  );
};
