import { InviteToCallDialog } from "./dialogs/InviteToCallDialog";

/**
 * lovekit's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it.
 */
export const LOVEKIT_DIALOGS = {
  invitetocall: InviteToCallDialog,
};
