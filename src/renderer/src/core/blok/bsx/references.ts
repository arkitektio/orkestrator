import type {
  BlokActionArgument,
  BlokAgentCall,
  BlokComponentNode,
  BlokComponentProp,
  BlokUtilCall,
} from "../renderer/runtime/types";
import { EVENT_SCOPE_KEY, FOREACH_COMPONENT, FOREACH_ITEMS_PROP, FOREACH_LET_PROP } from "./parse";

/**
 * Whether every reference in a tree resolves against what the blok declares:
 * the reference half of arkitekt-spec's `validate_blok`
 * (`arkitekt_spec/declare/blok/validate.py`), which the server runs on save.
 * Told what is declared as the editor holds it, so a finding shows while
 * typing instead of as a refused save.
 */

/** A dependency as the editor declares it: its key, app, and what it names of the agent. */
export type BsxDependency = {
  key: string;
  app?: string | null;
  /** Its actions' keys; none declared means any operation is accepted. */
  actions?: readonly string[] | null;
  /** Its states' keys: `@dep.<state>…` must name one. */
  states?: readonly string[] | null;
};

export type BsxReferenceContext = {
  dependencies: readonly BsxDependency[];
  /** The keys of the args the blok is opened for (`@args.<key>`). */
  args: readonly string[];
  /** The blok's own UI state: the demo state's top-level keys no dependency owns. */
  localRoots?: readonly string[];
};

export type BsxFinding = { message: string; nodeId: string; propKey?: string };

export const ARGS_ROOT = "args";
const ASSETS_SEGMENT = "assets";
const LATEST_SEGMENT = "latest";
const RESERVED_ROOTS = new Set(["self", "state", "actions", "utils", "event"]);

/** The demo state's top-level keys that are the blok's own state, not a dependency's. */
export const localRootsOf = (dependencies: readonly BsxDependency[], demoState: unknown): string[] => {
  if (!demoState || typeof demoState !== "object" || Array.isArray(demoState)) return [];
  const owned = new Set([...dependencies.map((dependency) => dependency.key), ...RESERVED_ROOTS]);
  return Object.keys(demoState).filter((key) => !owned.has(key));
};

const actionKeyFor = (call: BlokAgentCall) => call.operation.split(".").pop() ?? call.operation;

export const checkBsxReferences = (root: BlokComponentNode, context: BsxReferenceContext): BsxFinding[] => {
  const findings: BsxFinding[] = [];
  const byKey = new Map(context.dependencies.map((dependency) => [dependency.key, dependency]));
  const aliases = new Map(
    context.dependencies.filter((dependency) => dependency.app).map((dependency) => [dependency.app!, dependency.key]),
  );
  const canonical = (key: string) => aliases.get(key) ?? key;
  const dependencyKeys = () => [...byKey.keys()].sort().join(", ") || "none";
  const declaredActions = (dependency: BsxDependency) =>
    dependency.actions && dependency.actions.length > 0 ? dependency.actions : null;
  const args = new Set(context.args);
  const locals = new Set((context.localRoots ?? []).filter((key) => !byKey.has(key)));

  // Bound calls are visible in the whole tree: the button that starts a run
  // and the panel that shows its result are rarely nested in each other.
  const bound = new Set<string>();
  const collectBound = (node: BlokComponentNode) => {
    for (const prop of node.props ?? []) if (prop.agent_call && prop.declares_value) bound.add(prop.declares_value);
    node.children?.forEach(collectBound);
  };
  collectBound(root);

  const visitPath = (path: string, scope: Set<string>, nodeId: string, propKey: string) => {
    const parts = path.split(".");
    const [first, second] = parts;
    const report = (message: string) => findings.push({ message, nodeId, propKey });

    if (scope.has(first) || bound.has(first) || first === EVENT_SCOPE_KEY || locals.has(first)) return;
    if (first === "utils") return;
    if (first === ARGS_ROOT) {
      if (second && !args.has(second)) {
        report(`'${second}' is not an arg of this blok (${[...args].join(", ") || "it has none"}).`);
      }
      return;
    }
    if (first === "actions") {
      if (!second || !byKey.has(canonical(second))) report(`Unknown dependency '${second ?? ""}' in '${path}'. Dependencies: ${dependencyKeys()}.`);
      return;
    }
    if (first === "state") {
      if (!second) {
        report(`'${path}' names no state.`);
        return;
      }
      const dependency = byKey.get(canonical(second));
      if (dependency) {
        if (parts[2] && !(dependency.states ?? []).includes(parts[2])) {
          report(`'${parts[2]}' is not a state of '${second}'. Declare it under the dependency's states.`);
        }
        return;
      }
      const owners = context.dependencies.filter((candidate) => (candidate.states ?? []).includes(second));
      if (owners.length > 1) {
        report(`Ambiguous state reference '${path}': '${second}' is a state of ${owners.map((owner) => owner.key).join(", ")}. Write state.<dependency>.${second}.`);
      } else if (owners.length === 0) {
        report(`No dependency declares the state '${second}'.`);
      }
      return;
    }

    const dependency = byKey.get(canonical(first));
    if (!dependency) {
      report(`Unknown reference '${path}'. Dependencies: ${dependencyKeys()}${scope.size ? `; locals: ${[...scope].join(", ")}` : ""}.`);
      return;
    }
    if (!second || second === ASSETS_SEGMENT) return;
    const actions = declaredActions(dependency);
    if (parts[2] === LATEST_SEGMENT && actions?.includes(second)) return;
    if (!(dependency.states ?? []).includes(second)) {
      report(`'${second}' is not a state of '${first}'. Declare it under the dependency's states.`);
    }
  };

  const visitAgentCall = (call: BlokAgentCall, scope: Set<string>, nodeId: string, propKey: string) => {
    const dependency = byKey.get(canonical(call.dependency));
    if (!dependency) {
      findings.push({ message: `Unknown dependency '${call.dependency}' in an agent call. Dependencies: ${dependencyKeys()}.`, nodeId, propKey });
    } else {
      const actions = declaredActions(dependency);
      const action = actionKeyFor(call);
      if (actions && !actions.includes(action)) {
        findings.push({ message: `'${action}' is not an action of '${call.dependency}' (${actions.join(", ")}).`, nodeId, propKey });
      }
    }
    call.arguments?.forEach((argument) => visitArgument(argument, scope, nodeId, propKey));
  };

  const visitUtilCall = (call: BlokUtilCall, scope: Set<string>, nodeId: string, propKey: string) => {
    call.arguments?.forEach((argument) => visitArgument(argument, scope, nodeId, propKey));
  };

  const visitArgument = (argument: BlokActionArgument, scope: Set<string>, nodeId: string, propKey: string) => {
    if (argument.value_path != null) visitPath(argument.value_path, scope, nodeId, propKey);
    if (argument.agent_call) visitAgentCall(argument.agent_call, scope, nodeId, propKey);
    if (argument.util_call) visitUtilCall(argument.util_call, scope, nodeId, propKey);
    argument.value_list?.forEach((item) => visitArgument(item, scope, nodeId, propKey));
    argument.value_dict?.forEach((item) => visitArgument(item, scope, nodeId, propKey));
  };

  const visitProp = (node: BlokComponentNode, prop: BlokComponentProp, scope: Set<string>) => {
    if (prop.dynamic_value?.path != null) visitPath(prop.dynamic_value.path, scope, node.id, prop.key);
    if (prop.agent_call) visitAgentCall(prop.agent_call, scope, node.id, prop.key);
    if (prop.util_call) visitUtilCall(prop.util_call, scope, node.id, prop.key);
  };

  const walk = (node: BlokComponentNode, scope: Set<string>, repeated: boolean) => {
    const isForeach = node.component.toLowerCase() === FOREACH_COMPONENT;
    // The items are read in the enclosing scope: a foreach cannot iterate over the variable it declares.
    for (const prop of node.props ?? []) visitProp(node, prop, scope);

    let inner = scope;
    if (isForeach) {
      const letName = node.props?.find((prop) => prop.key === FOREACH_LET_PROP)?.declares_value;
      const items = node.props?.find((prop) => prop.key === FOREACH_ITEMS_PROP)?.dynamic_value?.path;
      if (!letName || !items) {
        findings.push({ message: `A ${FOREACH_COMPONENT} needs ${FOREACH_ITEMS_PROP}="@<path>" and ${FOREACH_LET_PROP}="#<name>".`, nodeId: node.id });
      }
      if (letName) inner = new Set([...scope, letName]);
    }
    if (repeated) {
      for (const prop of node.props ?? []) {
        if (prop.agent_call && prop.declares_value) {
          findings.push({
            message: `'${prop.declares_value}' is bound inside a ${FOREACH_COMPONENT}: a repeated call would share the name. Bind it outside the loop.`,
            nodeId: node.id,
            propKey: prop.key,
          });
        }
      }
    }
    node.children?.forEach((child) => walk(child, inner, repeated || isForeach));
  };

  walk(root, new Set(), false);
  return findings;
};
