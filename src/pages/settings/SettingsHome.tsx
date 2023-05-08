import { useFakts } from "@jhnnsrs/fakts";
import { Form, Formik } from "formik";
import React from "react";
import {
  FuseSearchInput,
  SearchInput,
} from "../../components/forms/fields/SearchInput";
import { IntInputField } from "../../components/forms/fields/int_input";
import { SwitchInputField } from "../../components/forms/fields/switch_input";
import { available_color_maps } from "../../experimental/provider/provider";
import { PageLayout } from "../../layout/PageLayout";
import { RekuestGuard } from "../../rekuest/RekuestGuard";
import { ChangeSubmitHelper } from "../../rekuest/ui/helpers/ChangeSubmitter";
import { useSettings } from "../../settings/settings-context";
import { DebugScreen } from "../admin/DebugScreen";

export interface SettingsHomeProps {}

export const SettingsHome: React.FC<SettingsHomeProps> = (props) => {
  const { settings, setSettings } = useSettings();
  const { fakts } = useFakts();

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
                <ChangeSubmitHelper debounce={3} />
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
                  name="experimental"
                  label="Set Experimental"
                  description="Allow experimental features"
                />
                <SwitchInputField
                  name="darkMode"
                  label="Dark Mode"
                  description="Set the default for autorequest to true or false"
                />
                <IntInputField
                  name="pollInterval"
                  label="Poll Interval"
                  description="Set the default poll interval to increase or decrease the frequency of polling for new data"
                />
                <SearchInput
                  name="colorScheme"
                  labelClassName="text-black"
                  label="Color Scheme"
                  description="Set the default for colors to true or false"
                  searchFunction={async (d) => [
                    { label: "Red", value: "red" },
                    { label: "Green", value: "green" },
                    { label: "Blue", value: "blue" },
                  ]}
                />
                <FuseSearchInput
                  name="defaultColormap"
                  labelClassName="text-black"
                  label="Image Colormap"
                  description="Set the default for colors to true or false"
                  options={available_color_maps.map((c) => ({
                    label: c,
                    value: c,
                  }))}
                />
                <FuseSearchInput
                  name="defaultMaskColormap"
                  labelClassName="text-black"
                  label="Mask Colormap"
                  description="Set the default for colors to true or false"
                  options={available_color_maps.map((c) => ({
                    label: c,
                    value: c,
                  }))}
                />
              </Form>
            )}
          </Formik>
        </div>
      </div>
      <pre className="text-white">{JSON.stringify(fakts, null, 2)}</pre>
      <br />
      <RekuestGuard>
        <DebugScreen />
      </RekuestGuard>
    </PageLayout>
  );
};
