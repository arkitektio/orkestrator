import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Camera, Settings2 } from "lucide-react";
import { type HudSettings, useMorphologyStore } from "../stores/morphologyStore";

const SettingRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const HudRow = ({ label, field }: { label: string; field: keyof HudSettings }) => {
  const checked = useMorphologyStore((s) => s.hud[field]);
  const setHud = useMorphologyStore((s) => s.setHud);
  return <SettingRow label={label} checked={checked} onChange={(v) => setHud({ [field]: v })} />;
};

/**
 * How the morphology is DRAWN, behind one gear — the scene's `SceneSettings`
 * shape: the screenshot first (an action, but it answers the same question),
 * then the viewport furniture, then camera behaviour.
 */
export const MorphologySettings = ({ fileName = "morphology" }: { fileName?: string }) => {
  const capture = useMorphologyStore((s) => s.capture);

  const onScreenshot = async () => {
    if (!capture) return;
    const blob = await capture();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}-screenshot.png`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="xs" className="h-7 w-8 bg-black p-0" title="View settings">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <Button
          variant="outline"
          size="xs"
          className="mb-1 h-7 w-full justify-start gap-2"
          onClick={onScreenshot}
          disabled={!capture}
          title="Save a PNG screenshot of the current view"
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="text-xs">Save screenshot</span>
        </Button>

        <div className="border-t pt-1">
          <HudRow label="Scale bar" field="scaleBar" />
          <HudRow label="Grid" field="grid" />
          <HudRow label="Origin axis" field="axis" />
        </div>

        <div className="mt-1 border-t pt-1">
          <HudRow label="Smooth camera" field="smoothCamera" />
          <HudRow label="Zoom to cursor" field="zoomToCursor" />
        </div>
      </PopoverContent>
    </Popover>
  );
};
