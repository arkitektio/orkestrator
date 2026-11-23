import { Check, Handshake } from "lucide-react";
import { useState } from "react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/core/ui/command";
import { FilterTrigger } from "@/core/ui/filter-bar";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";

import { useLokCollaborations } from "./useCollaborations";

/**
 * A filter-bar pill: only what is in one collaboration. `value` is the collaboration's key,
 * which every service's `inCollaboration` (and mikro's `RootFilter.collaboration`) takes; the
 * choices are lok's collaborations of the organization.
 */
export const CollaborationFilter = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (key: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const { collaborations = [] } = useLokCollaborations();
  const picked = collaborations.find((collaboration) => collaboration.key === value);
  const pick = (key: string | null) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterTrigger active={!!value} icon={Handshake} aria-label="Collaboration">
          <span className="max-w-40 truncate">{value ? (picked?.name ?? "Collaboration") : "Any collaboration"}</span>
        </FilterTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search collaborations…" />
          <CommandList>
            <CommandEmpty>No collaboration matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="any collaboration" onSelect={() => pick(null)}>
                Any collaboration
                {!value && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
              {collaborations.map((collaboration) => (
                <CommandItem
                  key={collaboration.key}
                  value={`${collaboration.name} ${collaboration.key}`}
                  onSelect={() => pick(collaboration.key)}
                >
                  <span className="truncate">{collaboration.name}</span>
                  {value === collaboration.key && <Check className="ml-auto h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
