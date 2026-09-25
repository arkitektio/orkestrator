import { ElektroGuard } from "@/elektro/api/funcs";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { X } from "lucide-react";
import { useState } from "react";
import { useListMechanismsQuery } from "../../api/graphql";

interface MechanismPickerProps {
  value: string[];
  onChange: (mechanisms: string[]) => void;
}

const MechanismChips = ({ value, onChange }: MechanismPickerProps) => {
  if (value.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No mechanisms.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {value.map((mech) => (
        <span
          key={mech}
          className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium"
        >
          {mech}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            title={`Remove ${mech}`}
            onClick={() => onChange(value.filter((m) => m !== mech))}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
};

/** Add a mechanism by typing its name — used as the elektro-unavailable fallback. */
const FreeTextMechanismPicker = ({ value, onChange }: MechanismPickerProps) => {
  const [draft, setDraft] = useState("");
  const add = () => {
    const name = draft.trim();
    if (name && !value.includes(name)) onChange([...value, name]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <MechanismChips value={value} onChange={onChange} />
      <div className="flex items-center gap-1">
        <Input
          className="h-7 font-mono"
          placeholder="mechanism name"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <Button size="sm" variant="outline" className="h-7 flex-none" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
};

/** Add a mechanism from the elektro catalogue (falls back to free text below). */
const MechanismPickerInner = ({ value, onChange }: MechanismPickerProps) => {
  const { data } = useListMechanismsQuery();
  const available = (data?.mechanisms ?? [])
    .map((m) => m.name)
    .filter((name) => !value.includes(name));

  return (
    <div className="space-y-1.5">
      <MechanismChips value={value} onChange={onChange} />
      <Select
        value=""
        onValueChange={(name) => {
          if (name && !value.includes(name)) onChange([...value, name]);
        }}
      >
        <SelectTrigger className="h-7">
          <SelectValue placeholder="Add mechanism…" />
        </SelectTrigger>
        <SelectContent>
          {available.length === 0 ? (
            <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
              No more mechanisms
            </div>
          ) : (
            available.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

/**
 * Edits a compartment's `mechanisms` list. The catalogue-backed picker runs its
 * elektro query only when the service is ready (Guard from the outside — the
 * hook fires on mount); otherwise it degrades to a free-text picker so
 * mechanisms can still be typed.
 */
export const MechanismPicker = (props: MechanismPickerProps) => (
  <ElektroGuard unavailable={<FreeTextMechanismPicker {...props} />}>
    <MechanismPickerInner {...props} />
  </ElektroGuard>
);
