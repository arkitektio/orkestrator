export type BlokMapping = { key: string; agent: string };

/**
 * The agents a materialization was bound to, as the bindings of a new one of
 * the same (or a forked) blok: one per dependency the blok still declares.
 * An app-provided blok calls its agent `self`, which is mapped like any key.
 */
export const rematerializeMappings = (
  agentMappings: ReadonlyArray<{ key: string; agent: { id: string } }>,
  dependencies: ReadonlyArray<{ key: string }>,
): BlokMapping[] => {
  const declared = new Set(dependencies.map((dependency) => dependency.key));
  const seen = new Set<string>();
  return agentMappings.flatMap((mapping) => {
    if (!declared.has(mapping.key) || seen.has(mapping.key)) return [];
    seen.add(mapping.key);
    return [{ key: mapping.key, agent: mapping.agent.id }];
  });
};
