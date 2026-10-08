import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { LoadingPage } from "@/core/layout/fallbacks/LoadingPage";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
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

  const { data, loading, error, refetch } = useGetEntityCategoryQuery({
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

  if (error && !data) {
    return <QueryError error={error} onRetry={() => refetch()} resource="entity category" id={id} />;
  }
  if (loading && !data) return <LoadingPage />;
  if (!data?.entityCategory) return <NotFound />;

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
