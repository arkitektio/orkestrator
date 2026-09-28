import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { ChoicesField } from "@/core/forms/ChoicesField";
import { FloatField } from "@/core/forms/FloatField";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { IntField } from "@/core/forms/IntField";
import { StringField } from "@/core/forms/StringField";
import { SwitchField } from "@/core/forms/SwitchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  GetCategoryDocument,
  ListCategoryRulesDocument,
  ListTransactionsDocument,
  RuleDirection,
  RuleField,
  RuleMatch,
  useCreateCategoryRuleMutation,
  useSearchCategoriesLazyQuery,
} from "../api/graphql";
import { decimalOrNull, DIRECTION_OPTIONS, FIELD_OPTIONS, MATCH_OPTIONS } from "./options";

type Values = {
  category: string | null;
  field: RuleField;
  match: RuleMatch;
  pattern: string;
  direction: RuleDirection;
  priority: number;
  amountMin?: number | null;
  amountMax?: number | null;
  apply: boolean;
};

/**
 * A categorization rule. `pattern`/`field` prefill it from a transaction
 * ("everything from this counterparty goes to …").
 */
export const CreateRuleForm = (props: { category?: string; pattern?: string; field?: RuleField }) => {
  const [create, { loading }] = useCreateCategoryRuleMutation({
    refetchQueries: [ListCategoryRulesDocument, GetCategoryDocument, ListTransactionsDocument],
  });
  const [searchCategories] = useSearchCategoriesLazyQuery();
  const submit = useGraphQLDialog(create, { successMessage: "Rule created" });

  const form = useForm<Values>({
    defaultValues: {
      category: props.category ?? null,
      field: props.field ?? RuleField.Counterparty,
      match: RuleMatch.Contains,
      pattern: props.pattern ?? "",
      direction: RuleDirection.Any,
      priority: 100,
      amountMin: null,
      amountMax: null,
      apply: true,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          if (!data.category) {
            form.setError("category", { message: "Pick the category matching transactions get." });
            return;
          }
          return submit({
            variables: {
              input: {
                category: data.category,
                field: data.field,
                match: data.match,
                pattern: data.pattern,
                direction: data.direction,
                priority: Number(data.priority) || 100,
                amountMin: decimalOrNull(data.amountMin),
                amountMax: decimalOrNull(data.amountMax),
                apply: data.apply,
              },
            },
          });
        })}
        className="flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle>New rule</DialogTitle>
          <DialogDescription>
            Rules categorize transactions as they arrive. The first active rule by priority wins, and a
            category you set by hand is never overridden.
          </DialogDescription>
        </DialogHeader>
        <GraphQLSearchField name="category" label="Category" searchQuery={searchCategories} />
        <div className="grid grid-cols-2 gap-3">
          <ChoicesField name="field" label="Match on" options={FIELD_OPTIONS} />
          <ChoicesField name="match" label="How" options={MATCH_OPTIONS} />
        </div>
        <StringField name="pattern" label="Pattern" placeholder="billa" description="Compared case-insensitively." />
        <ChoicesField name="direction" label="Direction" options={DIRECTION_OPTIONS} />
        <div className="grid grid-cols-3 gap-3">
          <FloatField name="amountMin" label="Min amount" placeholder="any" />
          <FloatField name="amountMax" label="Max amount" placeholder="any" />
          <IntField name="priority" label="Priority" />
        </div>
        <SwitchField name="apply" label="Apply to existing transactions" />
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create rule"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
