import { portDescription, portLabel } from "@arkitektio/bsx/ports/engine/portPresentation";
import { SearchField, SearchOptions } from "@arkitektio/bsx/ports/forms/SearchField";
import { FormLabel } from "@/core/ui/form";
import {
  PortKind,
  ResolvedDependencyInput,
  StateChoiceAssignWidgetFragment,
} from "@/rekuest/api/graphql";
import { useAgentLiveState } from "@/rekuest/hooks/useLiveState";
import {
  resolveDependencyDefinition,
  useDependencyDefinitions,
} from "@arkitektio/bsx/ports/engine/DependencyContext";
import { InputWidgetProps } from "@arkitektio/bsx/ports/engine/types";
import { pathToName, recursiveExtract, recursiveSet } from "@arkitektio/bsx/ports/engine/utils";
import { useCallback, useMemo, useRef } from "react";
import { useWatch } from "react-hook-form";
import {
  choiceKey,
  choicesSignature,
  filterChoices,
  pathSegments,
  readPath,
  stateChoiceOptions,
  type StateChoiceOption,
} from "./stateChoices";

/** The ports whose value is an object: without a `VALUE` accessor they get the whole state entry. */
const OBJECT_KINDS: readonly PortKind[] = [
  PortKind.Model,
  PortKind.Dict,
  PortKind.List,
  PortKind.MemoryStructure,
];

const NO_OPTIONS: StateChoiceOption[] = [];

type Choices =
  | { status: "waiting" }
  | { status: "invalid"; reason: string }
  | { status: "ready"; options: StateChoiceOption[] };

/**
 * A choice among the entries of a list in an agent's live state (the saved
 * positions of a stage, the loaded objectives).
 *
 * The form holds the entry's own value (a number stays a number, an object
 * port gets the object in the form's shape); the field tells choices apart by
 * `choiceKey`. The option list follows the state, but is asked again only
 * when the choices themselves change: a state patches far more often than
 * its list does, and a reload mid-typing would drop what was typed.
 */
export const StateChoiceWidget = (
  props: InputWidgetProps<StateChoiceAssignWidgetFragment>,
) => {
  const { port } = props;
  const statePath = props.widget?.statePath;
  const segments = useMemo(() => pathSegments(statePath), [statePath]);
  // The first segment selects the agent's state interface, the rest walks into it.
  const stateKey = segments[0];
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

  const { value: liveValue } = useAgentLiveState({
    agentID: agentID,
    stateInterface: stateKey,
    skip: !agentID || !stateKey,
  });

  const wholeEntry = OBJECT_KINDS.includes(port.kind);
  const choices = useMemo<Choices>(() => {
    // Not reported yet: nothing to choose from, and nothing wrong either.
    if (liveValue == null) return { status: "waiting" };
    const list = readPath(liveValue, segments.slice(1));
    if (!Array.isArray(list)) {
      const found =
        list === undefined || list === null
          ? "nothing (a key along the path is missing, check it for typos)"
          : `a ${typeof list}`;
      return {
        status: "invalid",
        reason:
          `The state path "${statePath}" should lead to a list of choices, but leads to ${found}. ` +
          `Its first part ("${stateKey}") names the agent's state, the rest walks into it.`,
      };
    }
    return { status: "ready", options: stateChoiceOptions(list, stateAccessors, wholeEntry) };
  }, [liveValue, segments, stateAccessors, stateKey, statePath, wholeEntry]);

  const options = choices.status === "ready" ? choices.options : NO_OPTIONS;
  // Read through a ref: the field keeps `search` and the two converters across renders.
  const choicesRef = useRef(choices);
  choicesRef.current = choices;

  const search = useCallback(async (searching: SearchOptions) => {
    const current = choicesRef.current;
    if (searching.values) {
      const known = current.status === "ready" ? current.options : NO_OPTIONS;
      return searching.values.map((wanted) => {
        const key = String(wanted);
        const option = known.find((candidate) => candidate.key === key);
        if (option) return { value: option.key, label: option.label };
        // Still shown, as what it is: the state may not have arrived, or the entry is gone.
        const shown = key.startsWith("{") || key.startsWith("[") ? "The chosen value" : key;
        return {
          value: key,
          label: current.status === "waiting" ? shown : `${shown} (not in the state any more)`,
        };
      });
    }
    if (current.status === "invalid") throw new Error(current.reason);
    if (current.status === "waiting") return [];
    return filterChoices(current.options, searching.search).map((option) => ({
      value: option.key,
      label: option.label,
    }));
  }, []);

  // The form holds values in its own shape (a list is rows of `__value`): in and out through the port.
  const toFieldValue = useCallback(
    (key: string) => {
      const current = choicesRef.current;
      const option =
        current.status === "ready" ? current.options.find((candidate) => candidate.key === key) : undefined;
      return option ? recursiveSet(option.value, port) : key;
    },
    [port],
  );
  const fieldKey = useCallback(
    (fieldValue: unknown) =>
      fieldValue === undefined || fieldValue === null
        ? undefined
        : choiceKey(typeof fieldValue === "object" ? recursiveExtract(fieldValue, port) : fieldValue),
    [port],
  );

  const name = pathToName(props.path);
  const label = portLabel(port) || undefined;

  if (!stateKey) {
    return <div>Invalid state choices widget configuration</div>;
  }

  if (!agentID) {
    return (
      <div className="flex flex-col gap-1">
        {label && <FormLabel className="text-sm">{label}</FormLabel>}
        <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {dependency
            ? `First select an agent for "${dependencyLabel}"`
            : "No agent available for this state"}
        </div>
      </div>
    );
  }

  return (
    <SearchField
      // A row of a list changes its name when a row before it goes: the field starts over under the new one.
      key={name}
      name={name}
      label={label}
      search={search}
      toFieldValue={toFieldValue}
      fieldKey={fieldKey}
      description={portDescription(port, props.widget)}
      noOptionFoundPlaceholder={
        choices.status === "waiting" ? "Waiting for the agent's state…" : "No options found"
      }
      commandPlaceholder="Search..."
      searchKey={`${choices.status}:${choicesSignature(options)}`}
    />
  );
};
