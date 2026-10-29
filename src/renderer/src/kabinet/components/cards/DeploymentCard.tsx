import React from "react";
import { KabinetDeployment } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { ListDeploymentFragment } from "../../api/graphql";
import { releaseIdentity } from "../../appIdentity";
import { POD_STATUS_DOT, podStatusLabel } from "../../lib/podStatus";
import { AppIcon } from "../AppIcon";

interface Props {
  item: ListDeploymentFragment;
}

/** One deployment as a row: the app it runs, its version and build, where, and how it is doing. */
const TheCard = ({ item }: Props) => {
  const release = item.flavour.release;
  const app = releaseIdentity({ ...release, flavours: [item.flavour] });

  return (
    <KabinetDeployment.Smart object={item} className="[container-type:normal]!">
      <KabinetDeployment.DetailLink
        object={item}
        className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-2.5 transition-colors hover:border-primary/30 hover:bg-muted/50"
      >
        <AppIcon app={app} size={36} className="size-9 rounded-lg text-xs" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium leading-tight">
            {app.name}{" "}
            <span className="font-normal text-muted-foreground">
              v{release.version} · {item.flavour.name}
            </span>
          </span>
          <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span className={cn("size-1.5 shrink-0 rounded-full", POD_STATUS_DOT[item.status])} />
            <span>{podStatusLabel(item.status)}</span>
            <span>·</span>
            <span className="truncate">{item.backend.name}</span>
          </span>
        </span>
      </KabinetDeployment.DetailLink>
    </KabinetDeployment.Smart>
  );
};

export default React.memo(TheCard);
