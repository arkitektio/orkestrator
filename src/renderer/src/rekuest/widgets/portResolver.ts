import { zodResolver } from "@hookform/resolvers/zod";
import type {
  FieldError,
  FieldErrors,
  FieldValues,
  Resolver,
  ResolverOptions,
  ResolverResult,
} from "react-hook-form";
import type { z } from "zod";
import { PortKind } from "../api/graphql";
import { notEmpty } from "@/lib/utils";
import { isRecord, readValuePath } from "./portPaths";
import { runPortValidators } from "./portValidators";
import type { PortablePort } from "./types";
import { isFieldMounted, pathToName } from "./utils";

/**
 * Validation for port forms, in one place.
 *
 * 1. The structural zod schema (`buildZodSchema`) checks types and required
 *    fields.
 * 2. Server-defined validators (catalog calls, see `portCalls.ts`) run on
 *    EVERY pass, for every port at every depth — list items, dict rows, the
 *    selected union variant, model children — regardless of whether the zod
 *    pass succeeded. (zod skips refinements when any sibling is invalid, which
 *    used to silence every validator on a half-filled form.)
 * 3. Issues on fields that are not mounted (hidden by an effect, a collapsed
 *    union variant) are dropped: what the user cannot see cannot block submit.
 *    The mounted-name set is exposed so submit can drop those values too.
 */

export type PortIssue = { path: string; message: string };

const scopedValidators = (
  port: PortablePort,
  value: unknown,
  local: unknown,
  root: unknown,
  fieldPath: string[],
  issues: PortIssue[],
) => {
  if (!port.validators || port.validators.length === 0) return;
  const messages = runPortValidators(
    port.validators,
    value,
    isRecord(local) ? local : {},
    root,
  );
  for (const message of messages) {
    issues.push({ path: pathToName(fieldPath), message });
  }
};

/**
 * Walk the ports and their (wrapped, form-shaped) values, collecting validator
 * failures with their react-hook-form field paths.
 */
export const collectPortIssues = (
  ports: readonly PortablePort[],
  values: unknown,
  path: string[],
  root: unknown = values,
  issues: PortIssue[] = [],
): PortIssue[] => {
  const local = isRecord(values) ? values : {};
  for (const port of ports) {
    const value = local[port.key];
    const fieldPath = [...path, port.key];
    scopedValidators(port, value, local, root, fieldPath, issues);
    collectChildIssues(port, value, local, root, fieldPath, issues);
  }
  return issues;
};

const collectChildIssues = (
  port: PortablePort,
  value: unknown,
  local: unknown,
  root: unknown,
  fieldPath: string[],
  issues: PortIssue[],
) => {
  const children = (port.children?.filter(notEmpty) ?? []) as PortablePort[];
  if (children.length === 0 || value == null) return;

  switch (port.kind) {
    case PortKind.List:
    case PortKind.Dict: {
      const child = children[0];
      if (!Array.isArray(value)) return;
      value.forEach((item, index) => {
        const itemValue = isRecord(item) ? item.__value : undefined;
        const itemPath = [...fieldPath, String(index), "__value"];
        scopedValidators(child, itemValue, local, root, itemPath, issues);
        collectChildIssues(child, itemValue, local, root, itemPath, issues);
      });
      return;
    }
    case PortKind.Union: {
      if (!isRecord(value)) return;
      const variant = children[Number(value.__use)];
      if (!variant) return;
      const innerPath = [...fieldPath, "__value"];
      scopedValidators(variant, value.__value, local, root, innerPath, issues);
      collectChildIssues(variant, value.__value, local, root, innerPath, issues);
      return;
    }
    case PortKind.Model:
      collectPortIssues(children, value, fieldPath, root, issues);
      return;
    default:
      return;
  }
};

const setNestedError = (
  errors: Record<string, unknown>,
  path: string,
  error: FieldError,
) => {
  const segments = path.split(".");
  let current: Record<string, unknown> = errors;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const next = current[segment];
    if (isRecord(next) && typeof (next as FieldError).message !== "string") {
      current = next as Record<string, unknown>;
    } else if (next === undefined) {
      const created: Record<string, unknown> = {};
      current[segment] = created;
      current = created;
    } else {
      // A zod error already sits on an ancestor; it wins.
      return;
    }
  }
  const leaf = segments[segments.length - 1];
  if (current[leaf] === undefined) current[leaf] = error;
};

/** Drop every error whose field is not mounted. */
const pruneErrors = (
  errors: Record<string, unknown>,
  mounted: ReadonlySet<string>,
  prefix = "",
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (key === "ref") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (isRecord(value) && typeof (value as FieldError).message === "string") {
      if (isFieldMounted(path, mounted)) out[key] = value;
    } else if (Array.isArray(value)) {
      const kept = value.map((item, index) =>
        isRecord(item) ? pruneErrors(item, mounted, `${path}.${index}`) : item,
      );
      if (kept.some((item) => isRecord(item) && Object.keys(item).length > 0)) {
        out[key] = kept;
      }
    } else if (isRecord(value)) {
      const kept = pruneErrors(value, mounted, path);
      if (Object.keys(kept).length > 0) out[key] = kept;
    }
  }
  return out;
};

export type PortResolverOptions = {
  /** RHF path of the object that holds the top-level ports (`[]` or `["args"]`). */
  portsPath?: string[];
};

export type PortResolver<TValues extends FieldValues = FieldValues> =
  Resolver<TValues> & {
    /** Field names registered at the last validation pass (hidden ports are absent). */
    mountedNames: () => ReadonlySet<string>;
  };

export const createPortResolver = <TValues extends FieldValues = FieldValues>(
  schema: z.ZodTypeAny,
  ports: readonly PortablePort[],
  options: PortResolverOptions = {},
): PortResolver<TValues> => {
  const zod = zodResolver(schema as never) as unknown as Resolver<TValues>;
  const portsPath = options.portsPath ?? [];
  let lastMounted: ReadonlySet<string> = new Set();

  const resolve = async (
    values: TValues,
    context: unknown,
    resolverOptions: ResolverOptions<TValues>,
  ): Promise<ResolverResult<TValues>> => {
    const mounted = new Set<string>(
      (resolverOptions.names ?? []) as readonly string[],
    );
    lastMounted = mounted;

    const zodResult = await zod(values, context, resolverOptions);
    const errors: Record<string, unknown> = {
      ...((zodResult.errors ?? {}) as Record<string, unknown>),
    };

    const rootValues = readValuePath(values, portsPath).value;
    const issues = collectPortIssues(ports, rootValues, portsPath, rootValues);
    for (const issue of issues) {
      setNestedError(errors, issue.path, {
        type: "validate",
        message: issue.message,
      });
    }

    const pruned = pruneErrors(errors, mounted);
    if (Object.keys(pruned).length > 0) {
      return { values: {}, errors: pruned as FieldErrors<TValues> } as ResolverResult<TValues>;
    }
    return {
      values: ("values" in zodResult ? zodResult.values : values) as TValues,
      errors: {},
    } as ResolverResult<TValues>;
  };

  return Object.assign(resolve, { mountedNames: () => lastMounted });
};
