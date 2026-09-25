import type { DragEndInfo } from "@/core/lib/dnd/engine";
import { endedOutsideApp } from "@/core/lib/dnd/outside";
import { requestExport } from "@/core/lib/export/exportRequests";

import type { SmartDragItem } from "./dragPayload";

/**
 * A card dragged out of the app and let go on the desktop: bring it to disk
 * (`requestExport` — a file downloads, anything else asks how to export it).
 *
 * "Nothing took it" means the desktop only because a smart drag carries
 * nothing the world outside can take (`smartExternalData`). A cancel with
 * Escape outside the window lands here too; the dialog it opens only asks a
 * question, so that costs a click, not a file.
 */
export const onSmartDragEnd = async (info: DragEndInfo, data: unknown) => {
  if (!(await endedOutsideApp(info))) return;
  requestExport((data as SmartDragItem).structures);
};
