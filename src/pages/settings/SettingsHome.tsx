import { Form, Formik } from "formik";
import React, { useState, useEffect } from "react";
import { ChangeSubmitHelper } from "../../arkitekt/ui/helpers/ChangeSubmitter";
import { SelectInputField } from "../../components/forms/fields/select_input";
import { SwitchInputField } from "../../components/forms/fields/switch_input";
import { PageLayout } from "../../layout/PageLayout";
import { useSettings } from "../../settings/settings-context";

export interface SettingsHomeProps {}

export const SettingsHome: React.FC<SettingsHomeProps> = (props) => {
  const { settings, setSettings } = useSettings();

  return (
    <PageLayout>
      <div className="flex flex-col px-5">
        <div className="mt-2 align-left text-xl text-white">
          Global Settings
        </div>
        <div className="flex text-left text-white mt-2">
          <Formik
            enableReinitialize
            initialValues={settings}
            onSubmit={async (values, formikHelpers) => {
              console.log("updating settings", values);
              setSettings(values);
            }}
          >
            {(formikProps) => (
              <Form>
                <ChangeSubmitHelper debounce={3} formik={formikProps} />
                <SwitchInputField
                  name="autoResolve"
                  label="Auto Resolve"
                  description="Should we allow requests without explicitly specifing the kwargs?"
                />
                <SwitchInputField
                  name="allowAutoRequest"
                  label="Default for Auto Request"
                  description="Set the default for autorequest to true or false"
                />
                <SwitchInputField
                  name="darkMode"
                  label="Dark Mode"
                  description="Set the default for autorequest to true or false"
                />
                <SelectInputField
                  name="colorScheme"
                  className="text-black"
                  label="Color Scheme"
                  description="Set the default for colors to true or false"
                  options={[
                    { label: "Red", value: "red" },
                    { label: "Green", value: "green" },
                    { label: "Blue", value: "blue" },
                  ]}
                />
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </PageLayout>
  );
};
