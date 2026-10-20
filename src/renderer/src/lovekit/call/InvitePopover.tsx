import { useStructureOptions } from "@/core/modules/hooks/useStructureOptions";
import type { StructureOption } from "@/core/modules/host/options";
import { reportError } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/core/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { useInviteToCallMutation } from "@/lovekit/api/graphql";
import { Check, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Ask people into a call, from a popout on the invite button: pick a person
 * and their app rings with a Join button, on every device they have it open
 * on. Nothing goes to a phone, and anyone in the organization can join
 * without one from "Join calls".
 */
export const InvitePopover = ({
  callId,
  title,
  size = "icon",
}: {
  callId: string;
  title: string;
  size?: "icon" | "icon-sm";
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<StructureOption[] | undefined>(undefined);
  const [invited, setInvited] = useState<string[]>([]);
  const searchUsers = useStructureOptions("@lok/user");
  const [invite] = useInviteToCallMutation();

  useEffect(() => {
    if (!open || !searchUsers) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsers({ search })
        .then((found) => !cancelled && setPeople(found))
        .catch(() => !cancelled && setPeople([]));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search, searchUsers]);

  const ask = (person: StructureOption) => {
    if (invited.includes(person.value)) return;
    // The row's check is the confirmation; a failure takes it back.
    setInvited((current) => [...current, person.value]);
    invite({ variables: { input: { call: callId, users: [person.value] } } }).catch((error) => {
      setInvited((current) => current.filter((id) => id !== person.value));
      reportError(error, `Couldn't invite ${person.label}`);
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSearch("");
          setInvited([]);
        }
      }}
    >
      <PopoverTrigger asChild>
        <TooltipButton size={size} variant="outline" tooltip="Invite people" aria-label="Invite people">
          <UserPlus />
        </TooltipButton>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder={`Invite to “${title}”…`} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {!searchUsers
                ? "The people of the organization are not available right now."
                : people
                  ? "Nobody found."
                  : "Loading…"}
            </CommandEmpty>
            {people && people.length > 0 && (
              <CommandGroup heading="Their app rings with a Join button">
                {people.map((person) => {
                  const done = invited.includes(person.value);
                  return (
                    <CommandItem key={person.value} value={person.value} onSelect={() => ask(person)}>
                      <StructureDisplay identifier="@lok/user" id={person.value} variant="avatar" className="h-5 w-5" />
                      <span className="truncate">{person.label}</span>
                      {done && <Check className="ml-auto h-4 w-4 text-primary" aria-label="Invited" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
