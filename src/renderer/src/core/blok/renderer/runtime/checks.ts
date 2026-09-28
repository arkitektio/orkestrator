import {BlokSchemas, type BlokCheckDescriptor, type BlokCheckOperator} from './schemas';
import {invokeUtilCall} from './resolution';
import type {BlokResolutionContext} from './types';

export type BlokChecksState = {
  passed: boolean;
  failures: string[];
};

const isEmptyValue = (value: unknown): boolean => {
  if (value == null) {
    return true;
  }

  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
};

const compareNumeric = (
  operator: 'gt' | 'gte' | 'lt' | 'lte',
  left: unknown,
  right: unknown,
): boolean => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) {
    return false;
  }

  switch (operator) {
    case 'gt':
      return leftNumber > rightNumber;
    case 'gte':
      return leftNumber >= rightNumber;
    case 'lt':
      return leftNumber < rightNumber;
    case 'lte':
      return leftNumber <= rightNumber;
  }
};

const applyOperator = (
  operator: BlokCheckOperator,
  actual: unknown,
  expected: unknown,
): boolean => {
  switch (operator) {
    case 'truthy':
      return Boolean(actual);
    case 'falsy':
      return !actual;
    case 'equals':
      return Object.is(actual, expected) || actual === expected;
    case 'notEquals':
      return !(Object.is(actual, expected) || actual === expected);
    case 'nonEmpty':
      return !isEmptyValue(actual);
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return compareNumeric(operator, actual, expected);
  }
};

const describeCheck = (descriptor: BlokCheckDescriptor): string => {
  if (typeof descriptor === 'boolean') {
    return 'Check failed.';
  }

  if (typeof descriptor === 'string') {
    return `"${descriptor}" is not set.`;
  }

  if (descriptor.message) {
    return descriptor.message;
  }

  const subject = descriptor.path ?? descriptor.util_call?.operation ?? 'value';
  return `Check on "${subject}" failed (${descriptor.operator ?? 'truthy'}).`;
};

const evaluateCheck = (
  descriptor: BlokCheckDescriptor,
  context: BlokResolutionContext,
): boolean => {
  if (typeof descriptor === 'boolean') {
    return descriptor;
  }

  if (typeof descriptor === 'string') {
    return Boolean(context.readPath(descriptor));
  }

  let actual: unknown;

  if (descriptor.util_call) {
    // Checks run during render, so only pure functions may back them.
    const result = invokeUtilCall(descriptor.util_call, context, true);
    if (!result.ok) {
      return false;
    }
    actual = result.value;
  } else if (descriptor.path) {
    actual = context.readPath(descriptor.path);
  } else {
    return false;
  }

  return applyOperator(descriptor.operator ?? 'truthy', actual, descriptor.value);
};

/**
 * Evaluates the `checks` guard list. Every entry must pass for the owning blok
 * to be enabled; failures carry a message for the disabled-state tooltip.
 */
export const evaluateChecks = (
  rawChecks: unknown,
  context: BlokResolutionContext,
): BlokChecksState => {
  if (!Array.isArray(rawChecks) || rawChecks.length === 0) {
    return {passed: true, failures: []};
  }

  const failures: string[] = [];

  rawChecks.forEach(rawCheck => {
    const parsed = BlokSchemas.CheckDescriptor.safeParse(rawCheck);
    if (!parsed.success) {
      failures.push('Malformed check descriptor.');
      return;
    }

    if (!evaluateCheck(parsed.data, context)) {
      failures.push(describeCheck(parsed.data));
    }
  });

  return {passed: failures.length === 0, failures};
};

/** Paths a check list reads, so the owning component subscribes to them. */
export const getChecksDependencyPaths = (rawChecks: unknown): string[] => {
  if (!Array.isArray(rawChecks)) {
    return [];
  }

  const paths = new Set<string>();

  rawChecks.forEach(rawCheck => {
    const parsed = BlokSchemas.CheckDescriptor.safeParse(rawCheck);
    if (!parsed.success || typeof parsed.data === 'boolean') {
      return;
    }

    if (typeof parsed.data === 'string') {
      paths.add(parsed.data);
      return;
    }

    if (parsed.data.path) {
      paths.add(parsed.data.path);
    }

    parsed.data.util_call?.arguments?.forEach(argument => {
      if (argument.value_path) {
        paths.add(argument.value_path);
      }
    });
  });

  return [...paths];
};
