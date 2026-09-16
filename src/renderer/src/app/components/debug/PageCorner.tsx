import { DebugBadge } from "./DebugBadge";
import { ReportBugButton } from "./ReportBugButton";

/**
 * The bottom-right corner of the content card: the things you reach for when
 * a page is misbehaving. Report a bug, always (on the desktop); and in debug
 * mode, what the page's query actually returned. Floats over the page rather
 * than taking a row from it, and stays put across tabs — it belongs to the
 * chrome, not to any page.
 */
export const PageCorner = () => (
  <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex items-center gap-1.5 [&>*]:pointer-events-auto">
    <DebugBadge />
    <ReportBugButton />
  </div>
);

export default PageCorner;
