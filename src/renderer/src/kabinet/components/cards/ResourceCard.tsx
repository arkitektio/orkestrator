import React from "react";
import { KabinetResource } from "@/core/linkers";
import { Cpu } from "lucide-react";
import { ListResourceFragment, PodStatus } from "../../api/graphql";
import { qualifierRows } from "../../lib/qualifiers";
import { IconForBackendKind } from "../IconForBackendKind";
import { KabinetCard, LeadTile, StatusBar, StatusTally } from "./parts";

interface Props {
  item: ListResourceFragment;
}

/** How many qualifiers a card shows before it says "+N". */
const SHOWN_QUALIFIERS = 3;

/**
 * Something a backend runs pods on: its backend, the first few things it
 * reports about itself, and how the pods on it are doing.
 */
const TheCard = ({ item }: Props) => {
  const qualifiers = qualifierRows(item.qualifiers);
  const failing = item.pods.some((pod) => pod.status === PodStatus.Failed);

  return (
    <KabinetResource.Smart object={item}>
      <KabinetCard
        tone={failing ? "failed" : undefined}
        lead={
          <LeadTile>
            <Cpu />
          </LeadTile>
        }
        title={
          <KabinetResource.DetailLink object={item} className="transition-colors hover:text-primary">
            {item.name}
          </KabinetResource.DetailLink>
        }
        sub={
          <span className="flex min-w-0 items-center gap-1">
            <IconForBackendKind kind={item.backend.kind} className="size-3 shrink-0" />
            <span className="truncate">{item.backend.name}</span>
          </span>
        }
        footer={<StatusTally items={item.pods} empty="No pods" />}
      >
        {qualifiers.length > 0 && (
          <dl
            className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs"
            title={qualifiers.map(([key, value]) => `${key}: ${value}`).join("\n")}
          >
            {qualifiers.slice(0, SHOWN_QUALIFIERS).map(([key, value]) => (
              <div key={key} className="flex min-w-0 gap-1">
                <dt className="text-muted-foreground">{key}</dt>
                <dd className="truncate font-medium">{value}</dd>
              </div>
            ))}
            {qualifiers.length > SHOWN_QUALIFIERS && (
              <span className="text-muted-foreground">+{qualifiers.length - SHOWN_QUALIFIERS}</span>
            )}
          </dl>
        )}
        <StatusBar items={item.pods} />
      </KabinetCard>
    </KabinetResource.Smart>
  );
};

export default React.memo(TheCard);
