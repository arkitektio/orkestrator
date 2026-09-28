/**
 * What the installed modules contribute, as types: every module's dialogs,
 * by id. Core types `openDialog(id, props)` from this; it starts empty and
 * the app fills it by declaration merging (`app/modules/dialogTypes.ts`),
 * because only the app knows which modules it composes.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DialogRegistry {}
