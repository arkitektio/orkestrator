import { Button } from "@/core/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/ui/popover";
import { cn } from "@/core/util/utils";
import { PlayIcon } from "lucide-react";
import { SmartMenu, useSmartMenu } from "./menu";
import { useSmartPrefetcher } from "./prefetchContext";
import type { SmartSectionRegistry } from "./sectionRegistry";
import type { ObjectButtonProps, SmartContextProps } from "./types";

export const ObjectButton = ({ open, onOpenChange, ...props }: ObjectButtonProps) => {
  const prefetcher = useSmartPrefetcher();
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        // The child is the button: a trigger of its own would nest one.
        asChild
        onPointerEnter={() =>
          prefetcher?.prefetch({
            objects: props.objects,
            partners: props.partners,
            collection: props.collection,
          })
        }
      >
        {props.children || (
          <Button
            variant={props.variant || "outline"}
            className={cn(props.className, "text-foreground")}
            size={props.size || "icon"}
          >
            <PlayIcon />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="text-foreground border-border px-2 py-2 items-left"
        data-nonbreaker
      >
        <SmartContext {...props} />
      </PopoverContent>
    </Popover>
  );
};

/**
 * The smart context menu: every registered section that applies to the
 * selection, in priority order.
 *
 * It unrolls in two tiers. The instant sections (local actions) are on screen
 * in the frame the menu opens; the remote ones mount one frame later and
 * appear, each in its fixed slot, as their data lands — nothing above them
 * moves. A slim bar under the search runs until every section has answered,
 * and only then may the menu say there is nothing to do.
 *
 * The search field ends in the sections' `SearchBar` buttons (local: Share,
 * Open). Every row carries a pin toggle; pinned rows leave their section for the
 * start of the list, above every section, so the first is the one Enter runs.
 *
 * One composition of the menu's parts (`menu.tsx`), drawn with the list
 * skin; a view that wants another layout or look composes its own.
 */
export const SmartContext = (
  props: SmartContextProps & { registry?: SmartSectionRegistry },
) => {
  const menu = useSmartMenu(props);
  return (
    <SmartMenu.Root menu={menu}>
      <SmartMenu.Header />
      <SmartMenu.Body>
        <SmartMenu.Search />
        <SmartMenu.Progress />
        <SmartMenu.List>
          <SmartMenu.Pinned />
          <SmartMenu.Sections />
          <SmartMenu.Empty />
        </SmartMenu.List>
      </SmartMenu.Body>
    </SmartMenu.Root>
  );
};
