import { useDialog } from "@/app/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/use-debounce";
import {
  ListMeasurementCategoryWithGraphFragment,
  useAssertMeasurementExistsMutation,
  useAssertStructureExistsMutation,
  useEntityCategoriesMatchingDescriptorQuery,
  useListEntitiesQuery,
} from "@/kraph/api/graphql";
import { Structure } from "@/types";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Activity, CircleDot } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Measuring is a claim: this structure measures that entity, under the word the
 * measurement category declares. The structure has to exist as a node before it
 * can be an endpoint, so it is asserted first — `assertStructureExists` is idempotent,
 * so an object already recorded is simply found.
 */
export const SetAsMeasurement = (props: {
  left: Structure[];
  category: ListMeasurementCategoryWithGraphFragment;
}) => {
  const { closeDialog } = useDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const source = props.left[0];
  const [attaching, setAttaching] = useState<string | null>(null);

  const [ensureStructure] = useAssertStructureExistsMutation();
  const [assertMeasurement] = useAssertMeasurementExistsMutation();

  const attach = async (entityId: string) => {
    if (!source) return;
    setAttaching(entityId);
    try {
      const structure = await ensureStructure({
        variables: {
          input: {
            identifier: source.identifier,
            object: source.object.id,
          },
        },
      });
      const sourceId = structure.data?.assertStructureExists.structure.id;
      if (!sourceId) {
        throw new Error("Could not record the structure being measured");
      }

      await assertMeasurement({
        variables: {
          input: {
            sourceId,
            targetId: entityId,
            term: props.category.term?.key ?? props.category.key,
          },
        },
      });
      toast.success(`Measured as ${props.category.label}`);
      closeDialog();
    } catch (e) {
      toast.error(
        `Could not attach measurement: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    } finally {
      setAttaching(null);
    }
  };

  // Which entity categories this measurement may target. `MaterializedEdge`
  // had one precomputed as `target`; the category declares a *descriptor*, and
  // the server resolves it — the same predicate the writer applies.
  const { data: targetCategories } = useEntityCategoriesMatchingDescriptorQuery({
    variables: {
      descriptor: {
        keys: props.category.targetDescriptor.keys,
        ontologyTerms: props.category.targetDescriptor.ontologyTerms,
        defaultCategoryKey: props.category.targetDescriptor.defaultCategoryKey,
      },
    },
  });

  const targetCategory = targetCategories?.entityCategories.at(0);

  const { data, loading } = useListEntitiesQuery({
    variables: {
      entityCategoryId: targetCategory?.id ?? "",
      filters: {
        search: debouncedSearch || undefined,
      },
    },
    skip: !targetCategory,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              Set As Measurement
            </h2>
            <p className="text-sm text-muted-foreground">
              Pick the {targetCategory?.label ?? "entity"} this structure measures. The
              claim names the word, so every graph that declares it holds the
              measurement.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
              <Activity className="h-3.5 w-3.5" />
              {props.category.label}
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
              <CircleDot className="h-3.5 w-3.5" />
              {props.category.graph.name}
            </Badge>
          </div>
        </div>
        {source ? (
          <div className="mt-4 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Source</span>
            <div className="mt-1 font-medium">{source.identifier}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {source.object.id}
            </div>
          </div>
        ) : null}
      </div>

      <div className="px-6 py-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${targetCategory?.label ?? "entity".toLowerCase()} entities...`}
            value={searchQuery}
            onChange={handleSearchChange}
            className="h-10 rounded-lg pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex items-center justify-center rounded-lg border border-dashed py-12">
              <div className="text-sm text-muted-foreground">Loading entities...</div>
            </div>
          ) : !data?.entities.length ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed py-12 space-y-2">
              <MagnifyingGlassIcon className="h-12 w-12 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">No entities found</div>
              {searchQuery && (
                <div className="text-sm text-muted-foreground">
                  Try adjusting your search terms
                </div>
              )}
            </div>
          ) : (
            data.entities.map((entity) => (
              <Card key={entity.id} className="border-border/70">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{entity.label}</CardTitle>
                      {entity.categories.length > 0 && (
                        <CardDescription className="mt-1">
                          {entity.categories.map((c) => c.label).join(", ")}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {targetCategory?.label ?? "entity"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="font-mono text-xs text-muted-foreground break-all">
                    {entity.id}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={!source || attaching !== null}
                    onClick={() => attach(entity.id)}
                  >
                    {attaching === entity.id
                      ? "Measuring…"
                      : props.category.label}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-end space-x-2 border-t px-6 py-4">
        <Button variant="outline" onClick={closeDialog}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
