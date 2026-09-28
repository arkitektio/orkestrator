import { useKuvertPaletteSearchQuery } from "@/kuvert/api/graphql";
import { CommandGroup } from "cmdk";

import { EntityRow } from "@/core/command/sources/entity/EntityRow";
import { GroupHeading, PER_TYPE_LIMIT } from "@/core/command/sources/entity/shared";
import { formatMailDate } from "./format";

/** Kuvert's slice: mail by subject, sender or text. Mounted only inside the
 * kuvert guard (the host's `moduleGuard`). */
export const KuvertEntitySearch = ({ term, onDone }: { term: string; onDone?: () => void }) => {
  const { data } = useKuvertPaletteSearchQuery({
    variables: { search: term, limit: PER_TYPE_LIMIT },
    fetchPolicy: "cache-first",
  });

  const rows = (data?.messages ?? []).map((m) => ({
    identifier: "@kuvert/message",
    id: m.id,
    label: m.subject || "(no subject)",
    description: [m.senderName || m.senderAddress, formatMailDate(m.date)]
      .filter(Boolean)
      .join(" · "),
  }));

  if (rows.length === 0) return null;

  return (
    <CommandGroup heading={<GroupHeading>Mail</GroupHeading>}>
      {rows.map((row) => (
        <EntityRow key={`${row.identifier}:${row.id}`} {...row} onDone={onDone} />
      ))}
    </CommandGroup>
  );
};

export default KuvertEntitySearch;
