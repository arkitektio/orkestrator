import React from "react";
import { KabinetDefinition } from "@/core/linkers";
import { FunctionSquare } from "lucide-react";
import { ActionKind, ListDefinitionFragment } from "../../api/graphql";
import { signature } from "../../lib/ports";
import { DefinitionLogo } from "../logo/KabinetBlokLogo";
import { KabinetCard, LeadTile } from "./parts";

interface Props {
  item: ListDefinitionFragment;
}

/**
 * An action a release declares: what it does, its signature (takes →
 * returns) on one line, and which apps bring it.
 */
const TheCard = ({ item }: Props) => {
  const apps = item.apps.map((app) => app.identifier);
  const line = signature(item.args, item.returns);

  return (
    <KabinetDefinition.Smart object={item}>
      <KabinetCard
        lead={
          item.logo ? (
            <DefinitionLogo definition={item} className="size-9 shrink-0 rounded-lg" />
          ) : (
            <LeadTile>
              <FunctionSquare />
            </LeadTile>
          )
        }
        title={
          <KabinetDefinition.DetailLink object={item} className="transition-colors hover:text-primary">
            {item.name}
          </KabinetDefinition.DetailLink>
        }
        aside={item.kind === ActionKind.Generator ? "generator" : undefined}
        sub={
          <span className="font-mono" title={line}>
            {line}
          </span>
        }
        footer={
          apps.length > 0 ? (
            <span className="truncate font-mono" title={apps.join(", ")}>
              {apps.join(", ")}
            </span>
          ) : undefined
        }
      >
        {item.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground" title={item.description}>
            {item.description}
          </p>
        )}
      </KabinetCard>
    </KabinetDefinition.Smart>
  );
};

export default React.memo(TheCard);
