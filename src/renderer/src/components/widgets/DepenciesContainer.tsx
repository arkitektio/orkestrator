import { portHash } from "@/rekuest/widgets/utils";
import { ListAgentFragment, ListDependencyFragment, ResolvedDependencyInput, useAgentForDependencyLazyQuery } from "@/rekuest/api/graphql";
import { ArgPort, PortGroup } from "@/rekuest/widgets/types";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk"
import { cn, notEmpty } from "@/lib/utils";
import { UserAvatar } from "@/lok-next/components/UserAvatar";
import { CheckIcon } from "@radix-ui/react-icons";
import { Bot, Circle, SearchIcon, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { FormDescription, FormLabel } from "../ui/form";
import { InputGroup, InputGroupAddon } from "../ui/input-group";

export type FilledGroup = PortGroup & {
  filledPorts: ArgPort[];
};

export { portHash };

export const NanaContainer = () => {
  return (
    <div className="grid @lg:grid-cols-2 @lg:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-6 gap-5">
      {" "}
    </div>
  );
};



function CommandInputWithBadges({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <InputGroup className="bg-input/20 dark:bg-input/30 h-8!">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full text-xs/relaxed outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        {children && (
          <InputGroupAddon className="gap-1">
            {children}
          </InputGroupAddon>
        )}
        <InputGroupAddon>
          <SearchIcon className="size-3.5 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}











export type DependencyFieldProps = {
  dependency: ListDependencyFragment;
};

export const DependencySearchField = ({
  dependency,
}: DependencyFieldProps) => {
  const form = useFormContext();

  const [agents, setAgents] = useState<ListAgentFragment[]>([]);
  const [agentCache, setAgentCache] = useState<Record<string, ListAgentFragment>>({});
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const [search] = useAgentForDependencyLazyQuery();

  // Read the current entry for this dependency from the form
  const getEntry = (): ResolvedDependencyInput | undefined => {
    const deps = (form.getValues("dependencies") as ResolvedDependencyInput[] | undefined) || [];
    return deps.find((d) => d.key === dependency.key);
  };

  const getSelectedAgentIds = (): string[] => {
    return getEntry()?.mappedAgents?.map((ma) => ma.agent) || [];
  };

  // Write the full entry back to the form's dependencies array
  const setDependencyEntry = (entry: ResolvedDependencyInput) => {
    const deps = [...((form.getValues("dependencies") as ResolvedDependencyInput[] | undefined) || [])];
    const existingIndex = deps.findIndex((d) => d.key === dependency.key);
    if (existingIndex >= 0) {
      deps[existingIndex] = entry;
    } else {
      deps.push(entry);
    }
    // Remove entries with no agents and not auto-resolving
    const filtered = deps.filter((d) => d.mappedAgents.length > 0 || d.autoResolve);
    form.setValue("dependencies", filtered, { shouldValidate: true });
  };

  const setSelectedAgentIds = (agentIds: string[]) => {
    setDependencyEntry({
      key: dependency.key,
      autoResolve: autoResolve,
      mappedAgents: agentIds.map((id) => ({
        agent: id,
        key: dependency.key,
        mappedActions: [],
      })),
    });
  };

  // Derive autoResolve from form state (reactive via useWatch)
  const watchedDeps = useWatch({ control: form.control, name: "dependencies" }) as ResolvedDependencyInput[] | undefined;
  const autoResolve = watchedDeps?.find((d) => d.key === dependency.key)?.autoResolve ?? false;

  const [selectedIds, setSelectedIds] = useState<string[]>(() => getSelectedAgentIds());

  const updateSelection = (agentIds: string[]) => {
    setSelectedIds(agentIds);
    setSelectedAgentIds(agentIds);
  };

  const toggleAutoResolve = () => {
    const newVal = !autoResolve;
    setDependencyEntry({
      key: dependency.key,
      autoResolve: newVal,
      mappedAgents: selectedIds.map((id) => ({
        agent: id,
        key: dependency.key,
        mappedActions: [],
      })),
    });
  };

  const queryAgents = useDebouncedCallback((searchStr: string) => {
    search({ variables: { search: searchStr, dependency: dependency.id } })
      .then((res) => {
        const found = res.data?.agents?.filter(notEmpty) || [];
        setAgents(found);
        const newCache: Record<string, ListAgentFragment> = {};
        found.forEach((a) => { newCache[a.id] = a; });
        setAgentCache((prev) => ({ ...prev, ...newCache }));
        setOpen(true);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setAgents([]);
      });
  });

  // Load initial options + resolve data for pre-selected agents
  useEffect(() => {
    search({ variables: { search: "", dependency: dependency.id } })
      .then((res) => {
        const found = res.data?.agents?.filter(notEmpty) || [];
        setAgents(found);
        const newCache: Record<string, ListAgentFragment> = {};
        found.forEach((a) => { newCache[a.id] = a; });
        setAgentCache((prev) => ({ ...prev, ...newCache }));
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setAgents([]);
      });

    const preSelected = getSelectedAgentIds();
    if (preSelected.length > 0) {
      search({ variables: { values: preSelected } })
        .then((res) => {
          const found = res.data?.agents?.filter(notEmpty) || [];
          const newCache: Record<string, ListAgentFragment> = {};
          found.forEach((a) => { newCache[a.id] = a; });
          setAgentCache((prev) => ({ ...prev, ...newCache }));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependency.id]);

  const maxAgents = dependency.singular ? 1 : (dependency.maxViableInstances ?? Infinity);

  const toggleAgent = (agentId: string) => {
    let newIds: string[];
    if (selectedIds.includes(agentId)) {
      newIds = selectedIds.filter((id) => id !== agentId);
    } else {
      newIds = [...selectedIds, agentId];
      // Enforce max: drop oldest selections to stay within limit
      if (newIds.length > maxAgents) {
        newIds = newIds.slice(newIds.length - maxAgents);
      }
    }
    updateSelection(newIds);
    setInputValue("");
  };

  const removeAgent = (agentId: string) => {
    updateSelection(selectedIds.filter((id) => id !== agentId));
  };

  // Read per-dependency form error (path: dependencies.{dep.key})
  const depErrors = form.formState.errors?.dependencies as Record<string, { message?: string }> | undefined;
  const fieldError = depErrors?.[dependency.key]?.message;

  // Build count hint string
  const countHint = (() => {
    const min = dependency.minViableInstances;
    const max = dependency.maxViableInstances;
    if (dependency.singular) return "1 agent";
    if (min != null && max != null) return `${min}–${max} agents`;
    if (min != null) return `≥${min} agents`;
    if (max != null) return `≤${max} agents`;
    return null;
  })();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dependency.key != null && (
            <FormLabel className="text-sm">{dependency.key}</FormLabel>
          )}
          {countHint && (
            <span className="text-[10px] text-muted-foreground">
              ({selectedIds.length}{autoResolve ? "+auto" : ""} / {countHint})
            </span>
          )}
          {!countHint && selectedIds.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              ({selectedIds.length} selected{autoResolve ? " +auto" : ""})
            </span>
          )}
        </div>
        {dependency.autoResolvable && (
          <Button
            type="button"
            variant={autoResolve ? "default" : "outline"}
            size="sm"
            className="h-6 text-[10px] px-2 gap-1"
            onClick={toggleAutoResolve}
          >
            <Zap className={cn("h-3 w-3", autoResolve && "text-yellow-300")} />
            {autoResolve ? "Auto" : "Auto-resolve"}
          </Button>
        )}
      </div>

      {/* Search + badges – hidden when auto-resolving */}
      {!autoResolve && (
      <Command
        shouldFilter={false}
        className="overflow-visible bg-transparent relative w-full"
      >
        <div className="rounded-md text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 flex flex-row w-full">

          <div className="relative w-full">
          <CommandInputWithBadges
            ref={inputRef}
            placeholder="Search for an agent..."
            onValueChange={(e) => {
              setInputValue(e);
              queryAgents(e);
            }}
            value={inputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            className="w-full flex-grow"
          >
            <>
              {selectedIds.map((id) => {
                const agent = agentCache[id];
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="cursor-pointer text-[10px] px-1.5 py-0 h-5 flex-shrink-0 gap-1"
                    onClick={() => removeAgent(id)}
                  >
                    {agent ? (
                      <>
                        <Circle className={cn("h-2 w-2 fill-current", agent.connected ? "text-green-500" : "text-muted-foreground/40")} />
                        {agent.app.identifier}
                      </>
                    ) : (
                      <>
                        <Bot className="h-2.5 w-2.5" />
                        {id}
                      </>
                    )}
                    <X className="h-2.5 w-2.5 opacity-60" />
                  </Badge>
                );
              })}
            </>


            </CommandInputWithBadges>
          </div>

        </div>
        <div className="relative mt-1">
          {open && (
            <CommandList className="w-full">
              <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                <CommandEmpty>No matching agent found</CommandEmpty>
                {error && (
                  <CommandGroup heading="Error">
                    <CommandItem>{error}</CommandItem>
                  </CommandGroup>
                )}
                {agents.length > 0 && (
                  <CommandGroup heading="Agents">
                    {agents.map((agent) => {
                      const isSelected = selectedIds.includes(agent.id);
                      return (
                        <CommandItem
                          value={agent.id}
                          key={agent.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onSelect={() => toggleAgent(agent.id)}
                          className="flex items-center gap-3 py-2"
                        >
                          <div className="relative flex-shrink-0">
                            <UserAvatar sub={agent.user.sub} className="h-7 w-7" />
                            <Circle
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full fill-current ring-2 ring-popover",
                                agent.connected ? "text-green-500" : "text-muted-foreground/40",
                              )}
                            />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-medium truncate">
                              {agent.app.identifier}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              v{agent.release.version}
                            </span>
                          </div>
                          <CheckIcon
                            className={cn(
                              "ml-auto h-4 w-4 flex-shrink-0",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </div>
            </CommandList>
          )}
        </div>
      </Command>
      )}
      {fieldError && (
        <p className="text-destructive text-xs">{fieldError}</p>
      )}
      {dependency.description && (
        <FormDescription>{dependency.description}</FormDescription>
      )}
    </div>
  );
};

export type DependencyContainerProps = {
  dependencies: ListDependencyFragment[];
  bound: string;
};

export const DependenciesContainer = ({
  dependencies,
}: DependencyContainerProps) => {
  const form = useFormContext();

  // Seed auto-resolve entries for auto-resolvable deps that have no form entry yet
  useEffect(() => {
    const existing = (form.getValues("dependencies") as ResolvedDependencyInput[] | undefined) || [];
    const toSeed = dependencies.filter(
      (dep) => dep.autoResolvable && !existing.some((e) => e.key === dep.key),
    );
    if (toSeed.length > 0) {
      const seeded: ResolvedDependencyInput[] = [
        ...existing,
        ...toSeed.map((dep) => ({
          key: dep.key,
          autoResolve: true,
          mappedAgents: [],
        })),
      ];
      form.setValue("dependencies", seeded, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid overflow-visible gap-4">
      {dependencies.map((dep) => (
        <DependencySearchField dependency={dep} key={dep.key} />
      ))}
    </div>
  );
};
