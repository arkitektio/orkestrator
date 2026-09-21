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
import { PageAction } from "@/components/ui/page-action";
import { Save } from "lucide-react";
import { ValueKind } from "../api/graphql";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/PageLayout";

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
      toast.error(
        <div>
          <p className="font-semibold mb-2">Schema validation failed:</p>
          <ul className="list-disc list-inside space-y-1">
            {validation.errors.map((error, i) => (
              <li key={i} className="text-sm">{error}</li>
            ))}
          </ul>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    try {
      await onSave(data.properties);
      toast.success("Schema saved successfully");
    } catch (error) {
      toast.error(
        `Failed to save schema: ${error instanceof Error ? error.message : "Unknown error"}`
      );
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
      <div className="flex h-full min-h-0 overflow-hidden">
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
    </PageLayout>
  );
}
