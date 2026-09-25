import { DebugBadge } from "./DebugBadge";

/**
 * The bottom-right corner of the content card. Empty unless debug mode is on;
 * then the debug badge, which also carries the bug report. Floats over the
 * page rather than taking a row from it, and stays put across tabs — it
 * belongs to the chrome, not to any page.
 */
export const PageCorner = () => (
  <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex items-center gap-1.5 [&>*]:pointer-events-auto">
    <DebugBadge />
  </div>
);

export default PageCorner;
