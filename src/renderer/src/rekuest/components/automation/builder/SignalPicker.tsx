import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/core/ui/command";
import { SignalDeclarationFragment } from "@/rekuest/api/graphql";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { useMemo } from "react";
import { SignalWhen } from "./initial";

/**
 * Which signal to wait for: everything the hub's services declare, by
 * service, searchable. With `fits`, the signals the chosen action can be
 * handed come first; the others stay reachable (the builder then asks for
 * another action).
 */
export const SignalPicker = ({
  declarations,
  fits,
  fitsLabel,
  onPick,
}: {
  declarations: SignalDeclarationFragment[];
  fits?: Set<string>;
  fitsLabel?: string;
  onPick: (when: SignalWhen) => void;
}) => {
  const groups = useMemo(() => {
    const map = new Map<string, SignalDeclarationFragment[]>();
    for (const declaration of declarations) {
      const group =
        fits && fitsLabel && fits.has(declaration.identifier) ? fitsLabel : declaration.service.name;
      map.set(group, [...(map.get(group) ?? []), declaration]);
    }
    return [...map.entries()].sort(([a], [b]) =>
      a === fitsLabel ? -1 : b === fitsLabel ? 1 : a.localeCompare(b),
    );
  }, [declarations, fits, fitsLabel]);

  return (
    <Command className="rounded-md border">
      <CommandInput placeholder="Search signals…" />
      <CommandList className="max-h-64">
        <CommandEmpty>No signal matches.</CommandEmpty>
        {groups.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((declaration) => (
              <CommandItem
                key={declaration.id}
                value={`${declaration.identifier} ${declaration.kind} ${declaration.service.name} ${declaration.description ?? ""}`}
                onSelect={() =>
                  onPick({ identifier: declaration.identifier, kind: declaration.kind })
                }
                className="flex flex-col items-start gap-0.5"
              >
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-xs">{declaration.identifier}</span>
                  <span>is {KIND_LABELS[declaration.kind]}</span>
                </span>
                {(declaration.description || declaration.descriptorKeys.length > 0) && (
                  <span className="text-xs text-muted-foreground">
                    {declaration.description}
                    {declaration.description && declaration.descriptorKeys.length > 0 && " · "}
                    {declaration.descriptorKeys.join(", ")}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
};
