import { GraphQLCreatableSearchField } from "@/components/fields/GraphQLCreateableSearchField";
import { GraphQLSearchField } from "@/components/fields/GraphQLSearchField";
import { ParagraphField } from "@/components/fields/ParagraphField";
import { StringField } from "@/components/fields/StringField";
import { SwitchField } from "@/components/fields/SwitchField";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  FileText,
  Info,
  Key,
  List,
  Plus,
  Settings,
  Tag,
  Trash2,
  Type,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import {
  CreateEntityCategoryMutation,
  CreateEntityCategoryMutationVariables,
  DerivationType,
  GetGraphDocument,
  ListEntitiesDocument,
  ValueKind,
  useCreateEntityCategoryMutation,
  useCreateEntityTermInlineMutation,
  useSearchEntityTermsLazyQuery,
  useSearchGraphsLazyQuery,
} from "../api/graphql";
import { keyify } from "./utils";
import { DerivationRuleEditor } from "../components/schema-builder/DerivationRuleEditor";
import { buildDerivationRule } from "../components/schema-builder/utils";
import { useGraphQLDialog } from "@/app/hooks/useGraphQLDialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { ClaimRulesEditor } from "../components/schema-builder/ClaimRuleEditor";
import {
  ClaimRuleDraft,
  summarizeRules,
  toCategoryDefinition,
  validateRules,
  wordRule,
} from "../components/schema-builder/claimRules";

type CreateEntityCategoryFormValues = CreateEntityCategoryMutationVariables["input"];

const PropertyItem = ({
  index,
  remove,
}: {
  index: number;
  remove: (index: number) => void;
}) => {
  const { watch, control, getFieldState, setValue } = useFormContext<CreateEntityCategoryFormValues>();
  const key = watch(`propertyDefinitions.${index}.key`);
  const kind = watch(`propertyDefinitions.${index}.valueKind`);


  // 1. Watch the source field (title)
  const titleValue = useWatch({
    control,
    name: `propertyDefinitions.${index}.label`,
  });



  // 3. Effect with Dirty Check
  useEffect(() => {
    const keyPath = `propertyDefinitions.${index}.key` as const;
    const { isDirty } = getFieldState(keyPath);

    // Only update if the user hasn't manually edited the key field
    if (!isDirty && titleValue !== undefined) {
      setValue(keyPath, keyify(titleValue), {
        shouldValidate: true,
        // We do NOT set shouldDirty: true here, because we want
        // the field to stay "pristine" so it keeps following the title.
      });
    }
  }, [titleValue, setValue, getFieldState, index]);

  return (
    <AccordionItem value={`item-${index}`}>
      <AccordionTrigger className="hover:no-underline py-2">
        <div className="flex items-center gap-2 w-full">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono text-xs bg-muted px-1 rounded">
            {key || "New Property"}
          </span>
          <span className="text-xs text-muted-foreground">{kind}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-2 gap-2 p-1">
          <div className="col-span-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground mt-2">
            <Info className="w-4 h-4" /> General
          </div>
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <Key className="w-3 h-3 text-muted-foreground" />
              <Label className="text-xs">Key</Label>
            </div>
            <StringField
              name={`propertyDefinitions.${index}.key`}
              label=""
              description="The key of the property (snake_case)"
            />
          </div>
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <Type className="w-3 h-3 text-muted-foreground" />
              <Label className="text-xs">Type</Label>
            </div>
            <FormField
              control={control}
              name={`propertyDefinitions.${index}.valueKind`}
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(ValueKind).map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {kind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-3 h-3 text-muted-foreground" />
              <Label className="text-xs">Label</Label>
            </div>
            <StringField
              name={`propertyDefinitions.${index}.label`}
              label=""
              description="Human readable label"
            />
          </div>
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-3 h-3 text-muted-foreground" />
              <Label className="text-xs">Description</Label>
            </div>
            <ParagraphField
              name={`propertyDefinitions.${index}.description`}
              label=""
            />
          </div>

          <div className="col-span-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground mt-2">
            <CheckSquare className="w-4 h-4" /> Options
          </div>
          <div className="col-span-2 flex gap-4 items-center border p-2 rounded-md bg-muted/20">
            <FormField
              control={control}
              name={`propertyDefinitions.${index}.index`}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Index</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`propertyDefinitions.${index}.searchable`}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Searchable</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
          <div className="col-span-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground mt-2">
            <Settings className="w-4 h-4" /> Derivation
          </div>
          <div className="col-span-2 border p-3 rounded-md bg-muted/20">
            <Controller
              control={control}
              name={`propertyDefinitions.${index}.rule`}
              render={({ field: ruleField }) => (
                <Controller
                  control={control}
                  name={`propertyDefinitions.${index}.derivation`}
                  render={({ field: derivationField }) => (
                    <DerivationRuleEditor
                      derivation={derivationField.value}
                      rule={ruleField.value}
                      onChange={({ derivation, rule }) => {
                        derivationField.onChange(derivation);
                        ruleField.onChange(rule);
                      }}
                    />
                  )}
                />
              )}
            />
          </div>
          <div className="col-span-2 flex justify-end mt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => remove(index)}
              type="button"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Remove
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export const PropertyDefinitions = () => {
  const { control } = useFormContext<CreateEntityCategoryFormValues>();
  const { fields, append, remove } = useFieldArray<CreateEntityCategoryFormValues, "propertyDefinitions">({
    control,
    name: "propertyDefinitions",
  });
  const [expanded, setExpanded] = useState<string | undefined>(undefined);

  return (
    <div className="flex flex-col gap-2 mt-4 border rounded-md p-4 h-full overflow-auto bg-muted/10">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4" />
          <Label>Properties</Label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            append({
              key: "new_property",
              valueKind: ValueKind.String,
              index: false,
              searchable: false,
              derivation: DerivationType.Latest,
              rule: buildDerivationRule(null),
            });
            setExpanded(`item-${fields.length}`);
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Property
        </Button>
      </div>
      <Accordion
        type="single"
        collapsible
        className="w-full"
        value={expanded}
        onValueChange={setExpanded}
      >
        {fields.map((field, index) => (
          <PropertyItem key={field.id} index={index} remove={remove} />
        ))}
      </Accordion>
      {fields.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">
          No properties defined.
        </div>
      )}
    </div>
  );
};



type WizardValues = CreateEntityCategoryFormValues & {
  /** "anyone": primitive, `definition` omitted. "rules": only matching claims count. */
  existenceMode: "anyone" | "rules";
  rules: ClaimRuleDraft[];
};

type Step = "existence" | "properties";

const STEPS: { id: Step; label: string }[] = [
  { id: "existence", label: "Existence" },
  { id: "properties", label: "Properties" },
];

const StepIndicator = ({ step }: { step: Step }) => (
  <div className="flex items-center gap-2 text-xs mb-4">
    {STEPS.map((s, i) => (
      <div key={s.id} className="flex items-center gap-2">
        {i > 0 && <span className="text-muted-foreground">·</span>}
        <span
          className={cn(
            "flex items-center gap-1",
            s.id === step ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
              s.id === step && "bg-primary text-primary-foreground border-primary",
            )}
          >
            {i + 1}
          </span>
          {s.label}
        </span>
      </div>
    ))}
  </div>
);

/**
 * Step 1: what the word is, and whose use of it makes an entity exist here.
 * Omitting a definition keeps the category primitive — every claim under the
 * word counts — which is the default and what most categories want.
 */
const ExistenceStep = ({
  showGraph,
  rulesError,
}: {
  showGraph: boolean;
  rulesError: string | null;
}) => {
  const { control, getValues, setValue } = useFormContext<WizardValues>();
  const [search] = useSearchGraphsLazyQuery();
  const [searchTerms] = useSearchEntityTermsLazyQuery();
  const [createTerm] = useCreateEntityTermInlineMutation();
  const mode = useWatch({ control, name: "existenceMode" });
  const rules = useWatch({ control, name: "rules" });

  return (
    <div className="flex flex-col gap-1">
      {showGraph && (
        <GraphQLSearchField
          label="Graph"
          name="graph"
          description="What graph do you want to add this expression to?"
          searchQuery={search}
        />
      )}
      <GraphQLCreatableSearchField
        label="Word we trust"
        name="key"
        description="The organization's word this category declares, e.g. 'AIS'. Type a new word to declare it."
        searchQuery={searchTerms}
        createMutation={createTerm}
      />
      <StringField
        label="Label"
        name="label"
        description="What this graph calls the word. Defaults to the word itself."
      />
      <ParagraphField
        label="Description"
        name="description"
        description="What the word means here (e.g. 'A person is a human being')"
      />

      <div className="flex flex-col gap-3 mt-4">
        <div>
          <Label className="font-medium">What makes an entity exist here?</Label>
          <p className="text-xs text-muted-foreground">
            Entities come from classification claims — somebody saying a thing is
            this word. Choose whose claims count.
          </p>
        </div>
        <RadioGroup
          value={mode}
          onValueChange={(v) => {
            const next = v as WizardValues["existenceMode"];
            setValue("existenceMode", next);
            // Seed the obvious rule: this word, then narrow down who says it.
            if (next === "rules" && getValues("rules").length === 0) {
              setValue("rules", [wordRule(getValues("key"))]);
            }
          }}
          className="gap-2"
        >
          <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
            <RadioGroupItem value="anyone" className="mt-0.5" />
            <div>
              <div className="text-sm font-medium">Anyone who uses the word</div>
              <div className="text-xs text-muted-foreground">
                Every claim made under this word draws an entity.
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
            <RadioGroupItem value="rules" className="mt-0.5" />
            <div>
              <div className="text-sm font-medium">Only claims matching rules</div>
              <div className="text-xs text-muted-foreground">
                Restrict by word, who claimed it, which app, how sure, and when.
              </div>
            </div>
          </label>
        </RadioGroup>

        {mode === "rules" && (
          <>
            <Controller
              control={control}
              name="rules"
              render={({ field }) => (
                <ClaimRulesEditor
                  value={field.value}
                  onChange={field.onChange}
                  newRule={() => wordRule(getValues("key"))}
                />
              )}
            />
            <p className="text-xs text-muted-foreground italic">{summarizeRules(rules)}</p>
            {rulesError && <p className="text-xs text-destructive">{rulesError}</p>}
          </>
        )}
      </div>

      <div className="mt-4">
        <SwitchField
          label="Draw existing evidence"
          name="backfill"
          description="Claims already made under this word are in the organization's evidence base. With this on they are projected into the graph now, instead of waiting for the next reproject — which takes as long as the evidence base is large."
        />
      </div>
    </div>
  );
};

const TForm = (props: Partial<CreateEntityCategoryFormValues> & { onSuccess?: (data: CreateEntityCategoryMutation) => void }) => {
  const [add] = useCreateEntityCategoryMutation({
    refetchQueries: [props.graph ? { query: GetGraphDocument, variables: { id: props.graph } } : ListEntitiesDocument],
  });

  const { onSuccess, ...defaults } = props;
  const form = useForm<WizardValues>({
    defaultValues: {
      ...defaults,
      backfill: false,
      existenceMode: "anyone",
      rules: [],
    },
  });

  const [step, setStep] = useState<Step>("existence");
  const [rulesError, setRulesError] = useState<string | null>(null);

  const submit = useGraphQLDialog(add, {
    successMessage: "Entity Category created",
    onSuccess: (data) => {
      if (data) {
        onSuccess?.(data);
      }
    },
  });

  // No label -> key derivation here any more. `key` IS the organization's word,
  // picked from the vocabulary rather than typed, and a picker fighting an
  // auto-deriving effect over the same field only ever loses.

  /** Step 1 is complete when there is a graph, a word, and sendable rules. */
  const validateExistence = () => {
    const { graph, key, existenceMode, rules } = form.getValues();
    let ok = true;
    if (!graph) {
      form.setError("graph", { message: "Pick a graph" });
      ok = false;
    }
    if (!key) {
      form.setError("key", { message: "Pick or declare a word" });
      ok = false;
    }
    const ruleProblem = existenceMode === "rules" ? validateRules(rules) : null;
    setRulesError(ruleProblem);
    return ok && ruleProblem === null;
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async ({ existenceMode, rules, ...data }) => {
          // Enter in a step-1 field submits the form; treat it as "Next".
          if (step === "existence") {
            if (validateExistence()) setStep("properties");
            return;
          }
          if (!validateExistence()) {
            setStep("existence");
            return;
          }

          const propertyDefinitions = data.propertyDefinitions?.map((definition) => ({
            ...definition,
            derivation: definition.derivation || DerivationType.Latest,
            // Fill the rule's required fields without overwriting what the
            // derivation editor set — `conflictPolicy` and the two priority
            // lists are non-null on the input.
            rule: buildDerivationRule(definition.rule),
          }));

          submit({
            variables: {
              input: {
                ...data,
                definition: existenceMode === "rules" ? toCategoryDefinition(rules) : null,
                propertyDefinitions,
              },
            },
          });
        })}
      >
        <StepIndicator step={step} />

        {step === "existence" ? (
          <ExistenceStep showGraph={!props.graph} rulesError={rulesError} />
        ) : (
          <PropertyDefinitions />
        )}

        <DialogFooter className="mt-4">
          {step === "properties" && (
            <Button type="button" variant="outline" onClick={() => setStep("existence")}>
              Back
            </Button>
          )}
          <Button type="submit">{step === "existence" ? "Next" : "Create"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};


export default TForm;
