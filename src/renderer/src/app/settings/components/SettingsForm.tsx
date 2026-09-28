import { Form } from "@/core/ui/form";
import { useSettings } from "@/core/settings/store/SettingsContext";
import type { Settings } from "@/core/settings/store/validator";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";

/**
 * The auto-saving form the settings pages share.
 *
 * Seeded with the WHOLE settings object even though a page renders only its
 * own fields: `setSettings` replaces, not merges, so a form that knew only its
 * fields would wipe every other page's on first save. Fields read the form
 * through `useFormContext`, and every valid change is persisted at once —
 * there is no Save button anywhere in Settings.
 */
export const SettingsForm = ({ children }: { children: React.ReactNode }) => {
  const { settings, setSettings } = useSettings();
  const form = useForm<Settings>({ defaultValues: settings });
  const {
    formState: { isValid, isValidating },
  } = form;
  const data = useWatch({ control: form.control });

  useEffect(() => {
    if (isValid && !isValidating) setSettings(data as Settings);
  }, [data, isValid, isValidating, setSettings]);

  return (
    <Form {...form}>
      <form className="space-y-8">{children}</form>
    </Form>
  );
};

export default SettingsForm;
