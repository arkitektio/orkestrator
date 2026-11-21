import type { BlokCheckScope } from "@arkitektio/bsx/bsx/index";

/**
 * The blok editors open in this window, by blok id: how something outside the
 * page (the app's own agent, asked by an assistant in the chat beside the
 * editor) reads the draft being typed and writes a new one into it. What it
 * writes lands in the editor like typing would: previewed at once, saved only
 * when the person saves.
 */
export type OpenBlokEditor = {
  /** The draft as it stands, unsaved changes included. */
  read: () => { name: string; source: string; scope: BlokCheckScope; agents: string };
  /** Replace the source; the editor keeps it as one undoable step of its own state. */
  write: (source: string) => void;
};

const open = new Map<string, OpenBlokEditor>();

export const registerOpenBlokEditor = (blokId: string, editor: OpenBlokEditor): (() => void) => {
  open.set(blokId, editor);
  return () => {
    if (open.get(blokId) === editor) open.delete(blokId);
  };
};

export const openBlokEditor = (blokId: string): OpenBlokEditor | undefined => open.get(blokId);
