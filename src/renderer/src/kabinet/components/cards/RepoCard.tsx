import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KabinetRepo } from "@/linkers";
import { GitBranch, Github, Package2 } from "lucide-react";
import { ListRepoFragment } from "../../api/graphql";

interface Props {
  item: ListRepoFragment;
}

const RepoCard = ({ item }: Props) => {
  return (
    <KabinetRepo.Smart object={item}>
      <Card className="group overflow-hidden">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate">
                <KabinetRepo.DetailLink object={item}>{item.name}</KabinetRepo.DetailLink>
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2 truncate text-xs">
                <Github className="h-3.5 w-3.5" />
                <span className="truncate">
                  {item.user}/{item.repo}
                </span>
              </CardDescription>
            </div>
            <Package2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="gap-1 rounded-full px-2 py-0.5">
              <GitBranch className="h-3 w-3" />
              {item.branch}
            </Badge>
          </div>
        </CardHeader>
      </Card>
    </KabinetRepo.Smart>
  );
};

export default React.memo(RepoCard);