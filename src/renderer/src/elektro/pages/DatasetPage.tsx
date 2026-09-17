import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { ListRender } from "@/components/layout/ListRender";
import { Sidebars } from "@/components/layout/Sidebars";
import { Badge } from "@/components/ui/badge";
import { ElektroDataset } from "@/linkers";
import { FileIcon, FolderIcon, LineChartIcon } from "lucide-react";
import { useGetDatasetQuery } from "../api/graphql";
import DatasetCard from "../components/cards/DatasetCard";
import FileCard from "../components/cards/FileCard";
import TraceCard from "../components/cards/TraceCard";

export const DatasetPage = asDetailQueryRoute(useGetDatasetQuery, ({ data }) => {
  const dataset = data?.dataset;
  if (!dataset) return null;

  return (
    <ElektroDataset.ModelPage
      actions={<ElektroDataset.Actions object={dataset} />}
      object={dataset}
      title={dataset.name}
      pageActions={
        <div className="flex items-center gap-2">
          <ElektroDataset.ObjectButton object={dataset} />
        </div>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <ElektroDataset.Knowledge object={dataset} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl border shadow-sm bg-amber-500/10 text-amber-500 border-amber-500/20">
            <FolderIcon className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
              {dataset.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>ID: {dataset.id}</span>
              {dataset.description && (
                <>
                  <span>•</span>
                  <span>{dataset.description}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Child datasets */}
      {dataset.children && dataset.children.length > 0 && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 mb-2 border-b border-border/40 pb-2">
            <FolderIcon className="h-4 w-4 text-amber-500" />
            <h2 className="text-lg font-bold tracking-tight">Datasets</h2>
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-semibold text-xs ml-auto"
            >
              {dataset.children.length} Total
            </Badge>
          </div>
          <ListRender array={dataset.children} fit>
            {(child) => <DatasetCard item={child} key={child.id} />}
          </ListRender>
        </div>
      )}

      {/* Traces */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 mb-2 border-b border-border/40 pb-2">
          <LineChartIcon className="h-4 w-4 text-emerald-500" />
          <h2 className="text-lg font-bold tracking-tight">Traces</h2>
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-semibold text-xs ml-auto"
          >
            {dataset.traces?.length ?? 0} Total
          </Badge>
        </div>
        <ListRender array={dataset.traces} fit>
          {(trace) => <TraceCard item={trace} key={trace.id} />}
        </ListRender>
      </div>

      {/* Files */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2 border-b border-border/40 pb-2">
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-bold tracking-tight">Files</h2>
          <Badge
            variant="outline"
            className="bg-muted text-muted-foreground border-border font-semibold text-xs ml-auto"
          >
            {dataset.files?.length ?? 0} Total
          </Badge>
        </div>
        <ListRender array={dataset.files} fit>
          {(file) => <FileCard item={file} key={file.id} />}
        </ListRender>
      </div>
    </ElektroDataset.ModelPage>
  );
});

export default DatasetPage;
