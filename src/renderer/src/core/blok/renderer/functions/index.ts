import {z} from 'zod';
import {createBlokFunction, type BlokFunctionDefinition} from '../runtime';
import {coerceFunctions} from './coerce';
import {compareFunctions} from './compare';
import {effectFunctions} from './effects';
import {formatFunctions} from './format';
import {listFunctions} from './lists';
import {logicFunctions} from './logic';
import {mathFunctions} from './math';
import {objectFunctions} from './objects';
import {stringFunctions} from './strings';

/**
 * `is_admin` is a business rule, not a utility — it hard-codes one role name
 * into the shared catalog. `compare.eq` expresses it, so this stays only so
 * payloads already referencing it keep rendering.
 */
const isAdminFunction = createBlokFunction(
  {
    name: 'is_admin',
    description: 'Deprecated. Use compare.eq with the role you mean.',
    returnType: 'boolean',
    purity: 'pure',
    deprecated: 'Use compare.eq({a: role, b: "admin"}) instead.',
    schema: z.object({role: z.string()}),
  },
  args => args.role === 'admin',
);

/**
 * The standard function library.
 *
 * Names are namespaced by domain (`math.*`, `str.*`, `list.*`, …). The bare
 * names some functions also answer to (`if`, `gt`, `eq`) are registered as
 * aliases rather than as separate definitions, so stored payloads written
 * against the old flat names keep working while new ones read consistently.
 */
export const standardBlokFunctions: BlokFunctionDefinition[] = [
  ...logicFunctions,
  ...compareFunctions,
  ...mathFunctions,
  ...stringFunctions,
  ...listFunctions,
  ...objectFunctions,
  ...formatFunctions,
  ...coerceFunctions,
  ...effectFunctions,
  isAdminFunction,
];

export {coerceFunctions} from './coerce';
export {compareFunctions} from './compare';
export {effectFunctions} from './effects';
export {formatFunctions} from './format';
export {listFunctions} from './lists';
export {logicFunctions} from './logic';
export {mathFunctions} from './math';
export {objectFunctions} from './objects';
export {stringFunctions} from './strings';
