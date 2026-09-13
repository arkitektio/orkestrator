import React from "react";
import { useDialog } from "@/app/dialog";
import { cn } from "@/lib/utils";
import { RekuestImplementation } from "@/linkers";
import { ListImplementationFragment } from "@/rekuest/api/graphql";
import { PlayCircle } from "lucide-react";
import { useCallback } from "react";

interface Props {
  item: ListImplementationFragment;
}

const AgentImplementationCard = ({ item }: Props) => {
  const { openDialog } = useDialog();

  const onRun = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openDialog("implementationassign", { id: item.id }, {});
    },
    [item.id, openDialog],
  );

  return (
    <RekuestImplementation.Smart object={item} hover>
      <div
        onClick={onRun}
        className={cn(
          "group flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer bg-card border-border",
          "hover:bg-accent hover:border-accent-foreground/20 transition-colors",
        )}
      >
        <PlayCircle className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-none truncate">
            {item.action.name}
          </p>
          {item.action.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {item.action.description}
            </p>
          )}
        </div>
      </div>
    </RekuestImplementation.Smart>
  );
};

export default React.memo(AgentImplementationCard);