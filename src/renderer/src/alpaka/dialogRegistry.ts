import { ChatDialog } from "./dialogs/ChatDialog";
import { UseModelForDialog } from "./dialogs/UseModelForDialog";
import { AlpakaReplyerAssignForm } from "./forms/AlpakaReplyerAssignForm";

/**
 * alpaka's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const ALPAKA_DIALOGS = {
      alpakareplyerassign: AlpakaReplyerAssignForm,
      chat: ChatDialog,
      usemodelfor: UseModelForDialog,
};
