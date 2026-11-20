import React from "react";
import Timestamp from "@/core/ui/timestamp";
import { KabinetPod } from "@/core/linkers";
import { Cpu } from "lucide-react";
import { ListPodFragment, PodStatus } from "../../api/graphql";
import { releaseIdentity } from "../../appIdentity";
import { AppIcon } from "../AppIcon";
import { KabinetCard, StatusWord } from "./parts";

interface Props {
  item: ListPodFragment;
}

/**
 * A running copy of an app: which app and build, how it is doing, where it
 * runs, and when it last reported. A failed pod is outlined in red.
 */
const TheCard = ({ item }: Props) => {
  const { flavour } = item.deployment;
  const app = releaseIdentity(flavour.release);
  const logged = item.latestLogDump?.createdAt;

  return (
    <KabinetPod.Smart object={item}>
      <KabinetCard
        tone={item.status === PodStatus.Failed ? "failed" : undefined}
        lead={<AppIcon app={app} size={36} className="size-9 rounded-lg text-xs" />}
        title={
          <KabinetPod.DetailLink object={item} className="transition-colors hover:text-primary">
            {app.name}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">v{flavour.release.version}</span>
          </KabinetPod.DetailLink>
        }
        aside={<StatusWord status={item.status} />}
        sub={`${flavour.name} on ${item.backend.name}`}
        footer={
          <>
            {item.resource ? (
              <span className="flex min-w-0 items-center gap-1 truncate">
                <Cpu className="size-3 shrink-0" />
                <span className="truncate">{item.resource.name}</span>
              </span>
            ) : (
              <span className="truncate font-mono">{item.podId.slice(0, 12)}</span>
            )}
            {logged && (
              <span className="shrink-0" title="Last log">
                logged <Timestamp date={logged} relative />
              </span>
            )}
          </>
        }
      />
    </KabinetPod.Smart>
  );
};

export default React.memo(TheCard);
