import { useDialog } from "@/app/dialog";
import { AutoDerivedStringField, StringField } from "@/components/fields/StringField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CreateMeasurementCategoryInput,
  useCreateMeasurementCategoryMutation,
  useListEntityCategoryQuery,
  useListStructureKindsQuery,
} from "@/kraph/api/graphql";
import { ageNameify, validateAgeName } from "@/kraph/forms/utils";
import { Structure } from "@/types";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const normalizeInput = (
  data: CreateMeasurementCategoryInput,
): CreateMeasurementCategoryInput => ({
  ...data,
  label: data.label || undefined,
  description: data.description || undefined,
  source: {
    ...data.source,
    identifiers: data.source.identifiers?.length ? data.source.identifiers : undefined,
    defaultCategoryKey: data.source.defaultCategoryKey || undefined,
  },
  target: {
    ...data.target,
    keys: data.target.keys?.length ? data.target.keys : undefined,
    ontologyTerms: data.target.ontologyTerms?.length ? data.target.ontologyTerms : undefined,
    defaultCategoryKey: data.target.defaultCategoryKey || undefined,
  },
});

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export const CreateNewMeasurement = (props: {
  left: Structure[];
  right: Structure[];
  graph: string;
}) => {
  const { closeDialog } = useDialog();

  const [structureSearch, setStructureSearch] = useState("");
  const [entitySearch, setEntitySearch] = useState("");
  const debouncedStructureSearch = useDebounce(structureSearch);
  const debouncedEntitySearch = useDebounce(entitySearch);

  const form = useForm<CreateMeasurementCategoryInput>({
    defaultValues: {
      graph: props.graph,
      label: "",
      key: "",
      description: "",
      source: {
        identifiers: props.left.map((s) => s.identifier),
        defaultCategoryKey: "",
      },
      target: {
        keys: [],
        ontologyTerms: [],
        defaultCategoryKey: "",
      },
    },
  });

  const selectedIdentifiers: string[] = form.watch("source.identifiers") ?? [];
  const selectedEntityKeys: string[] = form.watch("target.keys") ?? [];

  const { data: structureData } = useListStructureKindsQuery({
    variables: {
      filters: {
        // Structure kinds are organization-scoped, so they are no longer
        // filterable by graph.
        search: debouncedStructureSearch || undefined,
      },
      pagination: { limit: 50, offset: 0 },
    },
    fetchPolicy: "network-only",
  });

  const { data: entityData } = useListEntityCategoryQuery({
    variables: {
      filters: {
        graph: { id: props.graph },
        search: debouncedEntitySearch || undefined,
      },
      pagination: { limit: 50, offset: 0 },
    },
    fetchPolicy: "network-only",
  });

  const [createMeasurementCategory] = useCreateMeasurementCategoryMutation({
    refetchQueries: ["GetGraph", "ListMeasurmentCategory"],
  });

  const toggleIdentifier = (identifier: string) => {
    const current = form.getValues("source.identifiers") ?? [];
    if (current.includes(identifier)) {
      form.setValue("source.identifiers", current.filter((i) => i !== identifier));
    } else {
      form.setValue("source.identifiers", [...current, identifier]);
    }
  };

  const toggleEntityKey = (key: string) => {
    const current = form.getValues("target.keys") ?? [];
    if (current.includes(key)) {
      form.setValue("target.keys", current.filter((k) => k !== key));
    } else {
      form.setValue("target.keys", [...current, key]);
    }
  };

  const handleSubmit = async (data: CreateMeasurementCategoryInput) => {
    try {
      await createMeasurementCategory({
        variables: { input: normalizeInput({ ...data, graph: props.graph }) },
      });
      closeDialog();
      toast.success("Measurement category created!");
    } catch (error) {
      toast.error(
        `Failed to create: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-4 pb-3 border-b">
        <h2 className="text-xl font-semibold">Create Measurement Category</h2>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-1 overflow-hidden"
        >
          <div className="grid grid-cols-3 flex-1 divide-x overflow-hidden">
            {/* Left Pane — Structure Categories */}
            <div className="flex flex-col overflow-hidden p-4 gap-3">
              <div>
                <p className="text-sm font-medium mb-1">Structure Categories</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Select the structures to map from. Selected identifiers become the source definition.
                </p>
                <Input
                  placeholder="Filter by label or identifier…"
                  value={structureSearch}
                  onChange={(e) => setStructureSearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              {selectedIdentifiers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedIdentifiers.map((id) => (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => toggleIdentifier(id)}
                    >
                      {id} ×
                    </Badge>
                  ))}
                </div>
              )}
              <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1 pr-2">
                  {structureData?.structureKinds.map((cat) => {
                    const selected = selectedIdentifiers.includes(cat.identifier);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleIdentifier(cat.identifier)}
                        className={`text-left rounded-md p-2 text-sm border transition-colors hover:bg-accent ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{cat.label}</span>
                          {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono truncate block">
                          {cat.identifier}
                        </span>
                        {cat.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {cat.description}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {structureData?.structureKinds.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No structure categories found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Center Pane — Label / Key / Submit */}
            <div className="flex flex-col p-4 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Measurement Label</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Name and key for this measurement category.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <StringField
                  label="Label"
                  name="label"
                  description="Human-readable name (e.g. 'Has fluorescence measurement')"
                />
                <AutoDerivedStringField
                  label="Key"
                  name="key"
                  sourceName="label"
                  deriveValue={ageNameify}
                  normalizeValue={ageNameify}
                  validate={validateAgeName}
                  description="AGE-name key, auto-derived from label"
                />
              </div>
              <div className="mt-auto pt-4">
                <Button type="submit" className="w-full">
                  Create Measurement Category
                </Button>
              </div>
            </div>

            {/* Right Pane — Entity Categories */}
            <div className="flex flex-col overflow-hidden p-4 gap-3">
              <div>
                <p className="text-sm font-medium mb-1">Entity Categories</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Select the entity categories to map to. Selected keys become the target definition.
                </p>
                <Input
                  placeholder="Filter by label or key…"
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              {selectedEntityKeys.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedEntityKeys.map((k) => (
                    <Badge
                      key={k}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => toggleEntityKey(k)}
                    >
                      {k} ×
                    </Badge>
                  ))}
                </div>
              )}
              <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1 pr-2">
                  {entityData?.entityCategories.map((cat) => {
                    const selected = selectedEntityKeys.includes(cat.key);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleEntityKey(cat.key)}
                        className={`text-left rounded-md p-2 text-sm border transition-colors hover:bg-accent ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{cat.label}</span>
                          {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono truncate block">
                          {cat.key}
                        </span>
                        {cat.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {cat.description}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {entityData?.entityCategories.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No entity categories found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};
