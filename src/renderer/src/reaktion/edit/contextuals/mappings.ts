import { PortKind, StreamPort } from "@/reaktion/types";

export const allandone = <A, B>(
  left: readonly A[],
  right: readonly B[],
  predicate: (l: A, r: B) => boolean,
) =>
  left.every((l) => right.some((r) => predicate(l, r))) &&
  left.length == right.length &&
  right.length > 0;

export const isMatch = (item1: StreamPort, item2: StreamPort): boolean =>
  item1.kind === item2.kind &&
  (item1.kind !== PortKind.Structure || item1.identifier === item2.identifier);

const findMappings = (
  list1: readonly StreamPort[],
  list2: readonly StreamPort[],
  index1: number,
  currentMapping: Map<number, number>,
  allMappings: Map<number, number>[],
): void => {
  if (index1 === list1.length) {
    allMappings.push(new Map(currentMapping));
    return;
  }
  const used = new Set(currentMapping.values());
  for (let index2 = 0; index2 < list2.length; index2++) {
    if (used.has(index2) || !isMatch(list1[index1], list2[index2])) continue;
    currentMapping.set(index1, index2);
    findMappings(list1, list2, index1 + 1, currentMapping, allMappings);
    currentMapping.delete(index1);
  }
};

/** Every bijection of `list1` onto `list2` that maps matching ports. */
export const generateAllMappings = (
  list1: readonly StreamPort[],
  list2: readonly StreamPort[],
): { [key: number]: number }[] => {
  if (list1.length !== list2.length) return [];
  const allMappings: Map<number, number>[] = [];
  findMappings(list1, list2, 0, new Map(), allMappings);
  return allMappings.map((mapping) => Object.fromEntries(mapping.entries()));
};
