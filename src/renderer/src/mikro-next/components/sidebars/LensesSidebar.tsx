import { useDialog } from "@/app/dialog";
import { Button } from "@/components/ui/button";
import { MikroLens } from "@/linkers";
import { Aperture, Plus } from "lucide-react";
import { useGetLensesQuery } from "../../api/graphql";
import { lensLabel } from "../../lenses";

/**
 * Every lens over one dataset — the full one and each crop — as rail rows. Its
 * own tab, so the query runs only once someone opens it. Each row is the lens'
 * smart model: right-click (or drag onto a scene) for everything a lens can do.
 */
export const LensesSidebar = ({ dataset }: { dataset: string }) => {
  const { openDialog } = useDialog();
  const { data } = useGetLensesQuery({ variables: { filters: { dataset } } });

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex flex-row items-center justify-between gap-2">
        <div className="text-xs font-semibold">Lenses</div>
        <Button
          variant="ghost"
          size="xs"
          className="h-6 gap-1 px-2 text-xs"
          onClick={() => openDialog("createlens", { dataset }, { size: "medium" })}
        >
          <Plus className="h-3 w-3" />
          New
        </Button>
      </div>

      {data?.lenses.map((lens) => (
        <MikroLens.Smart key={lens.id} object={lens}>
          <div className="flex flex-row items-start gap-2 rounded-md border border-border/60 p-2 transition-colors hover:bg-accent/50">
            <Aperture className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <MikroLens.DetailLink object={lens} className="text-sm font-medium">
                {lens.slices.length > 0 ? "Crop" : "Full"}
              </MikroLens.DetailLink>
              <span className="break-all font-mono text-[0.625rem] text-muted-foreground">
                {lensLabel(lens)}
              </span>
            </div>
          </div>
        </MikroLens.Smart>
      ))}
    </div>
  );
};
