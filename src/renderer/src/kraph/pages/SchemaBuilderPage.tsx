import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { PropertyList } from "../components/schema-builder/PropertyList";
import { PropertyInspector } from "../components/schema-builder/PropertyInspector";
import {
  buildDerivationRule,
  DEFAULT_DERIVATION,
  PropertyDefinition,
  validateSchema,
} from "../components/schema-builder/utils";
import { PageAction } from "@/core/ui/page-action";
import { Save } from "lucide-react";
import { ValueKind } from "../api/graphql";
import { useNavigate } from "react-router-dom";
import { reportError } from "@/core/notify";
import { PageLayout } from "@/core/layout/PageLayout";
import { KRAPH_HELP } from "../help";

interface SchemaBuilderPageProps {
  initialProperties?: PropertyDefinition[];
  title: string;
  onSave: (properties: PropertyDefinition[]) => Promise<void>;
  onCancel?: () => void;
}

interface SchemaFormData {
  properties: PropertyDefinition[];
}

export function SchemaBuilderPage({
  initialProperties = [],
  title,
  onSave,
  onCancel,
}: SchemaBuilderPageProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
    setValue,
  } = useForm<SchemaFormData>({
    defaultValues: {
      properties: initialProperties,
    },
    mode: "onChange",
  });

  const { append, remove, move } = useFieldArray({
    control,
    name: "properties",
  });

  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    initialProperties.length > 0 ? 0 : null
  );
  // Why the last save was refused, shown above the editor until it passes.
  const [problems, setProblems] = useState<string[]>([]);
  const navigate = useNavigate();

  const getProperties = () => getValues("properties");

  const handleAddProperty = () => {
    const properties = getProperties();
    const newProperty: PropertyDefinition = {
      key: `property_${properties.length + 1}`,
      label: `New Property ${properties.length + 1}`,
      description: "",
      valueKind: ValueKind.String,
      derivation: DEFAULT_DERIVATION,
      rule: buildDerivationRule(),
      index: false,
      searchable: false,
    };
    append(newProperty);
    setSelectedIndex(properties.length);
  };

  const handleUpdateProperty = (
    index: number,
    updates: Partial<PropertyDefinition>
  ) => {
    const properties = getProperties();
    const currentProperty = properties[index];
    setValue(`properties.${index}`, { ...currentProperty, ...updates }, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleDeleteProperty = (index: number) => {
    const properties = getProperties();
    remove(index);
    if (selectedIndex === index) {
      setSelectedIndex(properties.length > 1 ? 0 : null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleReorderProperties = (fromIndex: number, toIndex: number) => {
    move(fromIndex, toIndex);

    if (selectedIndex === fromIndex) {
      setSelectedIndex(toIndex);
    } else if (
      selectedIndex !== null &&
      fromIndex < selectedIndex &&
      toIndex >= selectedIndex
    ) {
      setSelectedIndex(selectedIndex - 1);
    } else if (
      selectedIndex !== null &&
      fromIndex > selectedIndex &&
      toIndex <= selectedIndex
    ) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const onSubmit = async (data: SchemaFormData) => {
    const validation = validateSchema(data.properties);

    if (!validation.isValid) {
      setProblems(validation.errors);
      return;
    }
    setProblems([]);

    // Saving leaves the page, which is the confirmation.
    try {
      await onSave(data.properties);
    } catch (error) {
      reportError(error, "Couldn't save the schema");
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate(-1);
  };

  return (
    <PageLayout
      help={KRAPH_HELP.schemaBuilder}
      title={title}
      pageActions={
        <>
          {/* An editor: leaving without saving, and saving, both have to
              stay reachable however narrow the row gets. */}
          <PageAction alwaysShow size="sm" onClick={handleCancel}>
            Cancel
          </PageAction>
          <PageAction
            alwaysShow
            collapse="icon"
            variant="default"
            icon={<Save className="h-4 w-4" />}
            menuLabel="Save Schema"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || getProperties().length === 0}
            size="sm"
          >
            {isSubmitting ? "Saving..." : "Save Schema"}
          </PageAction>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        {problems.length > 0 && (
          <div
            role="alert"
            className="m-3 mb-0 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <p className="font-medium">The schema can't be saved yet:</p>
            <ul className="list-inside list-disc">
              {problems.map((problem, i) => (
                <li key={i}>{problem}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="w-96">
            <PropertyList
              properties={getProperties()}
              selectedIndex={selectedIndex}
              onSelectProperty={setSelectedIndex}
              onAddProperty={handleAddProperty}
              onReorderProperties={handleReorderProperties}
            />
          </div>

          <div className="flex-1 bg-accent/20 min-h-0">
            <PropertyInspector
              property={
                selectedIndex !== null ? getProperties()[selectedIndex] : null
              }
              onUpdate={(updates) =>
                selectedIndex !== null &&
                handleUpdateProperty(selectedIndex, updates)
              }
              onDelete={() =>
                selectedIndex !== null && handleDeleteProperty(selectedIndex)
              }
              errors={
                selectedIndex !== null && errors.properties?.[selectedIndex]
                  ? errors.properties[selectedIndex]
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
