import { DescribeStructuresDialog } from "./DescribeStructuresDialog";

/**
 * Dialogs the host owns: they apply to any structure, whichever module it is
 * from, and need no service, so they go in unguarded. Merged with every
 * module's dialogs in `core/dialogs/registry`; typed into `openDialog` by the
 * app next to the modules' (`app/modules/dialogTypes.ts`), because a second
 * augmentation of `DialogRegistry` costs it its implicit index signature.
 */
export const HOST_DIALOGS = {
  describestructures: DescribeStructuresDialog,
} as const;

export type HostDialogs = typeof HOST_DIALOGS;
