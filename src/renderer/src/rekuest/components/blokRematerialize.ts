export type BlokMapping = { key: string; agent: string };

/**
 * The agents a materialization was bound to, as the bindings of a new one of
 * the same (or a forked) blok: one per dependency the blok still declares.
 * An app-provided blok calls its agent `self`; its fork binds that agent under
 * the app's name, the one key the fork declares that the old bindings lack.
 */
export const rematerializeMappings = (
  agentMappings: ReadonlyArray<{ key: string; agent: { id: string } }>,
  dependencies: ReadonlyArray<{ key: string }>,
): BlokMapping[] => {
  const declared = new Set(dependencies.map((dependency) => dependency.key));
  const seen = new Set<string>();
  const kept = agentMappings.flatMap((mapping) => {
    if (!declared.has(mapping.key) || seen.has(mapping.key)) return [];
    seen.add(mapping.key);
    return [{ key: mapping.key, agent: mapping.agent.id }];
  });
  const own = agentMappings.find((mapping) => mapping.key === "self");
  const unbound = dependencies.filter((dependency) => !seen.has(dependency.key));
  if (own && !declared.has("self") && unbound.length === 1) kept.push({ key: unbound[0].key, agent: own.agent.id });
  return kept;
};
