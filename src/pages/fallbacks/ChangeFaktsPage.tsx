import { Form, Formik } from "formik";
import React from "react";
import { SubmitButton } from "../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../components/forms/fields/text_input";
import { PublicNavigationBar } from "../../components/navigation/PublicNavigationBar";
import { useFakts } from "fakts";

export type IChooseConfigPageProps = {};

export interface ConfigValues {
  host: string;
}

const ChangeFaktsPage: React.FC<IChooseConfigPageProps> = ({}) => {
  const { load } = useFakts();

  return (
    <>
      <div className="flex flex-col h-screen">
        <div className="flex-0">
          <PublicNavigationBar />
        </div>
        <div className="flex-grow overflow-auto pb-3 bg-gray-300 dark:bg-slate-900">
          <div className="sm:text-center lg:text-left  mt-5 p-6">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block xl:inline">Choose your</span>{" "}
              <span className="block text-green-600 xl:inline">Fakts</span>
            </h1>
            <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
              We don't know yet where all of your services are being hosted, in
              order to use this website with your data you need to point us to
              your configuration. Normally thats as simple as entering here your
              network adress of the server. If you don't know what this is,
              please contact your administrator.
            </p>
            <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start gap-2">
              <Formik<ConfigValues>
                initialValues={{
                  host: `${window.location.hostname}:8000`,
                }}
                onSubmit={({ host }, { setSubmitting }) => {
                  setSubmitting(true);
                  load({
                    name: "Localhost",
                    base_url: `http://${host}/f/`,
                  });
                }}
              >
                {(formikProps) => (
                  <Form>
                    <div className="text-left overflow-hidden ">
                      <div className="">
                        <div className=" w-full">
                          <div className="mt-1 test-center w-full">
                            <div className="mt-2 align-left text-left ">
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
                        <SubmitButton className="w-full shadow-lg shadow-indigo-500/10 flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10">
                          {" "}
                          Use
                        </SubmitButton>
                      </div>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export { ChangeFaktsPage };
