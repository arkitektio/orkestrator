import { SwitchField } from "@/components/fields/SwitchField";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import type { Settings } from "@/providers/settings/validator";
import { FlaskConical, Minus, Plus } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { SettingsForm } from "../components/SettingsForm";
import { SettingsPage } from "../components/SettingsPage";

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.05;

const PageZoomField = () => {
  const { control } = useFormContext<Settings>();
  return (
    <FormField
      control={control}
      name="defaultZoomLevel"
      render={({ field }) => {
        const value = field.value || 1;
        return (
          <FormItem>
            <div className="flex flex-row items-center justify-between w-full gap-2">
              <div className="flex flex-col gap-1">
                <FormLabel>Page zoom ({Math.round(value * 100)}%)</FormLabel>
                <FormDescription>
                  Scales the page content. The sidebar keeps its size.
                </FormDescription>
              </div>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => field.onChange(Math.max(ZOOM_MIN, value - ZOOM_STEP))}
                    disabled={value <= ZOOM_MIN}
                    aria-label="Zoom out"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[80px] text-center text-sm font-medium">
                    {Math.round(value * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => field.onChange(Math.min(ZOOM_MAX, value + ZOOM_STEP))}
                    disabled={value >= ZOOM_MAX}
                    aria-label="Zoom in"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </FormControl>
            </div>
          </FormItem>
        );
      }}
    />
  );
};

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
          <PageZoomField />
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
