import { CreateWorkspaceForm } from "./components/forms/CreateWorkspaceForm";

/**
 * fluss's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const FLUSS_DIALOGS = {
      createworkspace: CreateWorkspaceForm,
};
