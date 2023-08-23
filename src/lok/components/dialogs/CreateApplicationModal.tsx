import { Dialog } from "@headlessui/react";
import { Form, Formik } from "formik";
import React from "react";
import { Alert } from "../../../components/forms/Alert";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { CarouselInputField } from "../../../components/forms/fields/carousel_inputs";
import { ParagraphInputField } from "../../../components/forms/fields/paragraph_input";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { useModal } from "../../../components/modals/modal-context";
import {
  ApplicationsDocument,
  CreateApplicationMutation,
  GrantType,
  useCreateApplicationMutation,
} from "../../../lok/api/graphql";
import { withLok } from "../../LokContext";

export type ICreateApplicationModalProps = {
  onApplicationCreated?: (app: CreateApplicationMutation) => void;
};

export type ApplicationOption = {
  label: string;
  description: string;
};

export type CreateApplicationFormValues = {
  name: string;
  grantType: GrantType;
  redirect_uri_string: string;
};

const CreateApplicationModal: React.FC<ICreateApplicationModalProps> = ({
  onApplicationCreated,
}) => {
  const [createApplication, data] = withLok(useCreateApplicationMutation)({
    update(cache, result) {
      const existingApps: any = cache.readQuery({
        query: ApplicationsDocument,
      });
      cache.writeQuery({
        query: ApplicationsDocument,
        data: {
          applications: existingApps.applications.concat(
            result.data?.createApplication
          ),
        },
      });
    },
  });
  const { close, show } = useModal();

  return (
    <>
      <Formik<CreateApplicationFormValues>
        initialValues={{
          name: "",
          grantType: GrantType.AuthorizationCode,
          redirect_uri_string: `http://localhost:3000
http://localhost:9000
            `,
        }}
        validateOnBlur
        onSubmit={(values, { setSubmitting }) => {
          console.log(values);
          setSubmitting(true);
          let variables = {
            name: values.name,
            grantType: values.grantType,
            redirectUris: values.redirect_uri_string.split(/\r?\n/),
          };

          createApplication({ variables: variables }).then((res) => {
            close();
            onApplicationCreated && res.data && onApplicationCreated(res.data);
          });
        }}
      >
        {(formikProps) => (
          <Form>
            <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all mt-3 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-2 pb-4">
                <div className="p-3">
                  <div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-xl mt-2 mb-4 leading-6 font-medium text-gray-900"
                    >
                      Create New App
                    </Dialog.Title>
                    <div className="mt-2 align-left text-left">
                      <TextInputField
                        name="name"
                        label="Name"
                        description="How should your workflow be Called?"
                      />
                      <CarouselInputField<GrantType, ApplicationOption>
                        name="grantType"
                        label="Grant Type"
                        options={{
                          [GrantType.AuthorizationCode]: {
                            label: "Authorization Code ",
                            description:
                              "Does your App allow Users to login via a Website?",
                          },
                          [GrantType.ClientCredentials]: {
                            label: "Backend",
                            description:
                              "Does the App exist as a Backend and has no user Interaction?",
                          },
                          [GrantType.Password]: {
                            label: "Password",
                            description:
                              "Do you want you user to be able to login via their username and password? (Insecure",
                          },
                          [GrantType.Implicit]: {
                            label: "Implicit",
                            description:
                              "Does your App allow Users to login via a Website?",
                          },
                        }}
                        optionBuilder={(option, index) => (
                          <div key={index}>
                            <span className="font-semibold">
                              {option.label}
                            </span>
                            <br />
                            <span className="text-xs font-light">
                              {option.description}
                            </span>
                          </div>
                        )}
                        description="How will people be able to login with the Platform through your app "
                      />
                      {(formikProps.values.grantType ==
                        GrantType.AuthorizationCode ||
                        formikProps.values.grantType == GrantType.Implicit) && (
                        <ParagraphInputField
                          name="redirect_uri_string"
                          label="Available redirect uris"
                          description="This Authorization Type Redirects you to a webpage. Make sure you own this webpage (or redirect to Localhost if using Implicit)"
                        />
                      )}
                      {formikProps.values.grantType == GrantType.Implicit && (
                        <Alert
                          prepend="Deprecated"
                          message="The Implicit flow is depracated and potentially insecure, try using authorization Code instead"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
                <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                  {" "}
                  Create App
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
    </>
  );
};

export { CreateApplicationModal };
