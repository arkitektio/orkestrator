import { useParams } from "react-router-dom";
import { Explainer } from "@/core/components/explainer/Explainer";
import { ElektroArrayDataset } from "@/core/linkers";
import ArrayDatasetList from "../components/lists/ArrayDatasetList";
import { ARRAY_DATASET_SPEC_BY_SLUG } from "../specs";

/**
 * One array-dataset list per spec, filtered server-side — mikro's
 * `ArrayDatasetSpecPage`. A route per spec rather than `?spec=` on the list:
 * the spec is what the page IS.
 */
const ArrayDatasetSpecPage = () => {
  const { spec: slug } = useParams<{ spec: string }>();
  const entry = slug ? ARRAY_DATASET_SPEC_BY_SLUG[slug] : undefined;

  if (!entry) {
    return (
      <ElektroArrayDataset.ListPage title="Unknown spec">
        <div className="p-3 text-sm text-muted-foreground">
          No array dataset spec named “{slug}”.
        </div>
      </ElektroArrayDataset.ListPage>
    );
  }

  return (
    <ElektroArrayDataset.ListPage title={entry.label}>
      <div className="flex flex-col gap-3 p-3">
        <Explainer title={entry.label} description={entry.description} />
        {/* Keyed on the spec: the list's pagination belongs to one filter. */}
        <ArrayDatasetList key={entry.spec} filters={{ spec: [entry.spec] }} title={entry.label} />
      </div>
    </ElektroArrayDataset.ListPage>
  );
};

export default ArrayDatasetSpecPage;
