import type {z} from 'zod';
import {validateUtilCallArgumentKeys, type BlokCatalog} from './functions';
import {BlokSchemas, isActionSchema} from './schemas';
import type {PreparedBlokNode} from './tree';
import type {BlokActionArgument, BlokComponentNode, BlokComponentProp} from './types';
import {extractUiComponents} from './utils';

export type BlokValidationError = {
  /** Payload path, e.g. `uiComponents[0].children[2].props.text`. */
  path: string;
  /** Node the error belongs to, when it is attributable to one. */
  componentId?: string;
  message: string;
};

export type BlokPreflightResult = {
  rootIds: string[];
  nodes: Map<string, PreparedBlokNode>;
  /** Node id -> messages. These render as inline error cards. */
  invalidNodes: Map<string, string[]>;
  errors: BlokValidationError[];
};

export const isRequiredField = (fieldSchema: z.ZodTypeAny): boolean =>
  fieldSchema.safeParse(undefined).success === false;

/**
 * Statically walks every util call reachable from a prop so an unknown or
 * effectful function is reported at validation time rather than blowing up
 * mid-render.
 */
type UtilOperationUse = {
  operation: string;
  valuePosition: boolean;
  /** The keys the call site supplies, mirroring `resolveActionArguments`. */
  argumentKeys: string[];
};

const getArgumentKeys = (argumentsList: BlokActionArgument[] | null | undefined): string[] =>
  (argumentsList ?? []).map((argument, index) => argument.key ?? String(index));

const collectUtilOperations = (prop: BlokComponentProp): UtilOperationUse[] => {
  const operations: UtilOperationUse[] = [];

  const visitArgumentList = (
    argumentsList: BlokActionArgument[] | null | undefined,
    valuePosition: boolean,
  ) => {
    argumentsList?.forEach(argument => {
      if (argument.util_call) {
        operations.push({
          operation: argument.util_call.operation,
          valuePosition,
          argumentKeys: getArgumentKeys(argument.util_call.arguments),
        });
        visitArgumentList(argument.util_call.arguments, valuePosition);
      }

      visitArgumentList(argument.value_list, valuePosition);
      visitArgumentList(argument.value_dict, valuePosition);
      visitArgumentList(argument.agent_call?.arguments, valuePosition);
    });
  };

  if (prop.util_call) {
    operations.push({
      operation: prop.util_call.operation,
      valuePosition: true,
      argumentKeys: getArgumentKeys(prop.util_call.arguments),
    });
    visitArgumentList(prop.util_call.arguments, true);
  }

  visitArgumentList(prop.agent_call?.arguments, false);

  return operations;
};

const validateProps = (
  node: BlokComponentNode,
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>,
  catalog: BlokCatalog,
  basePath: string,
  pushError: (error: BlokValidationError) => void,
): boolean => {
  const shape = schema.shape;
  const allowedKeys = new Set(Object.keys(shape));
  const componentProps = node.props ?? [];
  let isValid = true;

  componentProps.forEach(prop => {
    if (!allowedKeys.has(prop.key)) {
      isValid = false;
      pushError({
        path: `${basePath}.props.${prop.key}`,
        componentId: node.id,
        message: `Unknown prop "${prop.key}" for component "${node.component}".`,
      });
      return;
    }

    const fieldSchema = shape[prop.key];
    const propIsActionPosition = isActionSchema(fieldSchema);

    collectUtilOperations(prop).forEach(({operation, valuePosition, argumentKeys}) => {
      const fn = catalog.functions.get(operation);

      if (!fn) {
        isValid = false;
        pushError({
          path: `${basePath}.props.${prop.key}`,
          componentId: node.id,
          message: `Unknown function "${operation}" in catalog ${catalog.id}.`,
        });
        return;
      }

      // An effectful function is only allowed where it fires on interaction.
      if (valuePosition && !propIsActionPosition && fn.purity !== 'pure') {
        isValid = false;
        pushError({
          path: `${basePath}.props.${prop.key}`,
          componentId: node.id,
          message: `Function "${operation}" has side effects and cannot compute the value of "${prop.key}". Bind it to an action prop instead.`,
        });
      }

      // Argument *values* are only known at render time, but the keys are in
      // the payload, so a misspelled or missing argument is caught here.
      validateUtilCallArgumentKeys(fn, argumentKeys).forEach(message => {
        isValid = false;
        pushError({
          path: `${basePath}.props.${prop.key}`,
          componentId: node.id,
          message,
        });
      });
    });
  });

  Object.entries(shape).forEach(([key, fieldSchema]) => {
    if (key === 'children' && node.children?.length) {
      return;
    }

    if (!isRequiredField(fieldSchema)) {
      return;
    }

    if (componentProps.some(prop => prop.key === key)) {
      return;
    }

    isValid = false;
    pushError({
      path: `${basePath}.props.${key}`,
      componentId: node.id,
      message: `Missing required prop "${key}" for component "${node.component}".`,
    });
  });

  return isValid;
};

/**
 * Validates a payload against a catalog.
 *
 * Failures are scoped to the node that caused them: a bad leaf yields an
 * inline error card and every valid sibling still renders. Only a payload that
 * cannot be parsed at all produces a document-level error.
 */
export const preflightBlokDocument = (
  uiComponents: unknown,
  catalog: BlokCatalog,
): BlokPreflightResult => {
  const errors: BlokValidationError[] = [];
  const nodes = new Map<string, PreparedBlokNode>();
  const invalidNodes = new Map<string, string[]>();
  const rootIds: string[] = [];

  const pushError = (error: BlokValidationError) => {
    errors.push(error);

    if (!error.componentId) {
      return;
    }

    const existing = invalidNodes.get(error.componentId);
    if (existing) {
      existing.push(error.message);
    } else {
      invalidNodes.set(error.componentId, [error.message]);
    }
  };

  const registerNode = (node: BlokComponentNode, basePath: string) => {
    if (nodes.has(node.id) || invalidNodes.has(node.id)) {
      pushError({
        path: `${basePath}.id`,
        componentId: node.id,
        message: `Duplicate component id "${node.id}". Ids address nodes globally, so they must be unique within a payload.`,
      });
      return;
    }

    const definition = catalog.components.get(node.component);

    if (!definition) {
      pushError({
        path: `${basePath}.component`,
        componentId: node.id,
        message: `Unknown component "${node.component}" in catalog ${catalog.id}.`,
      });
    } else if (validateProps(node, definition.schema, catalog, basePath, pushError)) {
      nodes.set(node.id, {id: node.id, component: node.component, node});
    }

    node.children?.forEach((child, index) => {
      registerNode(child, `${basePath}.children[${index}]`);
    });
  };

  extractUiComponents(uiComponents).forEach((rawComponent, componentIndex) => {
    const basePath = `uiComponents[${componentIndex}]`;
    const parsed = BlokSchemas.ComponentNode.safeParse(rawComponent);

    if (!parsed.success) {
      parsed.error.issues.forEach(issue => {
        errors.push({
          path: `${basePath}${issue.path.length ? `.${issue.path.join('.')}` : ''}`,
          message: issue.message,
        });
      });
      return;
    }

    rootIds.push(parsed.data.id);
    registerNode(parsed.data, basePath);
  });

  return {rootIds, nodes, invalidNodes, errors};
};
