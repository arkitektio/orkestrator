import React from "react";
import { PageSections } from "@/core/layout/PageSections";
import { KabinetRelease } from "@/core/linkers";
import { ListReleaseFragment } from "../../api/graphql";
import { releaseIdentity } from "../../appIdentity";
import { AppIcon } from "../AppIcon";
import { selectorLabel } from "./FlavourCard";
import { KabinetCard, plural, StatusTally } from "./parts";

interface Props {
  item: ListReleaseFragment;
}

/**
 * One version of an app: its identity, the hardware its builds need, and
 * where it runs. Installing it is the "Install…" local action, in the card's
 * menu, rather than a button on every card.
 */
const TheCard = ({ item }: Props) => {
  const app = releaseIdentity(item);
  const needs = [...new Set(item.flavours.flatMap((flavour) => flavour.selectors.map(selectorLabel)))];

  return (
    <KabinetRelease.Smart object={item}>
      <KabinetCard
        className="relative isolate overflow-hidden"
        lead={<AppIcon app={app} size={36} className="size-9 rounded-lg text-xs" />}
        title={
          <KabinetRelease.DetailLink object={item} className="transition-colors hover:text-primary">
            {app.name}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">v{item.version}</span>
          </KabinetRelease.DetailLink>
        }
        aside={item.channel && item.channel !== "stable" ? item.channel : undefined}
        sub={<span className="font-mono">{item.app.identifier}</span>}
        footer={
          <>
            <StatusTally items={item.deployments} empty={plural(item.flavours.length, "flavour")} />
            <span className="flex shrink-0 items-center gap-2">
              {needs.length > 0 && <span>{needs.join(" · ")}</span>}
              {/* Other modules on a release card. */}
              <PageSections placement="card" identifier="@kabinet/release" object={{ id: item.id }} />
            </span>
          </>
        }
      />
    </KabinetRelease.Smart>
  );
};

export default React.memo(TheCard);
