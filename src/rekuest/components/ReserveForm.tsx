import { Form, Formik, FormikHelpers } from "formik";
import { useState } from "react";
import { SearchSelectInput } from "../../components/forms/fields/search_select_input";
import { SubmitButton } from "../../components/forms/fields/SubmitButton";
import { SwitchInputField } from "../../components/forms/fields/switch_input";
import { TextInputField } from "../../components/forms/fields/text_input";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { SectionTitle } from "../../layout/SectionTitle";
import { useAppQuery, useUserQuery } from "../../lok/api/graphql";
import { UserEmblem } from "../../lok/components/UserEmblem";
import { withMan } from "../../lok/context";
import { useMikro } from "../../mikro/MikroContext";
import { useSettings } from "../../settings/settings-context";
import {
  ListTemplateFragment,
  ReservableTemplateFragment,
  ReserveMutationVariables,
  Template,
  useReservableTemplatesQuery,
  useSearchTemplateOptionsLazyQuery,
  useUserOptionsLazyQuery,
} from "../api/graphql";
import { withRekuest } from "../RekuestContext";
import { useWidgetRegistry } from "../widgets/widget-context";
import { StatusPulse } from "./generic/StatusPulse";
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
  const { data, error } = withMan(useAppQuery)({
    variables: { clientId: clientId },
  });

  const { s3resolve } = useMikro();
  return (
    <div>
      {data?.app?.logo && (
        <img
          className={`h-20 w-auto rounded-2 
          cursor-pointer`}
          src={s3resolve(data?.app?.logo)}
          alt=""
        />
      )}
      <div className="text-xs text-gray-500">{data?.app?.identifier}</div>
      <div className="text-xs text-gray-500">{data?.app?.version}</div>
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
                name="reference"
                label="Shorthand"
                description="Your common name for this reservation (will appear as button text)"
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
