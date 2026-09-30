import { CommandGroup } from "cmdk";

import { EntityRow } from "@/core/command/sources/entity/EntityRow";
import { GroupHeading, PER_TYPE_LIMIT } from "@/core/command/sources/entity/shared";
import { useListPlacesQuery } from "./api/graphql";
import { formatDay } from "./format";

/** Lokate's slice of the palette: named places. Mounted inside the lokate guard. */
export const LokateEntitySearch = ({ term, onDone }: { term: string; onDone?: () => void }) => {
  const { data } = useListPlacesQuery({
    variables: { filters: { search: term }, pagination: { limit: PER_TYPE_LIMIT } },
    fetchPolicy: "cache-first",
    skip: term.trim() === "",
  });
  const places = data?.places ?? [];
  if (places.length === 0) return null;

  return (
    <CommandGroup heading={<GroupHeading>Places</GroupHeading>}>
      {places.map((place) => (
        <EntityRow
          key={place.id}
          identifier="@lokate/place"
          id={place.id}
          label={place.name ?? "Unnamed place"}
          description={[
            place.visitCount === 1 ? "1 visit" : `${place.visitCount} visits`,
            place.lastVisitAt && `last ${formatDay(place.lastVisitAt)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
          onDone={onDone}
        />
      ))}
    </CommandGroup>
  );
};

export default LokateEntitySearch;
