import { PageAction } from "@/core/ui/page-action";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { parseAsStringLiteral, useQueryState } from "@/core/util/hooks/use-search-param-state";

const ORIGINS = ["provided", "custom"] as const;

/**
 * Who a blok comes from: an app's agents provide it (it follows their
 * registrations and is forked, never edited), or a user made it. Kept in the
 * URL; `provided` is the `provided` filter both blok lists take.
 */
export const useBlokOrigin = () => {
  const [origin, setOrigin] = useQueryState("origin", parseAsStringLiteral(ORIGINS));
  const provided = origin === "provided" ? true : origin === "custom" ? false : undefined;
  return { origin, setOrigin, provided };
};

/** All / Provided / Custom, for a blok list page's actions. */
export const BlokOriginToggle = ({ origin, setOrigin }: Pick<ReturnType<typeof useBlokOrigin>, "origin" | "setOrigin">) => (
  <PageAction.Slot collapse="hide">
    <ToggleGroup
      type="single"
      size="sm"
      value={origin ?? "all"}
      onValueChange={(value) => value && setOrigin(value === "all" ? null : (value as (typeof ORIGINS)[number]))}
    >
      <ToggleGroupItem value="all">All</ToggleGroupItem>
      <ToggleGroupItem value="provided">Provided</ToggleGroupItem>
      <ToggleGroupItem value="custom">Custom</ToggleGroupItem>
    </ToggleGroup>
  </PageAction.Slot>
);
