import { DisplayWidgetProps } from "@/lib/display/registry";
import { MikroLens } from "@/linkers";
import { useGetLensQuery } from "@/mikro-next/api/graphql";
import { lensLabel } from "@/mikro-next/lenses";

export const LensDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetLensQuery({ variables: { id: props.object } });

  if (!data?.lens) {
    return <div className="text-xs text-muted-foreground">Lens not found</div>;
  }

  const lens = data.lens;

  if (props.context === "command") {
    return (
      <MikroLens.DetailLink object={{ id: props.object }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{lens.dataset.name}</span>
          <span className="text-xs text-muted-foreground truncate font-mono">
            {lensLabel(lens)}
          </span>
        </div>
      </MikroLens.DetailLink>
    );
  }

  return (
    <MikroLens.DetailLink object={{ id: props.object }}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-1">
        <div className="font-semibold text-sm">{lens.dataset.name}</div>
        <div className="font-mono text-xs text-muted-foreground">{lensLabel(lens)}</div>
      </div>
    </MikroLens.DetailLink>
  );
};

export default LensDisplay;
