import { PageLayout } from "@/core/layout/PageLayout";
import { SchemaBuilderPage } from "@/kraph/pages/SchemaBuilderPage";
import { useNavigate, useParams } from "react-router-dom";
import { useEntityNodesQuery, useGetEntityCategoryQuery, useUpdateEntityCategoryMutation } from "../api/graphql";
import {
  buildDerivationRule,
  DEFAULT_DERIVATION,
  PropertyDefinition,
} from "../components/schema-builder/utils";

export function EntityCategorySchemaBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, loading } = useGetEntityCategoryQuery({
    variables: { id: id! },
    skip: !id,
  });

  useEntityNodesQuery({
    variables: {
      category: id!,
      pagination: { limit: 1 },
    },
    skip: !id,
  });

  const [updateEntityCategory] = useUpdateEntityCategoryMutation({
    refetchQueries: ["GetEntityCategory"],
  });

  if (loading) {
    return (
      <PageLayout title="Loading...">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading schema...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!data?.entityCategory) {
    return (
      <PageLayout title="Not Found">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">Entity Category not found</p>
            <p className="text-muted-foreground">
              The entity category you&apos;re looking for doesn&apos;t exist
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const entityCategory = data.entityCategory;

  // Seed from what the category actually holds. `propertyDefinitions` is a full
  // replace on update, so a field dropped here is a field the next save erases —
  // which is what happened to every derivation rule while the fragment selected
  // only `rule { aggregation }`.
  const initialProperties: PropertyDefinition[] =
    entityCategory.propertyDefinitions.map((def) => ({
      key: def.key,
      label: def.label || def.key,
      description: def.description || undefined,
      unit: def.unit,
      valueKind: def.valueKind,
      derivation: def.derivation || DEFAULT_DERIVATION,
      rule: buildDerivationRule(def.rule),
      index: def.index ?? false,
      searchable: def.searchable ?? false,
    }));

  const handleSave = async (properties: PropertyDefinition[]) => {
    await performSave(properties);
  };

  const performSave = async (properties: PropertyDefinition[]) => {
    await updateEntityCategory({
      variables: {
        input: {
          id: entityCategory.id,
          propertyDefinitions: properties.map((prop) => ({
            key: prop.key,
            label: prop.label,
            description: prop.description || "",
            unit: prop.unit,
            valueKind: prop.valueKind,
            derivation: prop.derivation || DEFAULT_DERIVATION,
            searchable: prop.searchable || false,
            index: prop.index || false,
            rule: buildDerivationRule(prop.rule),
          })),
        },
      },
    });

    navigate(-1);
  };

  return (
    <SchemaBuilderPage
      title={`${entityCategory.label} Schema`}
      initialProperties={initialProperties}
      onSave={handleSave}
      onCancel={() => navigate(-1)}
    />
  );
}
