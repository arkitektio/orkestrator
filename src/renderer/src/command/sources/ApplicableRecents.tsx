import { Arkitekt } from "@/app/Arkitekt";
import { CommandActionRow } from "@/providers/smart/extensions/CommandActionRow";
import type { PassDownProps } from "@/providers/smart/extensions/types";
import { smartRegistry } from "@/providers/smart/registry";
import { CommandGroup } from "cmdk";
import { History } from "lucide-react";
import { useMemo } from "react";

import { loadRecents } from "../recents";
import { useOpenTarget } from "../useOpenTarget";
import { useCommandPalette } from "../CommandPaletteProvider";

/**
 * Where you were, shown before you type.
 *
 * Only ever renders on an empty query: once someone is typing they are looking
 * for something specific, and history above the results is in the way.
 *
 * Read fresh on each open rather than held in state — the list is written from
 * several places and localStorage is the single source of truth. Cheap enough:
 * it happens once per palette open, on at most 20 rows.
 */
export const ApplicableRecents = ({ filter, onDone }: PassDownProps) => {
  const openTarget = useOpenTarget();
  const profileId = Arkitekt.useActiveProfileId();
  const { open, modifiers } = useCommandPalette();

  const idle = !filter?.trim() && modifiers.length === 0;

  const recents = useMemo(
    () => (idle && open ? loadRecents(profileId).slice(0, 8) : []),
    // `open` is in the deps so the list is re-read each time the palette opens
    // rather than going stale for the session.
    [idle, open, profileId],
  );

  if (recents.length === 0) {
    return null;
  }

  return (
    <CommandGroup
      heading={<span className="font-light text-xs w-full items-center ml-2">Recent</span>}
    >
      {recents.map((entry) => {
        return (
          <CommandActionRow
            key={entry.kind === "entity" ? `${entry.identifier}:${entry.id}` : entry.route}
            title={entry.label}
            description={
              entry.kind === "entity"
                ? smartRegistry.getDisplayName(entry.identifier)
                : undefined
            }
            icon={History}
            onSelect={() => {
              // Goes there, and pins it too when opened with ⌘T.
              openTarget(
                entry.kind === "entity"
                  ? { kind: "entity", identifier: entry.identifier, id: entry.id, label: entry.label }
                  : { kind: "route", route: entry.route, label: entry.label },
              );
              onDone?.({ kind: "local" });
            }}
          />
        );
      })}
    </CommandGroup>
  );
};

export default ApplicableRecents;
