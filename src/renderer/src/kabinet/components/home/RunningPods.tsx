import { HomeSection } from "@/core/layout/ModuleHome";
import { KabinetPod } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { Link } from "react-router-dom";
import { ListPodFragment, PodStatus, useListPodQuery } from "../../api/graphql";
import { releaseIdentity } from "../../appIdentity";
import { AppIcon } from "../AppIcon";

/** How many pods the home page lists; the Pods page has every one. */
const SHOWN = 8;

const STATUS_DOT: Record<PodStatus, string> = {
  [PodStatus.Running]: "bg-emerald-500",
  [PodStatus.Pending]: "bg-amber-500 animate-pulse",
  [PodStatus.Stopping]: "bg-amber-500 animate-pulse",
  [PodStatus.Failed]: "bg-destructive",
  [PodStatus.Stopped]: "bg-muted-foreground/40",
  [PodStatus.Unkown]: "bg-muted-foreground/40",
};

/** Running first, then the ones on their way up or down, then the rest. */
const RANK: Record<PodStatus, number> = {
  [PodStatus.Running]: 0,
  [PodStatus.Pending]: 1,
  [PodStatus.Stopping]: 1,
  [PodStatus.Failed]: 2,
  [PodStatus.Unkown]: 3,
  [PodStatus.Stopped]: 4,
};

const PodRow = ({ pod }: { pod: ListPodFragment }) => {
  const release = pod.deployment.flavour.release;
  const app = releaseIdentity(release);
  return (
    <KabinetPod.Smart object={pod} className="[container-type:normal]!">
      <KabinetPod.DetailLink
        object={pod}
        className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-2.5 transition-colors hover:border-primary/30 hover:bg-muted/50"
      >
        <AppIcon app={app} size={36} className="size-9 rounded-lg text-xs" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium leading-tight">
            {app.name} <span className="font-normal text-muted-foreground">v{release.version}</span>
          </span>
          <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[pod.status])} />
            <span className="lowercase first-letter:uppercase">{pod.status}</span>
            <span>·</span>
            <span className="truncate">{pod.resource?.name ?? pod.backend.name}</span>
          </span>
        </span>
      </KabinetPod.DetailLink>
    </KabinetPod.Smart>
  );
};

/**
 * The pods on your engines, live ones first: what Kabinet is running for you
 * right now. Nothing deployed draws nothing.
 */
export const RunningPods = () => {
  const { data } = useListPodQuery({ fetchPolicy: "cache-and-network" });
  const pods = [...(data?.pods ?? [])].sort((a, b) => RANK[a.status] - RANK[b.status]);
  if (pods.length === 0) return null;

  const running = pods.filter((pod) => pod.status === PodStatus.Running).length;

  return (
    <HomeSection
      title={
        <span className="flex w-full items-center justify-between">
          <span>
            Pods <span className="font-normal normal-case tracking-normal">· {running} running</span>
          </span>
          <Link
            to="/kabinet/pods"
            className="text-[11px] font-normal normal-case tracking-normal hover:text-foreground"
          >
            All pods →
          </Link>
        </span>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-2">
        {pods.slice(0, SHOWN).map((pod) => (
          <PodRow key={pod.id} pod={pod} />
        ))}
      </div>
    </HomeSection>
  );
};
