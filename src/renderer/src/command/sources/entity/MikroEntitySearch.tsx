import { useGlobalSearchQuery } from "@/mikro/api/graphql";
import { CommandGroup } from "cmdk";

import { EntityRow } from "./EntityRow";
import { GroupHeading, PER_TYPE_LIMIT } from "./shared";

/**
 * Mikro's slice of the palette's entity search.
 *
 * One file per module rather than a loop, because every module's `GlobalSearch`
 * is its own query with its own `@skip` booleans and its own fragments — mikro
 * takes `noArrayDatasets`/`noFiles`/`noFolders`, lok takes `noUsers`/`noGroups`,
 * kraph takes none at all. There is no shape to share here beyond the row.
 *
 * Mounted only inside `Guard.Mikro`, from the outside — see the composer.
 */
export const MikroEntitySearch = ({ term, onDone }: { term: string; onDone?: () => void }) => {
  const { data } = useGlobalSearchQuery({
    variables: {
      search: term,
      noArrayDatasets: false,
      noFiles: false,
      noFolders: false,
      pagination: { limit: PER_TYPE_LIMIT },
    },
    fetchPolicy: "cache-first",
  });

  const rows = [
    ...(data?.arrayDatasets ?? []).map((d) => ({
      identifier: "@mikro/arraydataset",
      id: d.id,
      label: d.name,
    })),
    ...(data?.files ?? []).map((f) => ({
      identifier: "@mikro/file",
      id: f.id,
      label: f.name,
    })),
    ...(data?.folders ?? []).map((f) => ({
      identifier: "@mikro/folder",
      id: f.id,
      label: f.name,
    })),
  ];

  if (rows.length === 0) {
    return null;
  }

  return (
    <CommandGroup heading={<GroupHeading>Mikro</GroupHeading>}>
      {rows.map((row) => (
        <EntityRow key={`${row.identifier}:${row.id}`} {...row} onDone={onDone} />
      ))}
    </CommandGroup>
  );
};

export default MikroEntitySearch;
