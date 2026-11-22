import React from "react";
import Timestamp from "@/core/ui/timestamp";
import { KabinetRepo } from "@/core/linkers";
import { GitBranch, Github } from "lucide-react";
import { ListRepoFragment } from "../../api/graphql";
import { KabinetCard, LeadTile, plural } from "./parts";

interface Props {
  item: ListRepoFragment;
}

/**
 * A repository Kabinet reads apps from: where it lives and which branch, what
 * it held when last read, and when that was.
 */
const RepoCard = ({ item }: Props) => {
  const held = [
    item.flavourCount > 0 && plural(item.flavourCount, "flavour"),
    item.blokCount > 0 && plural(item.blokCount, "blok"),
  ].filter(Boolean);

  return (
    <KabinetRepo.Smart object={item}>
      <KabinetCard
        lead={
          <LeadTile>
            <Github />
          </LeadTile>
        }
        title={
          <KabinetRepo.DetailLink object={item} className="transition-colors hover:text-primary">
            {item.name}
          </KabinetRepo.DetailLink>
        }
        aside={
          <span className="flex items-center gap-1">
            <GitBranch className="size-3" />
            {item.branch}
          </span>
        }
        sub={
          <span className="font-mono">
            {item.user}/{item.repo}
          </span>
        }
        footer={
          <>
            <span className="truncate">{held.length > 0 ? held.join(" · ") : "Nothing found yet"}</span>
            <span className="shrink-0">
              scanned <Timestamp date={item.updatedAt} relative />
            </span>
          </>
        }
      />
    </KabinetRepo.Smart>
  );
};

export default React.memo(RepoCard);
