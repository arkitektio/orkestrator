import { ComposeForm } from "./forms/ComposeForm";
import { EditMailAccountForm } from "./forms/EditMailAccountForm";
import { LinkMailboxForm } from "./forms/LinkMailboxForm";
import { MoveMessagesForm } from "./forms/MoveMessagesForm";
import { ShareMailAccountForm } from "./forms/ShareMailAccountForm";

/**
 * kuvert's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const KUVERT_DIALOGS = {
  kuvertlink: LinkMailboxForm,
  kuvertcompose: ComposeForm,
  kuvertmove: MoveMessagesForm,
  kuverteditaccount: EditMailAccountForm,
  kuvertshare: ShareMailAccountForm,
};
