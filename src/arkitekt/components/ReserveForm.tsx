import { Form, Formik, FormikHelpers } from "formik";
import { Maybe } from "graphql/jsutils/Maybe";
import { useEffect } from "react";
import { SubmitButton } from "../../components/forms/fields/SubmitButton";
import {
  ArgPortFragment,
  AssignNodeEventDocument,
  AssignNodeEventSubscription,
  AssignNodeEventSubscriptionVariables,
  ChildPortFragment,
  PortKind,
  PortsFragment,
  ReserveMutationVariables,
  useAssignableTemplatesLazyQuery,
  useAssignNodeQuery,
  useSearchTemplateOptionsLazyQuery,
  useUserOptionsLazyQuery,
} from "../api/graphql";
import { withArkitekt } from "../arkitekt";
import { ChangeSubmitHelper } from "../ui/helpers/ChangeSubmitter";
import { WidgetRegistry } from "../widgets/registry";
import { useWidgetRegistry } from "../widgets/widget-context";
import * as Yup from "yup";
import { PortOptions } from "../widgets/types";
import { TextInputField } from "../../components/forms/fields/text_input";
import { SearchSelectInput } from "../../components/forms/fields/search_select_input";
import { NumberInputField } from "../../components/forms/fields/number_input";
import { SwitchInputField } from "../../components/forms/fields/switch_input";
import { useSettings } from "../../settings/settings-context";

export type ReserveFormProps = {
  initial: ReserveMutationVariables;
  onSubmit?: (
    initial: ReserveMutationVariables,
    helpers: FormikHelpers<ReserveMutationVariables>
  ) => Promise<void>;
};

const ReserveForm: React.FC<ReserveFormProps> = ({ initial, onSubmit }) => {
  const { registry } = useWidgetRegistry();

  const [searchTemplates] = withArkitekt(useSearchTemplateOptionsLazyQuery)({
    variables: { node: initial.node },
  });

  const {
    settings: { allowAutoRequest },
  } = useSettings();

  const [searchUsers] = withArkitekt(useUserOptionsLazyQuery)();

  return (
    <Formik<ReserveMutationVariables>
      enableReinitialize
      initialValues={{ allowAutoRequest, ...initial }}
      onSubmit={async (values, helpers) => {
        onSubmit && (await onSubmit(values, helpers));
      }}
      validateOnMount={true}
    >
      {(formikProps) => (
        <Form>
          <div className="mt-2 align-left text-left">
            <>
              <TextInputField
                name="title"
                label="Shorthand"
                description="A Shorthand descriptor sof this Reservation (will appear as button Title)"
              />
              <SearchSelectInput
                isMulti={true}
                lazySearch={searchTemplates}
                name={`templates`}
                description="Should we restrict this reservation to specific templates?"
              />
              <SearchSelectInput
                isMulti={false}
                lazySearch={searchUsers}
                name={`imitate`}
                description="Should we imitate a specific user doing this request?"
              />
              <SwitchInputField
                name="allowAutoRequest"
                label="Auto Request"
                description="Should we allow requests without explicitly specifing the kwargs?"
              />
              <SubmitButton className="bg-primary-400 px-3 py-1 border rounded text-white disabled:hidden visible ">
                Reserve
              </SubmitButton>
            </>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export { ReserveForm };
