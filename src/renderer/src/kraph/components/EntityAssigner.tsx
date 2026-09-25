import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/core/components/ui/command";
import { Input } from "@/core/components/ui/input";
import { useDebounce } from "@/core/hooks/use-debounce";
import {
  useSearchLinkableCategoriesQuery,
  useSearchLinkableEntitiesQuery,
} from "@/kraph/api/graphql";
import { cn } from "@/core/lib/utils";
import { ChevronLeft, X } from "lucide-react";
import { useState } from "react";

/** The entity a link points at, with enough context to show what was picked. */
export type AssignedEntity = {
  id: string;
  label: string;
  categoryLabel: string;
  graphName: string;
};

export type EntityAssignerProps = {
  value: AssignedEntity | null;
  onChange: (entity: AssignedEntity | null) => void;
  disabled?: boolean;
  className?: string;
};

type PickedCategory = { id: string; label: string; graphName: string };

/**
 * Picks an entity that already exists.
 *
 * Unlike a claim, a link needs a *concrete* entity — and entities are
 * graph-scoped, so the same word declared by two graphs holds two different
 * ones. There is no organization-wide entity search for that reason, and the
 * picker drills down accordingly: the categories declaring the word first, then
 * what each one holds. The graph is shown at both steps because it is the part
 * that makes the choice unambiguous.
 */
export const EntityAssigner = ({
  value,
  onChange,
  disabled,
  className,
}: EntityAssignerProps) => {
  const [category, setCategory] = useState<PickedCategory | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);

  const { data: categoryData, loading: loadingCategories } =
    useSearchLinkableCategoriesQuery({
      variables: { search: debouncedSearch || undefined },
      skip: !!category || !!value,
      fetchPolicy: "cache-and-network",
    });

  const { data: entityData, loading: loadingEntities } =
    useSearchLinkableEntitiesQuery({
      variables: {
        category: category?.id ?? "",
        search: debouncedSearch || undefined,
      },
      skip: !category || !!value,
      fetchPolicy: "cache-and-network",
    });

  const back = () => {
    setCategory(null);
    setSearch("");
  };

  if (value) {
    return (
      <div className={cn("flex flex-row items-center gap-2", className)}>
        <div className="min-w-0 flex flex-col">
          <Badge variant="secondary" className="w-fit px-2 py-1 text-sm">
            {value.label}
          </Badge>
          <span className="mt-1 truncate text-xs text-muted-foreground">
            {value.categoryLabel} in {value.graphName}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          disabled={disabled}
          onClick={() => {
            onChange(null);
            back();
          }}
          aria-label="Clear the chosen entity"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  const categories = categoryData?.entityCategories ?? [];
  const entities = entityData?.entities ?? [];
  const loading = category ? loadingEntities : loadingCategories;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {category ? (
        <div className="flex flex-row items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1"
            onClick={back}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="truncate text-xs text-muted-foreground">
            {category.label} in {category.graphName}
          </span>
        </div>
      ) : null}

      <Input
        value={search}
        disabled={disabled}
        placeholder={category ? "Search entities…" : "Search for the word…"}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Command shouldFilter={false} className="border">
        <CommandList className="max-h-56">
          {loading && categories.length === 0 && entities.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Searching…
            </div>
          ) : null}

          {category ? (
            entities.length === 0 && !loading ? (
              <CommandEmpty>Nothing here matches.</CommandEmpty>
            ) : (
              <CommandGroup heading={category.label}>
                {entities.map((entity) => (
                  <CommandItem
                    key={entity.id}
                    value={entity.id}
                    onSelect={() =>
                      onChange({
                        id: entity.id,
                        label: entity.label,
                        categoryLabel: category.label,
                        graphName: category.graphName,
                      })
                    }
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="font-medium">{entity.label}</span>
                    {/*
                      `externalId` went with `globalId` / `graphId` / `localId`:
                      every id in the API is the evidence row's bare uuid now,
                      and there is no second, composite form to show beside it.
                    */}
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          ) : categories.length === 0 && !loading ? (
            <CommandEmpty>No graph declares a matching word.</CommandEmpty>
          ) : (
            <CommandGroup heading="Words">
              {categories.map((entityCategory) => (
                <CommandItem
                  key={entityCategory.id}
                  value={entityCategory.id}
                  onSelect={() => {
                    setCategory({
                      id: entityCategory.id,
                      label: entityCategory.label,
                      graphName: entityCategory.graph.name,
                    });
                    setSearch("");
                  }}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="font-medium">{entityCategory.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {entityCategory.graph.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
};

export default EntityAssigner;
