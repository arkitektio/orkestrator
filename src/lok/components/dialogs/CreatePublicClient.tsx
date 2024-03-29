import { Form, Formik } from "formik";
import { TwDialog } from "../../../components/dialog/TwDialog";
import {
  CreateableListSearchInput,
  GraphQLListSearchInput,
} from "../../../components/forms/fields/SearchInput";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { SwitchInputField } from "../../../components/forms/fields/switch_input";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../providers/dialog/DialogProvider";
import { withLok } from "../../LokContext";
import {
  CreatePublicClientMutation,
  CreatePublicClientMutationVariables,
  PublicFaktType,
  useCreatePublicClientMutation,
  useScopesOptionsLazyQuery,
} from "../../api/graphql";

export const CreatePublicClientDialog = (
  props: Submit<CreatePublicClientMutation>
) => {
  const [createPublicFakt] = withLok(useCreatePublicClientMutation)();

  const [searchScopes] = withLok(useScopesOptionsLazyQuery)();

  return (
    <Formik<CreatePublicClientMutationVariables>
      initialValues={{
        redirectUris: [""],
        identifier: "",
        version: "",
        kind: PublicFaktType.Website,
        scopes: [],
      }}
      onSubmit={async (values) => {
        console.log("submit", values);
        const res = await createPublicFakt({
          variables: values,
        });

        if (res.data?.createPublicClient) {
          props.submit(res.data);
          return;
        }
        props.reject();
      }}
    >
      <Form>
        <TwDialog
          title="Create a Public Client"
          buttons={
            <>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => props.reject()}
              >
                Cancel
              </button>
              <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-800 disabled:opacity-30">
                Submit
              </SubmitButton>
            </>
          }
        >
          <div className="font-semibold text-lg mb-2">
            This is an advanced feature
          </div>
          <div className="font-normal text-sm mb-2">
            Public Clients are a necessary Proxy in arkitekt to enable
            Applications, that seek to authenticate Users, and gain access to
            their data. Instead of being bound to only one users, these apps can
            ask the user to login . As there is no real way to identify the
            application itself make sure that the redirect uris are correct and
            only redirect to domains that you control.
          </div>
          <TextInputField
            name="identifier"
            label="Identifier"
            placeholder="Identifier"
            description="The identifier of the App"
          />
          <TextInputField
            name="version"
            label="Version"
            placeholder="Version"
            description="The version of the App"
          />
          <SwitchInputField
            name="confidential"
            label="Confidential"
            description="In this setting you need to provide a secret to authenticate your app. This is useful for apps that run on your own server. If you are unsure, leave this on."
            falseDescription="The client secret will be public. And every website will be able to claim the rights of this client. Your only security is to
                make sure the redirect uri is correct and only is able to redirect to domains that you control."
          />

          <CreateableListSearchInput
            name="redirectUris"
            label="Redirect uris"
            createFunction={async (uri) => {
              return {
                label: uri,
                value: uri,
              };
            }}
            searchFunction={async () => []}
            description="Specify the redirect uris for this fakt"
          />

          <GraphQLListSearchInput
            name="scopes"
            label="Scopes"
            searchFunction={searchScopes}
            description="Specify the scopes you want the app to be able to claim. These are not the scopes the app will eventually claim, but the scopes you want it to be able to claim."
          />
        </TwDialog>
      </Form>
    </Formik>
  );
};
