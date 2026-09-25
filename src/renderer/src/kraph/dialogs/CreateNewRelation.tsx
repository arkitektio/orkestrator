import { CreatableListSearchField } from "@/components/fields/CreatableListSearchField";
import { useDialog } from "@/app/dialog";
import { GraphQLCreatableSearchField } from "@/components/fields/GraphQLCreateableSearchField";
import { ParagraphField } from "@/components/fields/ParagraphField";
import { SearchOptions } from "@/components/fields/SearchField";
import { StringField } from "@/components/fields/StringField";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  CreateStructureRelationCategoryMutationVariables,
  useCreateInlineGraphMutation,
  useCreateStructureRelationCategoryMutation,
  useSearchGraphsLazyQuery,
} from "@/kraph/api/graphql";
import { smartRegistry } from "@/providers/smart/registry";
import { Structure } from "@/types";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const searchIdentifiers = async ({ search, values }: SearchOptions) => {
  const models = smartRegistry
    .registeredModels()
    .filter((model) => {
      if (values) return values.includes(model.identifier);
      if (search) return model.identifier.includes(search);
      if (!search) return true;
      return false;
    })
    .map((model) => ({
      label: model.identifier,
      value: model.identifier,
    }));
  return models || [];
};

export type FormData =
  CreateStructureRelationCategoryMutationVariables["input"];

const uniqueIdentifiers = (structures: Structure[]) =>
  Array.from(new Set(structures.map((structure) => structure.identifier)));

const createIdentifier = async (input: string) => {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    throw new Error("Identifier cannot be empty");
  }

  return trimmedInput;
};

export const CreateNewRelation = (props: {
  left: Structure[];
  right: Structure[];
}) => {
  const { closeDialog } = useDialog();

  const form = useForm<FormData>({
    defaultValues: {
      // A structure descriptor is `identifiers` plus a default category key —
      // `keys`, `tags` and `ontologyTerms` are gone from the schema.
      source: {
        identifiers: uniqueIdentifiers(props.left),
      },
      target: {
        identifiers: uniqueIdentifiers(props.right),
      },
    },
  });

  const [searchGraphs] = useSearchGraphsLazyQuery();
  const [createGraph] = useCreateInlineGraphMutation();

  const [createStructureRelationCategory] =
    useCreateStructureRelationCategoryMutation({
      onCompleted: (data) => {
        console.log("Relation category created:", data);
      },
      onError: (error) => {
        console.error("Error creating relation category:", error);
      },
    });
  const handleRelationCreation = async (categoryInput: FormData) => {
    try {
      await createStructureRelationCategory({
        variables: {
          input: {
            ...categoryInput,
          },
        },
      });

      closeDialog();
      toast.success("Structure relation category created successfully");
    } catch (error) {
      toast.error(
        `Failed to create structure relation category: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      console.error("Failed to create structure relation category:", error);
    }
  };

  return (
    <div className="flex flex-col w-full h-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Create New Structure Relation Category</h2>
        <p className="text-muted-foreground">
          Seeded from the current self and partner identifiers. You can add more
          identifiers before creating the category.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleRelationCreation)}
          className="space-y-6"
        >
          <GraphQLCreatableSearchField
            label="Graph"
            name="graph"
            description="Select the graph for this relation"
            searchQuery={searchGraphs}
            createMutation={createGraph}
          />
          <StringField
            label="Label"
            name="key"
            description="Name for the relation category (e.g., 'connects to', 'part of')"
          />
          <ParagraphField
            label="Description"
            name="description"
            description="Describe what this relation represents"
          />

          <div className="grid grid-cols-2 gap-4">
            <CreatableListSearchField
              label="Source Identifiers"
              name="source.identifiers"
              description="Prefilled from the current self selection. Add more structure identifiers if needed."
              search={searchIdentifiers}
              create={createIdentifier}
            />
            <CreatableListSearchField
              label="Target Identifiers"
              name="target.identifiers"
              description="Prefilled from the current partner selection. Add more structure identifiers if needed."
              search={searchIdentifiers}
              create={createIdentifier}
            />
          </div>

          <Collapsible>
            <CollapsibleTrigger>Advanced</CollapsibleTrigger>
            <CollapsibleContent>
              <StringField
                label="PURL"
                name="purl"
                description="Permanent URL identifier (optional)"
              />

              <Separator />

            </CollapsibleContent>
          </Collapsible>

          <Button type="submit" variant="outline">
            Create Structure Relation Category
          </Button>
        </form>
      </Form>
    </div>
  );
};
