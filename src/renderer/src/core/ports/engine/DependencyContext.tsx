import { ListDependencyFragment } from "@/rekuest/api/graphql";
import { createContext, useContext } from "react";

/**
 * Exposes the implementation's dependency *definitions* to nested widgets.
 *
 * A STATE_CHOICE widget references a dependency via `widget.dependency`, which
 * may be either the dependency's `key` or its `appFilter`. The selected agents
 * live in form state (`dependencies`), but the definitions (needed to map a
 * dependency reference to its key) are not — this context provides them.
 */
const DependencyDefinitionsContext = createContext<ListDependencyFragment[]>([]);

export const DependencyDefinitionsProvider = ({
  dependencies,
  children,
}: {
  dependencies: ListDependencyFragment[];
  children: React.ReactNode;
}) => (
  <DependencyDefinitionsContext.Provider value={dependencies}>
    {children}
  </DependencyDefinitionsContext.Provider>
);

export const useDependencyDefinitions = () =>
  useContext(DependencyDefinitionsContext);

/**
 * Resolve a widget's `dependency` reference (key or appFilter) to the matching
 * dependency definition. Key takes precedence over appFilter.
 */
export const resolveDependencyDefinition = (
  dependencies: ListDependencyFragment[],
  reference: string,
): ListDependencyFragment | undefined =>
  dependencies.find((d) => d.key === reference) ??
  dependencies.find((d) => d.appFilter === reference);
