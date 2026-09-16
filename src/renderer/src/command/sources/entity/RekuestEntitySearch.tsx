import { useGlobalSearchQuery } from "@/rekuest/api/graphql";
import { CommandGroup } from "cmdk";

import { EntityRow } from "./EntityRow";
import { GroupHeading, PER_TYPE_LIMIT } from "./shared";

/** Rekuest's slice. Mounted only inside `Guard.Rekuest`. */
export const RekuestEntitySearch = ({ term, onDone }: { term: string; onDone?: () => void }) => {
  const { data } = useGlobalSearchQuery({
    variables: {
      search: term,
      noActions: false,
      noAgents: false,
      pagination: { limit: PER_TYPE_LIMIT },
    },
    fetchPolicy: "cache-first",
  });

  const rows = [
    ...(data?.actions ?? []).map((a) => ({
      identifier: "@rekuest/action",
      id: a.id,
      label: a.name,
      description: a.description ?? undefined,
    })),
    ...(data?.agents ?? []).map((a) => ({
      identifier: "@rekuest/agent",
      id: a.id,
      label: a.name,
    })),
  ];

  if (rows.length === 0) return null;

  return (
    <CommandGroup heading={<GroupHeading>Rekuest</GroupHeading>}>
      {rows.map((row) => (
        <EntityRow key={`${row.identifier}:${row.id}`} {...row} onDone={onDone} />
      ))}
    </CommandGroup>
  );
};

export default RekuestEntitySearch;
