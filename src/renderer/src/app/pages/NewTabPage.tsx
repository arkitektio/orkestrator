import { Arkitekt } from "@/core/lib/arkitekt/host";
import { moduleRegistry } from "@/app/Arkitekt";
import { matchIcon } from "@/core/modules/moduleIcons";
import { ApplicableEntitySearch } from "@/core/command/sources/entity/ApplicableEntitySearch";
import { ApplicableNavigation } from "@/core/command/sources/ApplicableNavigation";
import { ApplicableRecents } from "@/core/command/sources/ApplicableRecents";
import { useTabTitle } from "@/core/command/tabs/useTabTitle";
import { Command, CommandEmpty, CommandList } from "@/core/components/ui/command";
import { cn } from "@/core/lib/utils";
import { useDebounce } from "@uidotdev/usehooks";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * A fresh tab: the search, and the modules.
 *
 * What ⌘T lands on. The same sources the palette shows — recents, navigation,
 * things found in the backends — but as the PAGE rather than a panel over one,
 * because a new tab has nothing else to show yet. Choosing a result navigates
 * inside this tab, so Back returns here, as a browser's does. Beneath the
 * search, one tile per module that is up: the top sites, in effect.
 */
export const NewTabPage = () => {
  useTabTitle("New tab");
  const [query, setQuery] = useState("");
  // The palette's own debounce, for the same reason: filtering per keystroke
  // would fan out into a network request per module.
  const filter = useDebounce(query, 100);

  const availableModules = Arkitekt.useAvailableModules();
  const modules = useMemo(
    () =>
      Object.keys(moduleRegistry)
        .map((key) => availableModules.find((entry) => entry.key === key))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .filter((entry) => entry.status === "ready" || entry.status === "checking"),
    [availableModules],
  );

  return (
    <div className="flex h-full w-full flex-col items-center overflow-y-auto px-6 py-16">
      <div className="w-full max-w-2xl space-y-10">
        <Command
          shouldFilter={false}
          className="rounded-xl border border-border/60 bg-background/60 shadow-sm [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground/90 [&_[cmdk-group]]:px-2 [&_[cmdk-item]]:min-h-10 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item][data-selected=true]]:bg-primary/10 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4"
        >
          <div className="flex h-12 items-center gap-2.5 border-b border-border/50 px-3.5">
            <Search className="h-4 w-4 shrink-0 opacity-70" />
            <CommandPrimitive.Input
              autoFocus
              data-slot="command-input"
              placeholder="Search, ask or do…"
              value={query}
              onValueChange={setQuery}
              className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList className="max-h-[50vh] px-1.5 py-1.5">
            {filter && (
              <CommandEmpty className="py-8 text-center text-xs text-muted-foreground">
                No results for “{filter}”.
              </CommandEmpty>
            )}
            <ApplicableRecents filter={filter} objects={[]} />
            <ApplicableNavigation filter={filter} objects={[]} />
            <ApplicableEntitySearch filter={filter} objects={[]} />
          </CommandList>
        </Command>

        {modules.length > 0 && (
          <section aria-label="Modules" className="space-y-3">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Modules
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
              {modules.map((entry) => (
                <Link
                  key={entry.key}
                  to={entry.route}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-4 text-center transition-colors",
                    "hover:border-primary/40 hover:bg-primary/10",
                    entry.status === "checking" && "opacity-70",
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 text-foreground [&_svg]:h-5 [&_svg]:w-5">
                    {matchIcon(entry.key)}
                  </span>
                  <span className="text-xs font-medium">
                    {moduleRegistry[entry.key]?.label || entry.definition.label || entry.key}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default NewTabPage;
