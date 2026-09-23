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
import { Slider } from "@/components/ui/slider";
import { getPlatform } from "@/lib/platform";
import type { Settings } from "@/providers/settings/validator";
import { Minus, Plus } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { ColorModeField } from "../components/ColorModeField";
import { SettingsForm } from "../components/SettingsForm";
import { SettingsPage } from "../components/SettingsPage";
import { ThemeCustomizer } from "../components/ThemeCustomizer";

/** The OS draws this (macOS vibrancy, Windows acrylic); Linux and the browser have nothing to switch on. */
const canDrawGlass = () => getPlatform() === "darwin" || getPlatform() === "win32";

const GlassFields = () => {
  const { control } = useFormContext<Settings>();
  const railGlass = useWatch({ control, name: "railGlass" });
  return (
    <>
      <SwitchField
        name="railGlass"
        label="Translucent sidebar"
        description="Let the desktop show through the sidebar, blurred, the way macOS windows do"
      />
      {railGlass && (
        <FormField
          control={control}
          name="railGlassTransparency"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center justify-between gap-4">
                <FormLabel>
                  Sidebar transparency ({Math.round((field.value ?? 0.7) * 100)}%)
                </FormLabel>
                <FormControl>
                  <Slider
                    className="w-40"
                    min={0}
                    max={100}
                    step={5}
                    value={[Math.round((field.value ?? 0.7) * 100)]}
                    onValueChange={([value]) => field.onChange(value / 100)}
                  />
                </FormControl>
              </div>
              <FormDescription>
                How much of the desktop shows through. Lower keeps more of the sidebar colour for legibility.
              </FormDescription>
            </FormItem>
          )}
        />
      )}
    </>
  );
};

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

const BrandFields = () => {
  const { control } = useFormContext<Settings>();
  return <ThemeCustomizer control={control} />;
};

export const AppearancePage = () => (
  <SettingsPage slug="appearance">
    <SettingsForm>
      <Card>
        <CardHeader>
          <CardTitle>Colour</CardTitle>
          <CardDescription>Light or dark, and the brand colours the app is tinted with.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ColorModeField />
          <SwitchField
            name="sceneThemeSync"
            label="Scene theme sync"
            description="Tint the app to the main layer's colormap while a scene or image is open"
          />
          <BrandFields />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Size</CardTitle>
          <CardDescription>How large the page content is drawn.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PageZoomField />
        </CardContent>
      </Card>

      {canDrawGlass() && (
        <Card>
          <CardHeader>
            <CardTitle>Sidebar</CardTitle>
            <CardDescription>How the rail sits over your desktop.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <GlassFields />
          </CardContent>
        </Card>
      )}
    </SettingsForm>
  </SettingsPage>
);

export default AppearancePage;
