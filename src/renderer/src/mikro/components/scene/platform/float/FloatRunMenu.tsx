import { useEffect, useState, type ReactNode } from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { SmartMenu, TILE_SKIN, useSmartMenu } from "@/core/smart/ObjectButton";
import type { SmartSectionSelection } from "@/core/smart/extensions/section";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import type { Structure } from "@/core/types";
import { Button } from "@/core/ui/button";

/**
 * A float's Run pane: the actions as tiles (`TILE_SKIN`), one muted line above
 * them saying what they run with (a picker, usually), and the search waiting
 * behind a magnifier — open at once when the float was opened by a click
 * (`autoFocus`) or by typing (`initialSearch`), where the keys are meant for it.
 *
 * Shared by the annotation card ("Run" on a shape with the image under it)
 * and the layer float ("Run" on the slice or selection on screen), so the two
 * read as one thing.
 */
export const FloatRunMenu = ({
  objects,
  partners,
  sections,
  materialize,
  askPartner,
  line,
  searchPlaceholder,
  emptyText,
  autoFocus,
  initialSearch,
  onFilterChange,
  onDone,
}: {
  objects: Structure[];
  partners: Structure[];
  sections: SmartSectionSelection;
  materialize?: SmartContextProps["materialize"];
  askPartner?: boolean;
  /** The line beside the magnifier: what the actions run with. */
  line: ReactNode;
  searchPlaceholder: string;
  emptyText: string;
  autoFocus: boolean;
  /** What was already typed (the float's root hands on its first key). */
  initialSearch?: string;
  onFilterChange?: (filter: string | undefined) => void;
  onDone: () => void;
}) => {
  const menu = useSmartMenu({ objects, partners, sections, materialize, autoFocus, onDone, askPartner });
  // Once, on mount: what was typed before this menu existed.
  const { setFilter } = menu;
  useEffect(() => {
    if (initialSearch) setFilter(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => onFilterChange?.(menu.filter), [menu.filter, onFilterChange]);
  const [searching, setSearching] = useState(autoFocus);
  const stopSearching = () => {
    setSearching(false);
    menu.setFilter(undefined);
  };

  return (
    <SmartMenu.Root menu={menu} skin={TILE_SKIN}>
      <SmartMenu.Body className="rounded-none bg-transparent p-0">
        <div
          className="flex min-h-6 items-center gap-1 pl-1"
          // Escape folds the search first; the float's own Escape is the next one.
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !searching) return;
            event.preventDefault();
            stopSearching();
          }}
        >
          {searching ? (
            <>
              <div className="min-w-0 flex-1">
                <SmartMenu.Search placeholder={searchPlaceholder} className="h-7 text-xs" autoFocus />
              </div>
              <Button variant="ghost" size="icon-xs" aria-label="Close search" onClick={stopSearching}>
                <XIcon />
              </Button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">{line}</div>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Search actions"
                onClick={() => setSearching(true)}
              >
                <SearchIcon />
              </Button>
            </>
          )}
        </div>
        <SmartMenu.Progress />
        <SmartMenu.List className="mt-1 max-h-64 p-0.5">
          <SmartMenu.Pinned />
          <SmartMenu.Sections />
          <SmartMenu.Empty>{emptyText}</SmartMenu.Empty>
        </SmartMenu.List>
      </SmartMenu.Body>
    </SmartMenu.Root>
  );
};
