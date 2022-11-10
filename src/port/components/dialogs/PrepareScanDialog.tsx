import { Form, Formik } from "formik";
import { SearchSelectInput } from "../../../components/forms/fields/search_select_input";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import {
  useCreatePrivateFaktMutation,
  useScopesOptionsLazyQuery,
  CreatePrivateFaktMutationVariables,
} from "../../../man/api/graphql";
import { withMan } from "../../../man/context";
import {
  DetailWhaleFragment,
  useCreateWhaleMutation,
  useDetailRepoScanQuery,
} from "../../api/graphql";
import { withPort } from "../../PortContext";

export type IMyWhalesProps = {};

export const PrepareScanDialog = (
  props: Submit<DetailWhaleFragment> & { scan: string }
) => {
  const { data } = withPort(useDetailRepoScanQuery)({
    variables: { id: props.scan },
  });

  const [createApp] = withMan(useCreatePrivateFaktMutation)({});
  const [createWhale] = withPort(useCreateWhaleMutation)({});
  const [searchScopes] = withMan(useScopesOptionsLazyQuery)({});

  if (!data?.reposcan) return <></>;

  return (
    <Formik<CreatePrivateFaktMutationVariables>
      initialValues={{ ...data?.reposcan }}
      onSubmit={async (values) => {
        console.log("submit", values);
        const app = await createApp({
          variables: values,
        });

        if (app?.data?.createPrivateFakt && data?.reposcan?.image) {
          const res = await createWhale({
            variables: {
              version: app.data.createPrivateFakt.version,
              identifier: app.data.createPrivateFakt.identifier,
              clientId: app?.data?.createPrivateFakt.clientId,
              clientSecret: app?.data?.createPrivateFakt.clientSecret,
              scopes: app?.data?.createPrivateFakt.scopes,
              faktEndpoint: "http://herre:8000/f/",
              image: data?.reposcan?.image,
            },
          });

          console.log("res", res);

          if (res.data?.createWhale) {
            props.submit(res.data?.createWhale);
          }
        }
      }}
    >
      <Form>
        <TwDialog
          title="Create App"
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
          <span className="font-light text-xl text-black">
            <div className="font-light text-sm mb-2">
              This repo would like to create an App on your behalf
            </div>

            <SearchSelectInput
              name="scopes"
              lazySearch={searchScopes}
              label="Scopes"
              description="The scopes the app will have"
              isMulti
              disabled
            />
            <TextInputField
              name="identifier"
              label="Identifier"
              disabled
              description="This app will be identified as"
            />
            <TextInputField
              name="version"
              label="Version"
              disabled
              description="The apps version"
            />
          </span>
        </TwDialog>
      </Form>
    </Formik>
  );
};
