import type { FC } from "react";

/**
 * What one feature contributes to the debug panel.
 *
 * `shell/debugRegistry.ts` maps each feature to one of these; `DebugPanel`
 * renders the list it is handed and imports no feature. A feature cannot import
 * this file (that would be a sideways edge), so its entry matches the shape
 * STRUCTURALLY and the registry's `Record<DebugFeature, DebugSection>` is where
 * the compiler checks it.
 *
 * Every field is optional: a feature fills only the slots it has something for.
 * The panel's layout, top to bottom, and where each slot lands in it:
 *
 *   platform render-budget banner
 *   `Warnings`                          (every section, in registry order)
 *   Render Controls
 *     platform volume budget, then `budgets`
 *     `Controls`
 *     platform quality tier / fidelity, copy report, perf recording
 *   `Body`                              (every section, in registry order)
 */
export type DebugSection = {
  /** Banners above the render controls. */
  Warnings?: FC;
  /** Byte-budget overrides, drawn with the platform's volume budget row. */
  budgets?: readonly DebugBudgetControl[];
  /** Rows inside "Render Controls", between the budgets and the quality tier. */
  Controls?: FC;
  /** The feature's own block below the controls. */
  Body?: FC<DebugBodyProps>;
  /**
   * Called once per panel render, unconditionally — the registry is a module
   * constant, so the hook order is stable. Subscribing here is also how a
   * feature re-renders the whole panel at its streaming cadence.
   */
  useContribution?: () => DebugContribution;
};

export type DebugContribution = {
  /** One-shot checks, rendered as buttons in the self-test row. */
  selfTests?: readonly DebugSelfTest[];
  /**
   * Top-level keys for the copied JSON report. A key the panel also writes is
   * merged one level deep (`budget`), anything else is set.
   */
  report?: () => Record<string, unknown>;
};

export type DebugSelfTest = {
  id: string;
  label: string;
  title: string;
  /** Writes its progress and verdict through `report`, one line at a time. */
  run: (report: (line: string) => void) => void;
};

export type DebugBudgetControl = {
  label: string;
  title: string;
  /** The override in bytes, or null for "auto". */
  get: () => number | null;
  setMB: (mb: number | null) => void;
};

/** Every section's self-tests, in registry order — whoever draws the row. */
export type DebugBodyProps = { selfTests: readonly DebugSelfTest[] };
