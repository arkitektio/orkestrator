import React from "react";
import { PageSections } from "@/core/layout/PageSections";
import { KabinetFlavour } from "@/core/linkers";
import { ListFlavourFragment } from "../../api/graphql";
import { logoFor, releaseIdentity } from "../../appIdentity";
import { AppIcon } from "../AppIcon";
import { KabinetCard, StatusTally } from "./parts";

interface Props {
  item: ListFlavourFragment;
}

/** What a selector asks of the host, as a badge word. Shared with the repo's Info rail. */
export const selectorLabel = (
  selector: Pick<ListFlavourFragment["selectors"][number], "__typename">,
): string => {
  switch (selector.__typename) {
    case "CudaSelector":
      return "CUDA";
    case "RocmSelector":
      return "ROCm";
    case "CPUSelector":
      return "CPU";
    default:
      return selector.__typename?.replace(/Selector$/, "") ?? "Unknown";
  }
};

/**
 * One build of a release: what it needs of the host, which app and version it
 * is, and where it runs.
 */
const TheCard = ({ item }: Props) => {
  // A flavour is one build of an app, so it wears the app's identity — with its
  // own logo preferred, since that is the one specific to this build.
  const app = { ...releaseIdentity(item.release), logo: logoFor(item) ?? undefined };
  const needs = [...new Set(item.selectors.map(selectorLabel))];

  return (
    <KabinetFlavour.Smart object={item}>
      <KabinetCard
        // `relative isolate`: a card section may paint a fill behind the content.
        className="relative isolate overflow-hidden"
        lead={<AppIcon app={app} size={36} className="size-9 rounded-lg text-xs" />}
        title={
          <KabinetFlavour.DetailLink object={item} className="transition-colors hover:text-primary">
            {item.name}
          </KabinetFlavour.DetailLink>
        }
        aside={needs.length > 0 ? needs.join(" · ") : "Any host"}
        sub={
          <span className="font-mono">
            {item.release.app.identifier} · v{item.release.version}
          </span>
        }
        footer={
          <>
            <StatusTally items={item.deployments} empty="Not deployed" />
            {/* Other modules on a flavour card. */}
            <PageSections placement="card" identifier="@kabinet/flavour" object={{ id: item.id }} />
          </>
        }
      />
    </KabinetFlavour.Smart>
  );
};

export default React.memo(TheCard);
