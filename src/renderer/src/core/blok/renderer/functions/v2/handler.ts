import type {BlokInvokeFunctionHandler} from '../../runtime/types';
import {invokeV2Function} from './index';

/**
 * The renderer's function handler for v2 bloks: the vocabulary's pure
 * functions, with argument statuses handed in by resolution. The effects
 * (`ui.copy`, `task.answer`, `query.refetch`, `query.fetch_more`) are not
 * functions here: a callback runs them (`runActionCall`).
 */
export const invokeBlokFunction: BlokInvokeFunctionHandler = (name, args, options) =>
  invokeV2Function(name, args, options?.argumentStatus ? {argumentStatus: options.argumentStatus} : {});
