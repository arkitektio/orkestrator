import React from "react";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { KabinetBackend } from "@/core/linkers";
import { ListBackendFragment, PodStatus } from "../../api/graphql";
import { IconForBackendKind } from "../IconForBackendKind";
import { KabinetCard, LeadTile, plural, StatusBar, StatusTally } from "./parts";

interface Props {
  item: ListBackendFragment;
}

/**
 * A backend: the engine it drives, who connected it, and how its pods are
 * doing — a health bar and a count per status — with how many resources it
 * offers. A backend with a failed pod is outlined in red.
 */
const TheCard = ({ item }: Props) => {
  const failing = item.pods.some((pod) => pod.status === PodStatus.Failed);

  return (
    <KabinetBackend.Smart object={item}>
      <KabinetCard
        tone={failing ? "failed" : undefined}
        lead={
          <LeadTile>
            <IconForBackendKind kind={item.kind} />
          </LeadTile>
        }
        title={
          <KabinetBackend.DetailLink object={item} className="transition-colors hover:text-primary">
            {item.name}
          </KabinetBackend.DetailLink>
        }
        aside={item.kind}
        sub={
          <span className="flex min-w-0 items-center gap-1">
            by <StructureDisplay identifier="@lok/user" id={item.user.sub} variant="inline" />
          </span>
        }
        footer={
          <>
            <StatusTally items={item.pods} empty="No pods" />
            {item.resources.length > 0 && (
              <span className="shrink-0">{plural(item.resources.length, "resource")}</span>
            )}
          </>
        }
      >
        <StatusBar items={item.pods} />
      </KabinetCard>
    </KabinetBackend.Smart>
  );
};

export default React.memo(TheCard);
