import * as React from "react";
import { useDebugMode } from "@/core/debug/DebugContext";
import { BlokDebugScopePanel } from "@/core/blok/debug/BlokDebugScopePanel";
import { BlokDebugScopeProvider, createBlokDebugScope, type BlokDebugScope } from "@/core/blok/debug/registry";

/**
 * A page's blok debugger: a scope its bloks register in, and whether to show
 * the Debug tab (only in debug mode, Settings → Developer). Wrap what draws
 * the bloks in `<BlokDebugTab.Scope>` and put `<BlokDebugTab>` in a sidebar tab.
 */
export const useBlokDebugTab = () => {
  const enabled = useDebugMode();
  const [scope] = React.useState(createBlokDebugScope);
  return { enabled, scope };
};

const Scope = ({ scope, children }: { scope: BlokDebugScope; children: React.ReactNode }) => (
  <BlokDebugScopeProvider value={scope}>{children}</BlokDebugScopeProvider>
);

/** The Debug tab: the bloks on this page, and what passes through the one picked. */
export const BlokDebugTab = Object.assign(
  ({ scope }: { scope: BlokDebugScope }) => <BlokDebugScopePanel scope={scope} />,
  { Scope },
);

export default BlokDebugTab;
