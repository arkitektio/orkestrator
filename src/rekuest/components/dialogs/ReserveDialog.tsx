import { Form, Formik } from "formik";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { SwitchInputField } from "../../../components/forms/fields/switch_input";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { notEmpty } from "../../../floating/utils";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import { withLok } from "../../../lok/LokContext";
import { useUserOptionsLazyQuery } from "../../../lok/api/graphql";
import { useSettings } from "../../../settings/settings-context";
import { withRekuest } from "../../RekuestContext";
import {
  ReserveMutationVariables,
  useDetailNodeQuery,
  useReservableTemplatesQuery,
} from "../../api/graphql";
import { NodeDescription } from "../NodeDescription";
import { ReserveParamsField } from "../ReserveParamsField";

export type IMyWhalesProps = {};

export const ReserveDialog = (
  props: Submit<ReserveMutationVariables> & {
    initial: ReserveMutationVariables;
  }
) => {
  const { data: nodedata } = withRekuest(useDetailNodeQuery)({
    variables: { id: props.initial.node, template: props.initial.template },
  });

  const { data, error } = withRekuest(useReservableTemplatesQuery)({
    variables: { node: props.initial.node },
    fetchPolicy: "network-only",
  });

  const [searchUsers] = withLok(useUserOptionsLazyQuery)();

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
          <div className="text-2xl mb-2">{nodedata?.node?.name}</div>
          <div className="text-sm mb-2">
            {nodedata?.node?.description && (
              <NodeDescription description={nodedata.node.description} />
            )}
          </div>
          <div className="mt-2">
            <TextInputField
              name="title"
              label="Title"
              description="Give this reservation a title"
            />
            <div className="font-light">Choose connecting apps</div>
            <div className="p-2">
              {data?.reservableTemplates && (
                <ReserveParamsField
                  name="binds"
                  templates={data?.reservableTemplates.filter(notEmpty)}
                />
              )}
            </div>
            <div className="font-light text-xs mb-2">
              This will give us the instruction of how you want to use this
              functionality
            </div>
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
