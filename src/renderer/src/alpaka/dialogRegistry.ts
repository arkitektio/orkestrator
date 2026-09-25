import { ChatDialog } from "./dialogs/ChatDialog";
import { UseModelForDialog } from "./dialogs/UseModelForDialog";

/**
 * alpaka's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const ALPAKA_DIALOGS = {
  chat: ChatDialog,
  usemodelfor: UseModelForDialog,
};
