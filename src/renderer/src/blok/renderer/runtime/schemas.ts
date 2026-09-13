import {z} from 'zod';
import type {
  BlokActionArgument,
  BlokAgentCall,
  BlokComponentNode,
  BlokComponentProp,
  BlokDynamicValue,
  BlokUtilCall,
} from './types';

const dynamicValueInputSchema: z.ZodType<BlokDynamicValue> = z.object({
  literal: z.string().nullish(),
  path: z.string().nullish(),
});

const actionArgumentInputSchema: z.ZodType<BlokActionArgument> = z.lazy(() =>
  z.object({
    key: z.string().nullish(),
    value_literal: z.unknown().optional(),
    value_path: z.string().nullish(),
    agent_call: agentCallInputSchema.nullish(),
    util_call: utilCallInputSchema.nullish(),
    value_list: z.array(actionArgumentInputSchema).nullish(),
    value_dict: z.array(actionArgumentInputSchema).nullish(),
  }),
);

const agentCallInputSchema: z.ZodType<BlokAgentCall> = z.object({
  dependency: z.string(),
  operation: z.string(),
  arguments: z.array(actionArgumentInputSchema).nullish(),
});

const utilCallInputSchema: z.ZodType<BlokUtilCall> = z.object({
  operation: z.string(),
  arguments: z.array(actionArgumentInputSchema).nullish(),
});

const componentPropInputSchema: z.ZodType<BlokComponentProp> = z.object({
  key: z.string(),
  static_value: z.unknown().optional(),
  dynamic_value: dynamicValueInputSchema.nullish(),
  agent_call: agentCallInputSchema.nullish(),
  util_call: utilCallInputSchema.nullish(),
});

const componentNodeInputSchema: z.ZodType<BlokComponentNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    component: z.string(),
    props: z.array(componentPropInputSchema).nullish(),
    children: z.array(componentNodeInputSchema).nullish(),
  }),
);

/*
 * Action props are identified by an explicit brand, never by "does this schema
 * happen to accept a function?". The old structural probe silently reclassified
 * any permissive prop schema (`z.unknown()`, `z.any()`) as an action, which
 * meant an author could turn a value prop into a click handler by accident.
 */
const actionSchemaRegistry = new WeakSet<object>();

export const markActionSchema = <TSchema extends z.ZodTypeAny>(schema: TSchema): TSchema => {
  actionSchemaRegistry.add(schema);
  return schema;
};

/** Strips `.optional()` / `.nullable()` / `.default()` wrappers to reach the brand. */
export const unwrapSchema = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  let current: z.ZodTypeAny = schema;

  for (let depth = 0; depth < 8; depth += 1) {
    const inner = (current as unknown as {def?: {innerType?: z.ZodTypeAny}}).def?.innerType;
    if (!inner) {
      return current;
    }

    current = inner;
  }

  return current;
};

export const isActionSchema = (schema: z.ZodTypeAny | undefined): boolean => {
  if (!schema) {
    return false;
  }

  return actionSchemaRegistry.has(unwrapSchema(schema));
};

const actionValueSchema = markActionSchema(
  z.custom<() => void>(value => typeof value === 'function', {
    message: 'Expected action handler',
  }),
);

const dynamicTextSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .transform(value => String(value));

/**
 * Client-side contract for `checks` — a declarative guard list that disables an
 * interactive blok until every entry passes. Each check is either a bare
 * boolean, a data-model path (truthy test), or an explicit
 * `{path | util_call, operator, value}` predicate.
 */
const checkOperatorSchema = z.enum([
  'truthy',
  'falsy',
  'equals',
  'notEquals',
  'gt',
  'gte',
  'lt',
  'lte',
  'nonEmpty',
]);

const checkDescriptorSchema = z.union([
  z.boolean(),
  z.string(),
  z.object({
    path: z.string().optional(),
    util_call: utilCallInputSchema.nullish(),
    operator: checkOperatorSchema.optional(),
    value: z.unknown().optional(),
    message: z.string().optional(),
  }),
]);

export type BlokCheckDescriptor = z.infer<typeof checkDescriptorSchema>;
export type BlokCheckOperator = z.infer<typeof checkOperatorSchema>;

export const BlokSchemas = {
  DynamicValue: dynamicValueInputSchema,
  ActionArgument: actionArgumentInputSchema,
  AgentCall: agentCallInputSchema,
  UtilCall: utilCallInputSchema,
  ComponentProp: componentPropInputSchema,
  ComponentProps: z.array(componentPropInputSchema).nullish(),
  ComponentNode: componentNodeInputSchema,
  CheckDescriptor: checkDescriptorSchema,
};

export const BlokPropSchemas = {
  ComponentId: z.string(),
  ChildList: z
    .array(
      z.union([
        z.string(),
        z.object({
          id: z.string(),
          basePath: z.string().optional(),
        }),
      ]),
    )
    .optional(),
  DynamicString: dynamicTextSchema,
  DynamicBoolean: z.boolean(),
  Action: actionValueSchema,
  Checks: z.array(checkDescriptorSchema).optional(),
  /** @deprecated use `Checks` — kept so existing catalogs keep compiling. */
  Checkable: z.object({
    checks: z.array(checkDescriptorSchema).optional(),
  }),
};
