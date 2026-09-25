import { useDialog } from "@/core/dialogs/registry";
import { ChoicesField } from "@/core/components/fields/ChoicesField";
import { ParagraphField } from "@/core/components/fields/ParagraphField";
import { StringField } from "@/core/components/fields/StringField";
import { SwitchField } from "@/core/components/fields/SwitchField";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/core/components/ui/accordion";
import { Button } from "@/core/components/ui/button";
import { DialogFooter } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { Trash2 } from "lucide-react";
import { buildDerivationRule } from "../components/schema-builder/utils";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  DerivationType,
  EntityCategoryFragment,
  UpdateEntityCategoryMutationVariables,
  useUpdateEntityCategoryMutation,
  ValueKind,
} from "../api/graphql";

const enumToOptions = (e: Record<string, string>) => {
  return Object.keys(e).map((key) => ({
    label: key.replace(/_/g, " "),
    value: e[key],
  }));
};

const TForm = (props: { entityCategory: EntityCategoryFragment, onSuccess?: () => void }) => {
  const [update] = useUpdateEntityCategoryMutation({
    refetchQueries: ["GetGraph"],
  });

  const { closeDialog } = useDialog();

  const form = useForm<UpdateEntityCategoryMutationVariables["input"]>({
    defaultValues: {
      id: props.entityCategory.id,
      label: props.entityCategory.label,
      description: props.entityCategory.description,
      // `propertyDefinitions` is a full replace, so every field the form does
      // not carry is a field this save erases. Seed the whole definition,
      // including the derivation rule, even where the form has no widget for it.
      propertyDefinitions: props.entityCategory.propertyDefinitions.map(
        (def) => ({
          key: def.key,
          label: def.label || "",
          description: def.description || "",
          unit: def.unit,
          valueKind: def.valueKind,
          derivation: def.derivation || DerivationType.Latest,
          index: def.index ?? false,
          searchable: def.searchable ?? false,
          rule: buildDerivationRule(def.rule),
        })
      ),
    },
  });

  const propertyDefinitionsArray = useFieldArray({
    control: form.control,
    name: "propertyDefinitions",
  });

  const watchedPropertyDefinitions = form.watch("propertyDefinitions");

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            update({
              variables: {
                input: {
                  ...data,
                },
              },
            }).then(() => {
              toast.success("Entity Category updated");
              props.onSuccess?.();
              closeDialog();
            }).catch((e) => {
              toast.error("Error updating Entity Category: " + e.message);
            });
          })}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 flex-col gap-1 flex">
              <StringField
                label="Label"
                name="label"
                description="Whats the expression? (e.g. 'Person' or 'Connected to')"
              />
              <ParagraphField
                label="Description"
                name="description"
                description="What describes your expression the best? (e.g. 'A person is a human being')"
              />
            </div>

            <div className="col-span-2 flex-col gap-2 flex">
              <h3 className="text-lg font-semibold">Property Definitions</h3>
              <p className="text-sm text-muted-foreground">
                Define custom properties for entities of this category
              </p>
              <div className="flex flex-col gap-3">
                <Accordion type="multiple" className="w-full">
                  {propertyDefinitionsArray.fields.map((item, index) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex flex-row gap-2 items-center">
                          <span className="font-bold">{watchedPropertyDefinitions?.[index]?.key || "New Property"}</span>
                          <span className="text-muted-foreground font-light">{watchedPropertyDefinitions?.[index]?.label}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-1">
                        <div className="grid grid-cols-[1fr_1fr] gap-3 mb-3">
                          <div className="min-w-0">
                            <StringField
                              label="Key"
                              name={`propertyDefinitions.${index}.key`}
                              description="Unique identifier for this property"
                            />
                          </div>
                          <div className="min-w-0">
                            <StringField
                              label="Label"
                              name={`propertyDefinitions.${index}.label`}
                              description="Display name for this property"
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <ParagraphField
                            label="Description"
                            name={`propertyDefinitions.${index}.description`}
                            description="Detailed description of this property"
                          />
                        </div>

                        <div className="grid grid-cols-[1fr_auto] gap-3 mb-3 items-start">
                          <div className="min-w-0">
                            <ChoicesField
                              label="Value Type"
                              name={`propertyDefinitions.${index}.valueKind`}
                              description="The data type for this property"
                              options={enumToOptions(ValueKind)}
                            />
                          </div>
                          <div className="flex items-start pt-8 min-w-[180px]">
                            <SwitchField
                              label="Searchable"
                              name={`propertyDefinitions.${index}.searchable`}
                              description=""
                              className="w-full"
                            />
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => propertyDefinitionsArray.remove(index)}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Property
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    propertyDefinitionsArray.append({
                      key: "",
                      label: "",
                      description: "",
                      valueKind: ValueKind.String,
                      derivation: DerivationType.Latest,
                      index: false,
                      searchable: false,
                      rule: buildDerivationRule(null),
                    })
                  }
                  className="w-full"
                >
                  + Add Property Definition
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};


export default TForm;
