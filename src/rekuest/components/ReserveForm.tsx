import { Form, Formik, FormikHelpers } from "formik";
import { GraphQLSearchInput } from "../../components/forms/fields/SearchInput";
import { SubmitButton } from "../../components/forms/fields/SubmitButton";
import { SwitchInputField } from "../../components/forms/fields/switch_input";
import { TextInputField } from "../../components/forms/fields/text_input";
import { notEmpty } from "../../floating/utils";
import { useDetailClientQuery, useUserQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/context";
import { useMikro } from "../../mikro/MikroContext";
import { useSettings } from "../../settings/settings-context";
import { withRekuest } from "../RekuestContext";
import {
  ReserveMutationVariables,
  useReservableTemplatesQuery,
  useUserOptionsLazyQuery,
} from "../api/graphql";
import { useWidgetRegistry } from "../widgets/widget-context";
import { ReserveParamsField } from "./ReserveParamsField";

export type ReserveFormProps = {
  initial: ReserveMutationVariables;
  onSubmit?: (
    initial: ReserveMutationVariables,
    helpers: FormikHelpers<ReserveMutationVariables>
  ) => Promise<void>;
};

export const UserImage: React.FC<{ sub: string }> = ({ sub }) => {
  const { data, error } = withMan(useUserQuery)({
    variables: { id: sub },
  });

  const { s3resolve } = useMikro();
  return (
    <>
      {data?.user?.id && (
        <img
          className={`h-8 w-8 rounded-3 rounded `}
          src={
            data?.user?.profile?.avatar
              ? s3resolve(data?.user?.profile.avatar)
              : `https://eu.ui-avatars.com/api/?name=${data?.user?.username}&background=random`
          }
          alt=""
        />
      )}
    </>
  );
};

export const App: React.FC<{ clientId: string }> = ({ clientId }) => {
  const { data, error } = withMan(useDetailClientQuery)({
    variables: { clientId: clientId },
  });

  const { s3resolve } = useMikro();
  return (
    <div>
      {data?.client?.release?.logo && (
        <img
          className={`h-20 w-auto rounded-2 
          cursor-pointer`}
          src={s3resolve(data?.client?.release?.logo)}
          alt=""
        />
      )}
      <div className="text-xs text-gray-500">
        {data?.client?.release?.app?.identifier}
      </div>
      <div className="text-xs text-gray-500">
        {data?.client?.release?.version}
      </div>
    </div>
  );
};

const ReserveForm: React.FC<ReserveFormProps> = ({ initial, onSubmit }) => {
  const { registry } = useWidgetRegistry();

  const { data, error } = withRekuest(useReservableTemplatesQuery)({
    variables: { node: initial.node },
    fetchPolicy: "network-only",
  });

  const {
    settings: { allowAutoRequest },
  } = useSettings();

  const { s3resolve } = useMikro();

  const [searchUsers] = withRekuest(useUserOptionsLazyQuery)();

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
          <div className="mt-2 align-left text-left @container">
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
              <SubmitButton className="bg-primary-400 px-3 py-1 border rounded text-white disabled:hidden visible ">
                {data?.reservableTemplates &&
                data?.reservableTemplates?.length == 0
                  ? "Reserve and link later"
                  : "Reserve"}
              </SubmitButton>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export { ReserveForm };
