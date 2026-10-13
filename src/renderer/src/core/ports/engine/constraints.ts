import { gql } from "@apollo/client";
import type { OperationDefinitionNode } from "graphql";

/**
 * One descriptor constraint, as a port states it and as a service's filter
 * takes it: the same three fields on both sides, so a picker hands a port's
 * `requires` on unchanged.
 */
export type DescriptorConstraint = {
  key: string;
  operator: string;
  value?: unknown;
};

type Constrained = {
  requires?: readonly (DescriptorConstraint & { __typename?: string })[] | null;
};

/**
 * What a port requires of the object it is handed, without the cache's
 * `__typename` (an input type refuses the extra field). Empty for a port that
 * constrains nothing.
 */
export const portRequires = (port: Constrained | null | undefined): DescriptorConstraint[] =>
  (port?.requires ?? []).map(({ key, operator, value }) => ({ key, operator, value }));

/** The variables a query document declares; none for one that does not parse. */
export const queryVariables = (query: string): string[] => {
  try {
    const operation = gql(query).definitions.find(
      (d): d is OperationDefinitionNode => d.kind === "OperationDefinition",
    );
    return operation?.variableDefinitions?.map((v) => v.variable.name.value) ?? [];
  } catch {
    return [];
  }
};

/**
 * The variables a query cannot be run without: declared non-null, with no
 * default. A picker waits for these instead of asking with a null.
 */
export const requiredQueryVariables = (query: string): string[] => {
  try {
    const operation = gql(query).definitions.find(
      (d): d is OperationDefinitionNode => d.kind === "OperationDefinition",
    );
    return (operation?.variableDefinitions ?? [])
      .filter((v) => v.type.kind === "NonNullType" && v.defaultValue === undefined)
      .map((v) => v.variable.name.value);
  } catch {
    return [];
  }
};

/**
 * A search query opts into the port's constraints by declaring `$requires`:
 * the widget then passes the `requires` of the port it sits on, so one default
 * widget on a structure offers each port only what that port accepts.
 */
export const queryDeclaresRequires = (query: string): boolean =>
  queryVariables(query).includes("requires");
