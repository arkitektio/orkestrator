import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { EditableModelWide } from "../../lib/modelSerialization";
import { QuantityInput } from "@/core/forms/QuantityInput";
import { IonListEditor } from "./IonListEditor";
import { MechanismGlobalsEditor } from "./MechanismGlobalsEditor";

/**
 * Edits the model-wide config: bath temperature, initial potential, label, the
 * default axial resistivity / membrane capacitance, model-wide default ions and
 * the GLOBAL mechanism parameters. Controlled via `patch`.
 */
export const ModelConfigPanel = ({
  value,
  patch,
}: {
  value: EditableModelWide;
  patch: (update: Partial<EditableModelWide>) => void;
}) => (
  <div className="flex flex-col gap-4 pt-2 px-1">
    <div className="space-y-1">
      <Label className="text-xs">Label</Label>
      <Input
        className="h-8"
        placeholder="optional label"
        value={value.label ?? ""}
        onChange={(e) => patch({ label: e.target.value || null })}
      />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-xs">Temperature</Label>
        <QuantityInput
          dimension="temperature"
          value={value.temperature}
          onChange={(v) => patch({ temperature: v })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">V init</Label>
        <QuantityInput
          dimension="voltage"
          value={value.vInit}
          onChange={(v) => patch({ vInit: v })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Axial resistivity (Ra)</Label>
        <QuantityInput
          dimension="resistivity"
          value={value.ra}
          onChange={(v) => patch({ ra: v })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Membrane capacitance (cm)</Label>
        <QuantityInput
          dimension="capacitance"
          value={value.cm}
          onChange={(v) => patch({ cm: v })}
        />
      </div>
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">Default ions</Label>
      <IonListEditor ions={value.ions} onChange={(ions) => patch({ ions })} />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">Global mechanism parameters</Label>
      <MechanismGlobalsEditor
        value={value.mechanismGlobals}
        onChange={(mechanismGlobals) => patch({ mechanismGlobals })}
      />
    </div>
  </div>
);
