import { SearchField, SearchOptions } from "@/components/fields/SearchField";
import { FormLabel } from "@/components/ui/form";
import {
  PortKind,
  ResolvedDependencyInput,
  StateChoiceAssignWidgetFragment,
} from "@/rekuest/api/graphql";
import { useAgentLiveState } from "@/rekuest/hooks/useLiveState";
import {
  resolveDependencyDefinition,
  useDependencyDefinitions,
} from "@/rekuest/widgets/DependencyContext";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import { pathToName } from "@/rekuest/widgets/utils";
import { useCallback, useMemo } from "react";
import { useWatch } from "react-hook-form";



const accessNestedValue = (obj: Record<string, unknown>, path: string[]): unknown => {
  return path.reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return null;
  }, obj);
}


export const StateChoiceWidget = (
  props: InputWidgetProps<StateChoiceAssignWidgetFragment>,
) => {


  const statePath = props.widget?.statePath;
  const stateKey = statePath?.split(".")[0];
  // Memoized: `statePaths` is a dependency of `search` below, and a fresh
  // array per render made SearchField re-query on every live-state patch.
  const statePaths = useMemo(
    () => statePath?.split(".").slice(1) || [],
    [statePath],
  );
  const stateAccessors = props.widget?.stateAccessors;
  const dependency = props.widget?.dependency;

  // Resolve which agent's live state backs this widget.
  // - No dependency: the implementation's own bound agent (props.bound).
  // - Dependency: the agent the user selected for that dependency in the form.
  const dependencyDefinitions = useDependencyDefinitions();
  const watchedDeps = useWatch({ name: "dependencies" }) as
    | ResolvedDependencyInput[]
    | undefined;

  let agentID: string | undefined = props.bound;
  let dependencyLabel: string | undefined;
  if (dependency) {
    const definition = resolveDependencyDefinition(
      dependencyDefinitions,
      dependency,
    );
    const dependencyKey = definition?.key ?? dependency;
    dependencyLabel = dependencyKey;
    // A STATE_CHOICE reads a single agent's state — use the first mapped agent.
    agentID = watchedDeps?.find((d) => d.key === dependencyKey)
      ?.mappedAgents?.[0]?.agent;
  }

  const { value: liveValue, revision } = useAgentLiveState({
    agentID: agentID,
    stateInterface: stateKey,
    skip: !agentID || !stateKey,
  });

  const search = useCallback(
    async (_searching: SearchOptions) => {
      const accessedValue = accessNestedValue(liveValue || {}, statePaths);
      // 1. Validation: Must be an array — the options are built by mapping over it.
      if (!Array.isArray(accessedValue)) {
        const stateLoaded =
          liveValue != null && Object.keys(liveValue).length > 0;
        const found =
          accessedValue === null
            ? stateLoaded
              ? "nothing (a key along the path is missing — check it for typos)"
              : `nothing (state "${stateKey}" hasn't been reported by the agent yet)`
            : `a ${typeof accessedValue} (${JSON.stringify(accessedValue)})`;
        throw new Error(
          `State choice "${props.port.key}" expected its state path "${props.widget?.statePath}" ` +
            `to resolve to a list of options, but found ${found}. ` +
            `The first segment ("${stateKey}") selects the agent's state interface; ` +
            `the rest ("${statePaths.join(".") || "—"}") walks into it and must land on an array.`,
        );
      }

      // 2. Identify Subpaths (Handling null accessors)
      const valuePath = stateAccessors?.find(a => a?.optionKey === 'VALUE')?.path;
      const labelPath = stateAccessors?.find(a => a?.optionKey === 'LABEL')?.path;
      const descPath = stateAccessors?.find(a => a?.optionKey === 'DESCRIPTION')?.path;


      // 3. Map the array with fallbacks
      return accessedValue.map((rawItem, index) => {
        // Handle Objects
        if (rawItem !== null && typeof rawItem === "object") {
          const item = rawItem;

          if (props.port.kind == PortKind.MemoryStructure) {
            return {
              value: item,
              label: item.name || item.id || `Option ${index + 1}`,
              description: item.description || undefined,
              key: String(item.id || index), // Keys must be strings for many UI frameworks
            };
          }



          // Resolve values via subpaths or fallback to common keys
          const val = valuePath ? accessNestedValue(item, valuePath.split('.')) : (item.id || item.key || index);
          const lab = labelPath ? accessNestedValue(item, labelPath.split('.')) : (item.name || item.label || String(val));
          const desc = descPath ? accessNestedValue(item, descPath.split('.')) : undefined;
          return {
            value: val,
            label: lab,
            description: desc,
            key: String(val), // Keys must be strings for many UI frameworks
          };
        }

        // Handle Primitives (Strings/Numbers)
        return {
          value: rawItem,
          label: String(rawItem),
          key: String(rawItem),
        };
      })
    },
    [liveValue, statePaths, stateAccessors],
  );

  if (!stateKey) {
    return <div>Invalid state choices widget configuration</div>;
  }

  if (!agentID) {
    return (
      <div className="flex flex-col gap-1">
        <FormLabel className="text-sm">
          {props.port.label || props.port.key}
        </FormLabel>
        <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {dependency
            ? `First select an agent for "${dependencyLabel}"`
            : "No agent available for this state"}
        </div>
      </div>
    );
  }

  return (
    <>
      <SearchField
        name={pathToName(props.path)}
        label={props.port.label || props.port.key}
        search={search}
        description={props.port.description || undefined}
        noOptionFoundPlaceholder="No options found"
        commandPlaceholder="Search..."
        searchKey={revision ?? undefined}
      />
    </>
  );
};
