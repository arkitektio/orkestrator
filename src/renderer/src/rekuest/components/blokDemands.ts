import {ASSETS_SEGMENT} from '@/core/blok/renderer/assets';
import {isRecord, splitPathSegments} from '@/core/blok/renderer/runtime';
import {LATEST_SEGMENT} from './blokLatestTask';

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

const collectDemandPaths = (roots: ReadonlyArray<unknown>, registerPath: (path: string) => void) => {
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
 * Which names of which bound dependency the blok reads `latest` of: a path
 * `self/blur/latest/progress` reads the latest task of the action `blur`.
 * The spelling alone cannot tell that from a state `blur` with a field
 * `latest`; whoever syncs the value asks the agent which of the two it has.
 */
export const collectDemandedLatestTasks = (
  roots: ReadonlyArray<unknown>,
  dependencyKeys: ReadonlySet<string>,
): Map<string, Set<string>> => {
  const demanded = new Map<string, Set<string>>();

  collectDemandPaths(roots, path => {
    const [dependencyKey, name, segment] = splitPathSegments(path);

    if (!dependencyKey || !name || segment !== LATEST_SEGMENT || !dependencyKeys.has(dependencyKey)) {
      return;
    }

    const names = demanded.get(dependencyKey) ?? new Set<string>();
    names.add(name);
    demanded.set(dependencyKey, names);
  });

  return demanded;
};

/**
 * Which state interfaces of which bound dependency the blok reads. A path
 * `self/stage/position` demands interface `stage` of dependency `self` — the
 * agent a blok was registered by is bound under the `self` key like any other
 * dependency. Walks the runtime-shaped (snake_case) tree from `useBlokDocument`.
 *
 * `self.assets.<name>` is not one of them: it names a file the agent brings,
 * which the asset host resolves. There is no such state to watch or to look
 * up in the past.
 */
export const collectDemandedStateInterfaces = (
  roots: ReadonlyArray<unknown>,
  dependencyKeys: ReadonlySet<string>,
): Map<string, Set<string>> => {
  const demandedInterfaces = new Map<string, Set<string>>();

  const registerPath = (path: string) => {
    const [dependencyKey, stateInterface] = splitPathSegments(path);

    if (!dependencyKey || !stateInterface || !dependencyKeys.has(dependencyKey)) {
      return;
    }

    if (stateInterface === ASSETS_SEGMENT) {
      return;
    }

    const interfaces = demandedInterfaces.get(dependencyKey) ?? new Set<string>();
    interfaces.add(stateInterface);
    demandedInterfaces.set(dependencyKey, interfaces);
  };

  collectDemandPaths(roots, registerPath);

  return demandedInterfaces;
};
