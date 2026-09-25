import { CreateRepoForm } from "./forms/CreateRepoForm";

/**
 * kabinet's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const KABINET_DIALOGS = {
      createrepo: CreateRepoForm,
};
