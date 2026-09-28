import { useGlobalSearchQuery } from "@/lok/api/graphql";
import { CommandGroup } from "cmdk";

import { EntityRow } from "@/core/command/sources/entity/EntityRow";
import { GroupHeading, PER_TYPE_LIMIT } from "@/core/command/sources/entity/shared";

/** Lok's slice: people and groups. Mounted only inside `Guard.Lok`. */
export const LokEntitySearch = ({ term, onDone }: { term: string; onDone?: () => void }) => {
  const { data } = useGlobalSearchQuery({
    variables: {
      search: term,
      noUsers: false,
      noGroups: false,
      pagination: { limit: PER_TYPE_LIMIT },
    },
    fetchPolicy: "cache-first",
  });

  const rows = [
    ...(data?.users ?? []).map((u) => ({
      identifier: "@lok/user",
      id: u.id,
      // A display name when there is one, the username otherwise — the username
      // is what people search by, so it must never be the thing that is hidden.
      label: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username,
      description: u.username,
    })),
    ...(data?.groups ?? []).map((g) => ({
      identifier: "@lok/group",
      id: g.id,
      label: g.name,
    })),
  ];

  if (rows.length === 0) return null;

  return (
    <CommandGroup heading={<GroupHeading>People</GroupHeading>}>
      {rows.map((row) => (
        <EntityRow key={`${row.identifier}:${row.id}`} {...row} onDone={onDone} />
      ))}
    </CommandGroup>
  );
};

export default LokEntitySearch;
