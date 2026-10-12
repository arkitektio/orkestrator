/**
 * One writer per channel: a node's translation and its rotation each have at
 * most one binding, and a node a joint table drives takes neither.
 *
 * Checked on the declared children of a model before anything renders, so a
 * conflict is reported once, by node, instead of two bindings fighting frame
 * by frame.
 */

export type DeclaredNode = {
  id: string;
  component: string;
  props?: ReadonlyArray<{key: string; static_value?: unknown}> | null;
  children?: ReadonlyArray<DeclaredNode> | null;
};

const CHANNEL: Record<string, 'translation' | 'rotation'> = {Move: 'translation', Rotate: 'rotation'};

/** Components whose own children belong to another renderer and bind nothing in this model. */
const OPAQUE = new Set(['Popout', 'Model', 'Robot']);

const staticProp = (node: DeclaredNode, key: string): unknown =>
  node.props?.find(prop => prop.key === key)?.static_value;

export const findWriterConflicts = (
  children: ReadonlyArray<DeclaredNode> | null | undefined,
  jointNodes: ReadonlySet<string> = new Set(),
): string[] => {
  const writers = new Map<string, string>();
  const errors: string[] = [];
  const visit = (nodes: ReadonlyArray<DeclaredNode> | null | undefined): void => {
    for (const node of nodes ?? []) {
      const channel = CHANNEL[node.component];
      const target = staticProp(node, 'node');
      if (channel && typeof target === 'string') {
        if (jointNodes.has(target)) {
          errors.push(
            `${node.component} (${node.id}) binds node '${target}', which a joint of this robot drives`,
          );
        }
        const key = `${channel}:${target}`;
        const first = writers.get(key);
        if (first) {
          errors.push(
            `${node.component} (${node.id}) is a second ${channel} binding on node '${target}'; the first is ${first}`,
          );
        } else {
          writers.set(key, node.id);
        }
      }
      if (!OPAQUE.has(node.component)) visit(node.children);
    }
  };
  visit(children);
  return errors;
};

/** `arm:tool0` addresses node `tool0` of the model whose id is `arm`; a bare name is this model's. */
export const parseNodeAddress = (address: string): {model?: string; node: string} => {
  const index = address.indexOf(':');
  return index < 0 ? {node: address} : {model: address.slice(0, index), node: address.slice(index + 1)};
};
