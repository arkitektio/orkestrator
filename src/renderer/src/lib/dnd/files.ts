import { DragSession } from "./engine";

/** A drag of files from the OS. Which files is not known until the drop. */
export const acceptsFiles = (session: DragSession) =>
  session.origin === "external" && session.types.includes("Files");
