import type { BindParam } from "./planExec";

/**
 * Escaped-literal substitution of positional `?` placeholders — the FALLBACK
 * execution path for a plan's SQL when the DuckDB build cannot prepare
 * `read_parquet(?)` as a statement parameter (a capability the engine probes
 * at runtime, never assumes). Identifiers in plan SQL are already baked in
 * and quoted server-side from validated declared columns; only VALUES pass
 * through here, and every one is escaped.
 */

export const escapeSqlIdentifier = (value: string): string =>
  `"${value.replaceAll('"', '""')}"`;

export const escapeSqlLiteral = (value: string): string =>
  `'${value.replaceAll("'", "''")}'`;

const formatParam = (param: BindParam): string => {
  if (typeof param === "string") return escapeSqlLiteral(param);
  if (typeof param === "bigint") return param.toString();
  if (!Number.isFinite(param)) {
    throw new Error(`cannot bind non-finite number ${String(param)}`);
  }
  return String(param);
};

/**
 * Replace each `?` outside single-quoted string literals with the escaped
 * next parameter. Throws on a placeholder/parameter count mismatch — a plan
 * whose SQL disagrees with its keyColumns must fail loudly, not query wrong.
 */
export function bindSqlLiteral(sql: string, params: readonly BindParam[]): string {
  let out = "";
  let paramIndex = 0;
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (inString) {
      out += char;
      if (char === "'") {
        // An escaped quote ('') stays inside the literal.
        if (sql[i + 1] === "'") {
          out += "'";
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }
    if (char === "'") {
      inString = true;
      out += char;
      continue;
    }
    if (char === "?") {
      if (paramIndex >= params.length) {
        throw new Error(
          `SQL has more placeholders than parameters (${params.length})`,
        );
      }
      out += formatParam(params[paramIndex]);
      paramIndex++;
      continue;
    }
    out += char;
  }
  if (paramIndex !== params.length) {
    throw new Error(
      `SQL has ${paramIndex} placeholders but ${params.length} parameters`,
    );
  }
  return out;
}
