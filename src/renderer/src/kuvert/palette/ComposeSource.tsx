import { useCommandPalette } from "@/core/command/CommandPaletteProvider";
import { useDialog } from "@/core/dialogs/registry";
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";
import type { PassDownProps } from "@/core/smart/extensions/types";
import { CommandGroup } from "cmdk";
import { PenSquare } from "lucide-react";
import { parseRecipients } from "../format";

/** cmdk keys rows by `value`; fixed, so the row keeps its place as you type. */
const COMPOSE_VALUE = "kuvert-new-mail";

const WORDS = ["new mail", "compose", "write mail", "email", "send mail", "new email"];

/** A typed word that starts one of the command's words ("comp", "new m", "mail"). */
const matchesCommand = (query: string) => {
  const q = query.toLowerCase();
  return q.length >= 2 && WORDS.some((w) => w.startsWith(q) || w.split(" ").some((part) => part.startsWith(q)));
};

/**
 * "New mail" in the ⌘K palette, with nothing selected: the one mail verb that
 * needs no object (the others are local actions on a mail, conversation,
 * folder or mailbox). A typed address becomes "Write to …" with it filled in.
 *
 * Registered as kuvert's `paletteSources` builtin, so the host mounts it under
 * kuvert's guard.
 */
export const ComposeSource = ({ filter, onDone }: PassDownProps) => {
  const { query } = useCommandPalette();
  const { openSheet } = useDialog();
  const typed = (query || filter || "").trim();
  const { recipients, invalid } = parseRecipients(typed);
  const address = typed && invalid.length === 0 && recipients.length > 0 ? recipients : null;

  if (!address && !matchesCommand(typed)) return null;

  return (
    <CommandGroup
      heading={<span className="ml-2 inline-flex w-full items-center gap-2 text-xs font-light">Mail</span>}
    >
      <CommandActionRow
        value={COMPOSE_VALUE}
        onSelect={() => {
          openSheet("kuvertcompose", { to: address ? [typed] : undefined }, { size: "large" });
          onDone?.({ kind: "local" });
        }}
        title={address ? `Write to ${recipients.map((r) => r.address).join(", ")}` : "New mail"}
        description={address ? "Start a new mail to this address" : "Write a new mail"}
        icon={PenSquare}
      />
    </CommandGroup>
  );
};
