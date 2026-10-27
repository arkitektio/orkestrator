import {isRecord, splitPathSegments} from '@/core/blok/renderer/runtime';
import {loadVocabulary} from '@/core/blok/spec/vocabulary';

const collectArgumentDemandPaths = (
  argument: unknown,
  registerPath: (path: string) => void,
) => {
  if (!isRecord(argument)) {
    return;
  }

  if (typeof argument.value_path === 'string') {
    registerPath(argument.value_path);
  }

  if (Array.isArray(argument.value_list)) {
    argument.value_list.forEach(item => collectArgumentDemandPaths(item, registerPath));
  }

  if (Array.isArray(argument.value_dict)) {
    argument.value_dict.forEach(item => collectArgumentDemandPaths(item, registerPath));
  }

  if (isRecord(argument.util_call) && Array.isArray(argument.util_call.arguments)) {
    argument.util_call.arguments.forEach(item => collectArgumentDemandPaths(item, registerPath));
  }

  if (isRecord(argument.agent_call) && Array.isArray(argument.agent_call.arguments)) {
    argument.agent_call.arguments.forEach(item => collectArgumentDemandPaths(item, registerPath));
  }
};

const collectDemandPaths = (
  roots: ReadonlyArray<unknown>,
  registerPath: (path: string) => void,
  extra: ReadonlyArray<unknown> = [],
) => {
  extra.forEach(argument => collectArgumentDemandPaths(argument, registerPath));
  const visitNode = (node: unknown) => {
    if (!isRecord(node)) {
      return;
    }

    if (Array.isArray(node.props)) {
      node.props.forEach(prop => {
        if (!isRecord(prop)) {
          return;
        }

        if (isRecord(prop.dynamic_value) && typeof prop.dynamic_value.path === 'string') {
          registerPath(prop.dynamic_value.path);
        }

        if (isRecord(prop.agent_call) && Array.isArray(prop.agent_call.arguments)) {
          prop.agent_call.arguments.forEach(argument => collectArgumentDemandPaths(argument, registerPath));
        }

        if (isRecord(prop.util_call) && Array.isArray(prop.util_call.arguments)) {
          prop.util_call.arguments.forEach(argument => collectArgumentDemandPaths(argument, registerPath));
        }
      });
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(visitNode);
    }
  };

  roots.forEach(visitNode);
};

/**
 * Where a path reads an agent (blok language v2): `deps.<key>.<rest>`, or
 * `self.<rest>` (shorthand for `deps.self`).
 */
const agentRead = (path: string): {dependency: string; rest: string[]} | null => {
  const [root, ...rest] = splitPathSegments(path);
  if (root === 'self') return {dependency: 'self', rest};
  if (root === 'deps' && rest.length > 0) return {dependency: rest[0], rest: rest.slice(1)};
  return null;
};

const demandsBy = (
  roots: ReadonlyArray<unknown>,
  dependencyKeys: ReadonlySet<string>,
  pick: (rest: string[]) => string | null,
  extra: ReadonlyArray<unknown>,
): Map<string, Set<string>> => {
  const demanded = new Map<string, Set<string>>();
  collectDemandPaths(
    roots,
    path => {
      const read = agentRead(path);
      if (!read || !dependencyKeys.has(read.dependency)) return;
      const name = pick(read.rest);
      if (!name) return;
      const names = demanded.get(read.dependency) ?? new Set<string>();
      names.add(name);
      demanded.set(read.dependency, names);
    },
    extra,
  );
  return demanded;
};

/**
 * Which actions of which bound dependency the blok reads the latest task of:
 * `deps.robot.tasks.move_to.progress`, `self.tasks.blur.returns`. `extra`:
 * stored arguments the blok also reads (its queries' variables).
 */
export const collectDemandedLatestTasks = (
  roots: ReadonlyArray<unknown>,
  dependencyKeys: ReadonlySet<string>,
  extra: ReadonlyArray<unknown> = [],
): Map<string, Set<string>> => {
  const {tasks} = loadVocabulary().agentSegments;
  return demandsBy(roots, dependencyKeys, rest => (rest[0] === tasks && rest[1] ? rest[1] : null), extra);
};

/**
 * Which states of which bound dependency the blok reads:
 * `deps.robot.arm.joints` demands the state `arm` of `robot`, `self.stage.x`
 * the state `stage` of the agent the blok belongs to. The agent segments
 * (`tasks`, `assets`, `id`, `name`) are not states: tasks and assets are
 * synced on their own, `id` and `name` come with the binding.
 */
export const collectDemandedStateInterfaces = (
  roots: ReadonlyArray<unknown>,
  dependencyKeys: ReadonlySet<string>,
  extra: ReadonlyArray<unknown> = [],
): Map<string, Set<string>> => {
  const reserved = new Set(loadVocabulary().agentSegments.reservedStateNames);
  return demandsBy(roots, dependencyKeys, rest => (rest[0] && !reserved.has(rest[0]) ? rest[0] : null), extra);
};
