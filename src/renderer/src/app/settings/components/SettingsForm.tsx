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
 *
 * For the same reason the form FOLLOWS the store: settings also change behind
 * an open page (the hardware probe landing, the scene's debug panel, another
 * window), and a form still holding the values it mounted with would write
 * them back over that change on its next edit.
 */
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const SettingsForm = ({ children }: { children: React.ReactNode }) => {
  const { settings, setSettings } = useSettings();
  const form = useForm<Settings>({ defaultValues: settings });
  const {
    formState: { isValid, isValidating },
  } = form;
  const data = useWatch({ control: form.control });

  // Store → form. Compared by value: the store mints a new object on every
  // save, including the ones this form made.
  useEffect(() => {
    if (!same(settings, form.getValues())) form.reset(settings);
  }, [settings, form]);

  // Form → store. Skipped when nothing differs, so adopting a store change
  // above does not echo it straight back.
  useEffect(() => {
    if (isValid && !isValidating && !same(data, settings)) setSettings(data as Settings);
    // `settings` is read, not followed: only an edit should save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isValid, isValidating, setSettings]);

  return (
    <Form {...form}>
      <form className="space-y-8">{children}</form>
    </Form>
  );
};

export default SettingsForm;
