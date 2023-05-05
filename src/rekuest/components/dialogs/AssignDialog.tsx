import { Form, Formik } from "formik";
import { GraphQLSearchInput } from "../../../components/forms/fields/SearchInput";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { SwitchInputField } from "../../../components/forms/fields/switch_input";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { notEmpty } from "../../../floating/utils";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import { useSettings } from "../../../settings/settings-context";
import { withRekuest } from "../../RekuestContext";
import {
  ReserveMutationVariables,
  useReservableTemplatesQuery,
  useUserOptionsLazyQuery,
} from "../../api/graphql";
import { ReserveParamsField } from "../ReserveParamsField";

export type IMyWhalesProps = {};

export const ReserveDialog = (
  props: Submit<ReserveMutationVariables> & {
    initial: ReserveMutationVariables;
  }
) => {
  const { data, error } = withRekuest(useReservableTemplatesQuery)({
    variables: { node: props.initial.node },
    fetchPolicy: "network-only",
  });

  const [searchUsers] = withRekuest(useUserOptionsLazyQuery)();

  const {
    settings: { allowAutoRequest },
  } = useSettings();

  return (
    <Formik<ReserveMutationVariables>
      enableReinitialize
      initialValues={{ allowAutoRequest, ...props.initial }}
      onSubmit={async (values, helpers) => {
        console.log("submit", values);
        if (values.allowAutoRequest) {
          props.submit(values);
        }
        props.reject();
        return;
      }}
    >
      <Form>
        <TwDialog
          title="Reserve"
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
                {data?.reservableTemplates &&
                data?.reservableTemplates?.length == 0
                  ? "Reserve and link later"
                  : "Reserve"}
              </SubmitButton>
            </>
          }
        >
          {data?.reservableTemplates && (
            <ReserveParamsField
              name="binds"
              templates={data?.reservableTemplates.filter(notEmpty)}
            />
          )}

          <div className="mt-2">
            <TextInputField
              name="title"
              label="Title"
              description="Give this reservation a title"
            />
            <GraphQLSearchInput
              label="Imitate"
              searchFunction={searchUsers}
              name={`imitate`}
              description="Should we imitate a specific user doing this request?"
            />
            <SwitchInputField
              name="allowAutoRequest"
              label="Auto Request"
              description="Should we allow requests without explicitly specifing the kwargs?"
            />
          </div>
        </TwDialog>
      </Form>
    </Formik>
  );
};
