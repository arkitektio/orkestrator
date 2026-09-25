import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { IonStyle } from "../../api/graphql";
import { EditableIon } from "../../lib/modelSerialization";
import { QuantityInput } from "@/core/components/fields/QuantityInput";

const ION_STYLES: { value: IonStyle; label: string }[] = [
  { value: IonStyle.FixedReversal, label: "Fixed reversal" },
  { value: IonStyle.Nernst, label: "Nernst" },
  { value: IonStyle.Accumulated, label: "Accumulated" },
];

const emptyIon = (): EditableIon => ({
  ion: "",
  style: IonStyle.FixedReversal,
  reversalPotential: null,
  internalConcentration: null,
  externalConcentration: null,
});

/**
 * Controlled editor for a list of `Ion`s — used both per-compartment and for the
 * model-wide default ions. Owns no state; every change re-emits the whole list.
 */
export const IonListEditor = ({
  ions,
  onChange,
}: {
  ions: EditableIon[];
  onChange: (ions: EditableIon[]) => void;
}) => {
  const patch = (index: number, update: Partial<EditableIon>) =>
    onChange(ions.map((ion, i) => (i === index ? { ...ion, ...update } : ion)));

  return (
    <div className="space-y-2">
      {ions.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No ions.</p>
      )}
      {ions.map((ion, i) => (
        <div key={i} className="space-y-1.5 rounded border p-2">
          <div className="flex items-center gap-1">
            <Input
              className="h-7 font-mono"
              placeholder="ion (e.g. na)"
              value={ion.ion}
              onChange={(e) => patch(i, { ion: e.target.value })}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 flex-none p-0 text-muted-foreground"
              title="Remove ion"
              onClick={() => onChange(ions.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Select value={ion.style} onValueChange={(v) => patch(i, { style: v as IonStyle })}>
            <SelectTrigger className="h-7">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ION_STYLES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Reversal potential</Label>
            <QuantityInput
              dimension="voltage"
              value={ion.reversalPotential}
              onChange={(v) => patch(i, { reversalPotential: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Internal conc.</Label>
              <QuantityInput
                dimension="concentration"
                value={ion.internalConcentration}
                onChange={(v) => patch(i, { internalConcentration: v })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">External conc.</Label>
              <QuantityInput
                dimension="concentration"
                value={ion.externalConcentration}
                onChange={(v) => patch(i, { externalConcentration: v })}
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => onChange([...ions, emptyIon()])}
      >
        <Plus className="mr-2 h-3 w-3" />
        Add ion
      </Button>
    </div>
  );
};
