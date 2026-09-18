/**
 * Moving a layer one step in the stack, as the `order` writes that achieve it.
 *
 * Server orders are often all 0 (a staged experiment adds layers without
 * spacing them), so swapping two values would do nothing. Instead the whole
 * stack is renumbered 0..n−1 in its new sequence and only the layers whose
 * number actually changed are returned — usually two, at most n on the first
 * reorder of an unspaced stack.
 *
 * Pure — runs in node.
 */
export const reorderedOrders = (
  layers: readonly { id: string; order: number }[],
  id: string,
  by: -1 | 1,
): { id: string; order: number }[] => {
  const from = layers.findIndex((l) => l.id === id);
  const to = from + by;
  if (from < 0 || to < 0 || to >= layers.length) return [];
  const sequence = [...layers];
  const [moved] = sequence.splice(from, 1);
  sequence.splice(to, 0, moved);
  return sequence
    .map((layer, order) => ({ id: layer.id, order, was: layer.order }))
    .filter((entry) => entry.order !== entry.was)
    .map(({ id: layerId, order }) => ({ id: layerId, order }));
};
