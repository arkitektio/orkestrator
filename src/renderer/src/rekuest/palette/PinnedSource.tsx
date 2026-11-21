import { useCommandPalette } from "@/core/command/CommandPaletteProvider";
import { EntityRow } from "@/core/command/sources/entity/EntityRow";
import { GroupHeading } from "@/core/command/sources/entity/shared";
import type { PassDownProps } from "@/core/smart/extensions/types";
import { usePinnedQuery } from "@/rekuest/api/graphql";
import { CommandGroup } from "cmdk";

/**
 * What you pinned in rekuest — materialized bloks, bloks, agents — to open from anywhere.
 *
 * Like Recent, only on an empty query: a search hit is the same entity row, and two rows
 * sharing a cmdk value trap the arrow keys between them.
 */
export const PinnedSource = ({ filter, onDone }: PassDownProps) => {
  const { open, modifiers } = useCommandPalette();
  const idle = open && !filter?.trim() && modifiers.length === 0;
  const { data } = usePinnedQuery({ skip: !idle, fetchPolicy: "cache-and-network" });

  if (!idle || !data) return null;
  const rows = [
    ...data.materializedBloks.map((m) => ({
      identifier: "@rekuest/materialized_blok",
      id: m.id,
      label: m.name || m.blok.name,
      description: "Materialized blok",
    })),
    ...data.bloks.map((b) => ({ identifier: "@rekuest/blok", id: b.id, label: b.name, description: "Blok" })),
    ...data.agents.map((a) => ({ identifier: "@rekuest/agent", id: a.id, label: a.name, description: "Agent" })),
  ];
  if (rows.length === 0) return null;

  return (
    <CommandGroup heading={<GroupHeading>Pinned</GroupHeading>}>
      {rows.map((row) => (
        <EntityRow key={`${row.identifier}:${row.id}`} {...row} onDone={() => onDone?.({ kind: "local" })} />
      ))}
    </CommandGroup>
  );
};

export default PinnedSource;
