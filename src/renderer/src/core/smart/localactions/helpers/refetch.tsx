import {
  NormalizedCache,
  ApolloClient,
  DocumentNode,
  OperationVariables,
  TypedDocumentNode,
} from "@apollo/client";

/**
 * Scans active Apollo queries for multiple entities up to a specified depth.
 * Optimized with O(1) Set lookups and fast for-loops.
 * * @param {ApolloClient} client - Your instantiated Apollo Client
 * @param {Array<{typename: string, id: string|number}>} entities - Array of entities to find
 * @param {number} maxDepth - Maximum depth to recursively search (default: 5)
 * @returns {Array<{queryName: string, query: DocumentNode, variables: object, refetch: Function}>}
 */
export function getRefetchableQueriesForEntities(client: ApolloClient<NormalizedCache>, entities: { typename: string, id: string | number }[], maxDepth: number = 3) {
  const matchingQueries: {
    queryName: string;
    query: DocumentNode | TypedDocumentNode<any, OperationVariables>;
    variables: OperationVariables | undefined;
    refetch: () => Promise<unknown>;
  }[] = [];

  // 1. OPTIMIZATION: Pre-process the targets into a Set for O(1) lookups.
  // This prevents iterating over the targets array on every single node.
  const targetSet = new Set(
    entities.map(e => `${e.typename}:${e.id}`)
  );

  if (targetSet.size === 0) return [];

  // 2. Helper function to recursively search with depth tracking
  const containsAnyEntity = (obj, currentDepth) => {
    // Circuit Breaker: Stop if null, not an object, or if we hit the depth limit
    if (!obj || typeof obj !== 'object' || currentDepth > maxDepth) {
      return false;
    }

    // Match found! Check if this object's typename:id exists in our Set
    if (obj.__typename && obj.id) {
      if (targetSet.has(`${obj.__typename}:${obj.id}`)) {
        return true;
      }
    }

    // Recursive case: Arrays
    if (Array.isArray(obj)) {
      // OPTIMIZATION: Standard for-loops are faster than .some() or .forEach()
      for (let i = 0; i < obj.length; i++) {
        if (containsAnyEntity(obj[i], currentDepth + 1)) return true;
      }
      return false;
    }

    // Recursive case: Objects
    const values = Object.values(obj);
    for (let i = 0; i < values.length; i++) {
      if (containsAnyEntity(values[i], currentDepth + 1)) return true;
    }

    return false;
  };

  // 3. Iterate over all active queries currently driving your UI
  client.getObservableQueries().forEach((observableQuery) => {
    const currentResult = observableQuery.getCurrentResult();

    // Pass '0' as the starting depth for the recursion
    if (currentResult && currentResult.data && containsAnyEntity(currentResult.data, 0)) {
      matchingQueries.push({
        queryName: observableQuery.queryName || 'UnnamedQuery',
        query: observableQuery.options.query,
        variables: observableQuery.variables,
        refetch: () => observableQuery.refetch()
      });
    }
  });

  return matchingQueries;
}
