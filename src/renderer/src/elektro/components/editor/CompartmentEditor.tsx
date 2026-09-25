import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/components/ui/popover";
import { RgbaColorPicker } from "react-colorful";
import { EditableCompartment } from "../../lib/modelSerialization";
import { objectToRgba, rgbaToCss, rgbaToObject } from "../../lib/color";
import { IonListEditor } from "./IonListEditor";
import { MechanismPicker } from "./MechanismPicker";
import { SectionParamsEditor } from "./SectionParamsEditor";

/**
 * Swatch + popover editor for a compartment's optional render `color`. Emits an
 * `[r, g, b, a]` wire list, or `null` when reset (falls back to the depth-based
 * default in the renderers).
 */
const CompartmentColorEditor = ({
  color,
  onChange,
}: {
  color: EditableCompartment["color"];
  onChange: (color: EditableCompartment["color"]) => void;
}) => {
  const swatch = rgbaToCss(color) ?? "transparent";
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Pick compartment color"
            className="h-7 w-7 flex-none rounded border bg-[repeating-conic-gradient(#0000000d_0_25%,transparent_0_50%)] bg-[length:8px_8px]"
          >
            <span
              className="block h-full w-full rounded"
              style={{ background: swatch }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <RgbaColorPicker
            color={rgbaToObject(color)}
            onChange={(c) => onChange(objectToRgba(c))}
          />
        </PopoverContent>
      </Popover>
      <span className="flex-1 font-mono text-[11px] text-muted-foreground">
        {color ? rgbaToCss(color) : "no color (depth default)"}
      </span>
      {color != null && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-muted-foreground"
          onClick={() => onChange(null)}
        >
          Reset
        </Button>
      )}
    </div>
  );
};

/**
 * Edits a single compartment's biophysics — its color, mechanisms, ions and
 * section parameters. Controlled: every change re-emits the whole compartment.
 */
export const CompartmentEditor = ({
  compartment,
  onChange,
}: {
  compartment: EditableCompartment;
  onChange: (update: Partial<EditableCompartment>) => void;
}) => (
  <div className="flex flex-col gap-4 pt-2 px-1">
    <div className="space-y-1.5">
      <Label className="text-xs">Color</Label>
      <CompartmentColorEditor
        color={compartment.color}
        onChange={(color) => onChange({ color })}
      />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">Mechanisms</Label>
      <MechanismPicker
        value={compartment.mechanisms}
        onChange={(mechanisms) => onChange({ mechanisms })}
      />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">Ions</Label>
      <IonListEditor
        ions={compartment.ions}
        onChange={(ions) => onChange({ ions })}
      />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">Section parameters</Label>
      <SectionParamsEditor
        value={compartment.sectionParams}
        onChange={(sectionParams) => onChange({ sectionParams })}
      />
    </div>
  </div>
);
