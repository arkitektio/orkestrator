import { SwitchField } from "@/core/forms/SwitchField";
import { Card, CardContent } from "@/core/ui/card";
import { SettingsForm } from "../components/SettingsForm";
import { SettingsPage } from "../components/SettingsPage";

/**
 * Recent work, on by default. Switching one off falls back to how the app worked before that
 * feature landed.
 */
export const ExperimentsPage = () => (
  <SettingsPage slug="experiments">
    <SettingsForm>
      <Card>
        <CardContent className="space-y-6">
          <SwitchField
            name="experimentMenuPrefetch"
            label="Menu prefetching"
            description="Load the right-click menu's actions and shortcuts while you hover, so it opens filled instead of empty"
          />
          <SwitchField
            name="experimentAnnotationHover"
            label="Annotation hover button"
            description="Pin a button to the annotation under the pointer in a scene; resting on it unfolds what is known about the shape and what runs on it, a click keeps it open"
          />
          <SwitchField
            name="experimentTaskIsland"
            label="Live tasks in the sidebar"
            description="Show running tasks as rows at the bottom of the rail, not only on their own page"
          />
        </CardContent>
      </Card>
    </SettingsForm>
  </SettingsPage>
);

export default ExperimentsPage;
