import { SwitchField } from "@/components/fields/SwitchField";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlaskConical } from "lucide-react";
import { SettingsForm } from "../components/SettingsForm";
import { SettingsPage } from "../components/SettingsPage";

export const GeneralPage = () => (
  <SettingsPage slug="general">
    <SettingsForm>
      <Card>
        <CardHeader>
          <CardTitle>Browsing</CardTitle>
          <CardDescription>How pages and items behave as you move around.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SwitchField
            name="showHoverCards"
            label="Hover previews"
            description="Show a detail preview card when hovering over items"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Experiments
          </CardTitle>
          <CardDescription>
            Recent work, on by default. Switch one off if it misbehaves — the app falls back to
            how it worked before that feature landed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SwitchField
            name="experimentMenuPrefetch"
            label="Menu prefetching"
            description="Load the right-click menu's actions and shortcuts while you hover, so it opens filled instead of empty"
          />
          <SwitchField
            name="experimentAnnotationHover"
            label="Annotation hover button"
            description="Pin an action button to the annotation under the pointer in a scene"
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

export default GeneralPage;
