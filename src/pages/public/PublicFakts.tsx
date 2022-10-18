import { Form, Formik } from "formik";
import React from "react";
import { SubmitButton } from "../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../components/forms/fields/text_input";
import { PublicNavigationBar } from "../../components/navigation/PublicNavigationBar";
import { useFakts } from "fakts";

export interface PublicHomeProps {}

export interface ConfigValues {
  host: string;
}

export const PublicFakts: React.FC<PublicHomeProps> = (props) => {
  const { load } = useFakts();

  return (
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
              We don't know yet where all of your services are being hosted, in
              order to use this website with your data you need to point us to
              your configuration. Normally thats as simple as entering here your
              network adress of the server. If you don't know what this is,
              please contact your administrator. ( We are working hard to remove
              this step.. so dont get used to this sight)
            </p>
            <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
              <Formik<ConfigValues>
                initialValues={{
                  host: `${window.location}`,
                }}
                onSubmit={({ host }, { setSubmitting }) => {
                  setSubmitting(true);
                  load({
                    endpoint: {
                      name: "Localhost",
                      base_url: `${host}/f/`,
                    },
                    clientId: "PsdU71PlUYeC4hP4aDf8pTdm2Hv9xYKdrxCFI5RO",
                    clientSecret:
                      "8jXSNhrH7fllN8cGjxg7y2Jl1INb22wlDSmUBepb9aRDGV3al5pfNzswS85MPEvpN5vnfrPkrIERQ6kcMHLiISr4HcYirivdtrnyMjFMlzKGvlCrwfkNJmtQgCLZmH4X",
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
                        <SubmitButton className="w-full shadow-lg shadow-primary-700/90 flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-300 hover:bg-primary-500 md:py-4 md:text-lg md:px-10">
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
        </main>
      </div>
      <div className="flex-initial sm:flex-initial sm:static sm:w-20">
        <PublicNavigationBar />
      </div>
    </div>
  );
};
