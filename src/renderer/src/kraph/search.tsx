import { useGlobalSearchQuery } from "@/kraph/api/graphql";
import { CommandGroup } from "cmdk";

import { EntityRow } from "@/command/sources/entity/EntityRow";
import { GroupHeading } from "@/command/sources/entity/shared";

/**
 * Kraph's slice.
 *
 * Note the shape differs from every other module's: `search` is non-null here,
 * there are no `@skip` booleans, and the limits are baked into the query rather
 * than passed as a `pagination` variable. This is exactly why these adapters are
 * one file per module instead of a loop.
 */
export const KraphEntitySearch = ({ term, onDone }: { term: string; onDone?: () => void }) => {
  const { data } = useGlobalSearchQuery({
    variables: { search: term },
    fetchPolicy: "cache-first",
  });

  const rows = [
    ...(data?.entityCategories ?? []).map((c) => ({
      identifier: "@kraph/entitycategory",
      id: c.id,
      label: c.label,
      description: c.description ?? undefined,
    })),
    ...(data?.relationCategories ?? []).map((c) => ({
      identifier: "@kraph/relationcategory",
      id: c.id,
      label: c.label,
      description: c.description ?? undefined,
    })),
    ...(data?.measurementCategories ?? []).map((c) => ({
      identifier: "@kraph/measurementcategory",
      id: c.id,
      label: c.label,
      description: c.description ?? undefined,
    })),
    ...(data?.structureKinds ?? []).map((k) => ({
      identifier: "@kraph/structurekind",
      id: k.id,
      // A structure kind need not be labelled; its own identifier
      // (`@mikro/image`, …) is what it is called when it is not.
      label: k.label ?? k.identifier,
      description: k.description ?? undefined,
    })),
  ].slice(0, 12);

  if (rows.length === 0) return null;

  return (
    <CommandGroup heading={<GroupHeading>Knowledge</GroupHeading>}>
      {rows.map((row) => (
        <EntityRow key={`${row.identifier}:${row.id}`} {...row} onDone={onDone} />
      ))}
    </CommandGroup>
  );
};

export default KraphEntitySearch;
