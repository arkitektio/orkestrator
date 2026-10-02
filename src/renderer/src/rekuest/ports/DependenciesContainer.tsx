import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { portHash } from "@/core/ports/engine/utils";
import { ListAgentFragment, ListDependencyFragment, ResolvedDependencyInput, useAgentForDependencyLazyQuery } from "@/rekuest/api/graphql";
import { DependencyNode, levelBelow, withLevelBelow, withPin } from "@/rekuest/lib/dependencyTree";
import { ArgPort, PortGroup } from "@/core/ports/engine/types";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/core/ui/command";
import { Command as CommandPrimitive } from "cmdk"
import { cn, notEmpty } from "@/core/util/utils";

import { CheckIcon } from "@radix-ui/react-icons";
import { Bot, ChevronRight, Circle, SearchIcon, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/ui/collapsible";
import { useDebouncedCallback } from "@/core/util/hooks/useDebouncedCallback";
import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { FormDescription, FormLabel } from "@/core/ui/form";
import { InputGroup, InputGroupAddon } from "@/core/ui/input-group";

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

/** Whose dependency the id names: an implementation's, or a blok's. */
export type DependencyOwner = "implementation" | "blok";

export type DependencyFieldProps = {
  dependency: ListDependencyFragment;
  owner?: DependencyOwner;
  /** This dependency's pin at its level, if it has one. */
  pin: ResolvedDependencyInput | undefined;
  onPin: (pin: ResolvedDependencyInput | undefined) => void;
  /** What the dry run resolved for it: the agents bound, and what they need below. */
  node?: DependencyNode;
  /** The form's own complaint about this pin. */
  error?: string;
};

export const DependencySearchField = ({
  dependency,
  owner = "implementation",
  pin,
  onPin,
  node,
  error: fieldError,
}: DependencyFieldProps) => {
  const [agents, setAgents] = useState<ListAgentFragment[]>([]);
  const [agentCache, setAgentCache] = useState<Record<string, ListAgentFragment>>({});
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const [search] = useAgentForDependencyLazyQuery();
  const dependencyFilter =
    owner === "blok" ? { blokDependency: dependency.id } : { dependency: dependency.id };

  // The pin is the selection: it lives in the form, at this level.
  const selectedIds = useMemo(() => pin?.mappedAgents.map((mapped) => mapped.agent) ?? [], [pin]);
  const autoResolve = pin?.autoResolve ?? false;

  const remember = (found: ListAgentFragment[]) => {
    const newCache: Record<string, ListAgentFragment> = {};
    found.forEach((a) => { newCache[a.id] = a; });
    setAgentCache((prev) => ({ ...prev, ...newCache }));
  };

  const updateSelection = (agentIds: string[]) => {
    onPin({
      key: dependency.key,
      autoResolve: autoResolve,
      // An agent that stays keeps what is pinned below it.
      mappedAgents: agentIds.map(
        (id) => pin?.mappedAgents.find((mapped) => mapped.agent === id) ?? { agent: id, key: dependency.key },
      ),
    });
  };

  const toggleAutoResolve = () => {
    onPin({
      key: dependency.key,
      autoResolve: !autoResolve,
      mappedAgents: pin?.mappedAgents ?? [],
    });
  };

  const queryAgents = useDebouncedCallback((searchStr: string) => {
    if (!dependency.id) return;
    search({ variables: { search: searchStr, ...dependencyFilter } })
      .then((res) => {
        const found = res.data?.agents?.filter(notEmpty) || [];
        setAgents(found);
        remember(found);
        setOpen(true);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setAgents([]);
      });
  });

  // Load initial options
  useEffect(() => {
    if (!dependency.id) return;
    search({ variables: { search: "", ...dependencyFilter } })
      .then((res) => {
        const found = res.data?.agents?.filter(notEmpty) || [];
        setAgents(found);
        remember(found);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setAgents([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependency.id]);

  // The agents the dry run bound are known without asking.
  const boundAgents = useMemo(() => {
    const bound: Record<string, ListAgentFragment> = {};
    for (const binding of node?.mappedAgents ?? []) {
      if (binding.agent) bound[binding.agentId] = binding.agent;
    }
    return bound;
  }, [node]);

  // Resolve data for selected agents nothing has told us about yet
  const unknown = selectedIds.filter((id) => !agentCache[id] && !boundAgents[id]).join(",");
  useEffect(() => {
    if (!unknown) return;
    search({ variables: { values: unknown.split(",") } })
      .then((res) => remember(res.data?.agents?.filter(notEmpty) || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unknown]);

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

  // What resolved without a pin: shown, so it is clear what an assign reaches.
  const resolvedByItself = selectedIds.length === 0 ? (node?.mappedAgents ?? []) : [];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dependency.key != null && (
            <FormLabel className="text-sm">{dependency.key}</FormLabel>
          )}
          {dependency.optional && (
            <span className="text-[10px] text-muted-foreground">optional</span>
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
                const agent = agentCache[id] ?? boundAgents[id];
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
                            <StructureDisplay identifier="@lok/user" id={agent.user.sub} variant="avatar" className="h-7 w-7" />
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
      {resolvedByItself.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
          resolves to
          {resolvedByItself.map((binding) => (
            <Badge key={binding.agentId} variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 font-normal">
              <Circle className={cn("h-2 w-2 fill-current", binding.agent?.connected ? "text-green-500" : "text-muted-foreground/40")} />
              {binding.agent?.app.identifier ?? binding.agentId}
            </Badge>
          ))}
        </div>
      )}
      {(fieldError || node?.unmet) && (
        <p className="text-destructive text-xs">{fieldError || node?.unmet}</p>
      )}
      {dependency.description && (
        <FormDescription>{dependency.description}</FormDescription>
      )}
      {node?.mappedAgents.map((binding) => {
        const below = levelBelow(binding);
        if (below.length === 0) return null;
        const pinned = pin?.mappedAgents.find((mapped) => mapped.agent === binding.agentId);
        return (
          <Collapsible key={binding.agentId} defaultOpen className="ml-1 border-l pl-3">
            <CollapsibleTrigger className="group flex items-center gap-1 py-1 text-xs text-muted-foreground">
              <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
              {binding.agent?.app.identifier ?? binding.agentId} depends on
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1 pb-2">
              <DependencyLevel
                dependencies={below.map((inner) => inner.dependency ?? undeclared(inner.key))}
                nodes={below}
                value={pinned?.dependencies ?? []}
                onChange={(next) => onPin(withLevelBelow(pin, node, binding.agentId, next))}
              />
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};

/** A dependency a task still carries although its implementation no longer declares it. */
const undeclared = (key: string): ListDependencyFragment => ({
  id: "",
  key,
  description: null,
  appFilter: null,
  versionFilter: null,
  autoResolvable: false,
  optional: false,
  minViableInstances: null,
  maxViableInstances: null,
  singular: false,
});

type DependencyLevelProps = {
  dependencies: ListDependencyFragment[];
  /** The dry run's nodes of this level, by key. */
  nodes?: DependencyNode[] | null;
  /** The pins of this level. */
  value: ResolvedDependencyInput[];
  onChange: (pins: ResolvedDependencyInput[]) => void;
  owner?: DependencyOwner;
  errors?: Record<string, { message?: string }>;
};

/** One level of the dependency tree: its dependencies, each with the levels below what it binds. */
const DependencyLevel = ({ dependencies, nodes, value, onChange, owner, errors }: DependencyLevelProps) => (
  <div className="grid overflow-visible gap-4">
    {dependencies.map((dep) => (
      <DependencySearchField
        dependency={dep}
        owner={owner}
        pin={value.find((pin) => pin.key === dep.key)}
        onPin={(pin) => onChange(withPin(value, dep.key, pin))}
        node={nodes?.find((node) => node.key === dep.key)}
        error={errors?.[dep.key]?.message}
        key={dep.key}
      />
    ))}
  </div>
);

export type DependencyContainerProps = {
  dependencies: ListDependencyFragment[];
  bound: string;
  owner?: DependencyOwner;
  /** The assign's dry run (`useDependencyTree`): without it only the root level shows. */
  tree?: DependencyNode[] | null;
};

export const DependenciesContainer = ({
  dependencies,
  owner,
  tree,
}: DependencyContainerProps) => {
  const form = useFormContext();
  const watched = useWatch({ control: form.control, name: "dependencies" }) as ResolvedDependencyInput[] | undefined;
  const value = useMemo(() => watched ?? [], [watched]);

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
    <DependencyLevel
      dependencies={dependencies}
      nodes={tree}
      value={value}
      onChange={(next) => form.setValue("dependencies", next, { shouldValidate: true })}
      owner={owner}
      // Per-dependency form errors (path: dependencies.{dep.key})
      errors={form.formState.errors?.dependencies as Record<string, { message?: string }> | undefined}
    />
  );
};
