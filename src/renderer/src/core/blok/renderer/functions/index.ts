import type {BlokFunctionDefinition} from '../runtime';
import {baseFunctions} from './base';
import {coerceFunctions} from './coerce';
import {formatFunctions} from './format';
import {listFunctions} from './lists';
import {logicVariadicFunctions} from './logic';
import {mathFunctions, mathVariadicFunctions} from './math';
import {objectFunctions} from './objects';
import {stringFunctions, stringVariadicFunctions} from './strings';

/**
 * The standard function library: the base catalog's functions, every one of
 * them pure and of a fixed signature (positional order is parameter order,
 * which is how the reference parser and the server read a call). Orkestrator's
 * catalog adds the rest: `variadicBlokFunctions` (`math.sum(a, b, c)`,
 * `str.template(template, name=…)`) and the effectful `effectFunctions`
 * (toast, clipboard, logger), which depend on the UI that runs them.
 *
 * The bare names (`eq`, `if`, `sub`, …) are the server's base operations
 * (`./base.ts`), with the base catalog's own argument keys and semantics. The
 * rest are namespaced by domain (`math.*`, `str.*`, `list.*`, …).
 */
export const variadicBlokFunctions: BlokFunctionDefinition[] = [
  ...logicVariadicFunctions,
  ...mathVariadicFunctions,
  ...stringVariadicFunctions,
];

export const standardBlokFunctions: BlokFunctionDefinition[] = [
  ...baseFunctions,
  ...mathFunctions,
  ...stringFunctions,
  ...listFunctions,
  ...objectFunctions,
  ...formatFunctions,
  ...coerceFunctions,
];

export {baseFunctions} from './base';
export {coerceFunctions} from './coerce';
export {BLOK_ANSWER_FUNCTION, effectFunctions} from './effects';
export {formatFunctions} from './format';
export {listFunctions} from './lists';
export {logicVariadicFunctions} from './logic';
export {mathFunctions, mathVariadicFunctions} from './math';
export {objectFunctions} from './objects';
export {stringFunctions, stringVariadicFunctions} from './strings';
