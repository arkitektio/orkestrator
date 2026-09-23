import { SMART_MODEL_DROP_TYPE } from "@/constants";
import { DragSession, DropPayload } from "@/lib/dnd/engine";
import { Structure } from "@/types";

/**
 * What a smart drag carries, and how to read one back out of a drop. Kept
 * free of the action registry so that a link or a tab can ask "is this a
 * structure in the air?" without importing every module's actions.
 */

/** What a smart drag carries inside this window. */
export type SmartDragItem = {
  structures: Structure[];
};

export type ResolvedSmartDrop = {
  partners: Structure[];
  omitDefaultBehaviour: boolean;
};

/**
 * How a smart drag looks from another window of ours: the structures as they
 * are, and nothing else. No `text/plain` or `text/uri-list` for the rest of
 * the world: the macOS desktop took the text as a `.textClipping`, and a drag
 * something outside accepted cannot be told from one let go on the desktop,
 * which is where a drag-out means "download / export this" (`dragOut.ts`).
 *
 * The standard types are still READ (`resolveSmartDrop`), for drags that
 * started elsewhere.
 */
export const STRUCTURES_MIME = "application/x-arkitekt-structures";
const URI_LIST_MIME = "text/uri-list";
const TEXT_MIME = "text/plain";

const EXTERNAL_SMART_TYPES = [STRUCTURES_MIME, URI_LIST_MIME, TEXT_MIME];

export const smartExternalData = (structures: Structure[]): Record<string, string> => {
  if (structures.length === 0) {
    return {};
  }
  return { [STRUCTURES_MIME]: JSON.stringify(structures) };
};

/**
 * Whether a drag could be structures. For one from outside only its types are
 * known until it is dropped, so this is "might be"; `resolveSmartDrop` decides.
 */
export const acceptsSmartDrag = (session: DragSession) =>
  session.origin === "internal"
    ? session.kind === SMART_MODEL_DROP_TYPE
    : session.types.some((type) => EXTERNAL_SMART_TYPES.includes(type));

/**
 * By what they name, not by object identity: the same object shown by two
 * cards is two `Structure`s, and one that crossed from another window is a
 * third.
 */
const isSameStructure = (left: Structure, right: Structure) =>
  left.identifier === right.identifier && left.object.id === right.object.id;

const includesStructure = (structures: Structure[], structure: Structure) =>
  structures.some((candidate) => isSameStructure(candidate, structure));

/**
 * What a drag that begins on `self` carries: the whole selection if `self` is
 * part of one, `self` alone otherwise. `self` goes first, so "the one that
 * was grabbed" stays `structures[0]` for whoever takes a single partner.
 */
export const getSmartDragStructures = (selection: Structure[], self: Structure) =>
  selection.length > 1 && includesStructure(selection, self)
    ? [self, ...selection.filter((item) => !isSameStructure(item, self))]
    : [self];

/**
 * The left side of a drop on `self`, `partners` being the right.
 *
 * The selection stands in for `self` when `self` is part of it — dropping on
 * one selected card is dropping on all of them. Not when the drag carried the
 * selection here (it cannot be on both sides), and not when `self` was never
 * selected (a selection elsewhere has nothing to do with this card).
 *
 * `null`: the drop landed on something it carries. Nothing to combine.
 */
export const getSmartDropObjects = (
  selection: Structure[],
  self: Structure,
  partners: Structure[],
): Structure[] | null => {
  if (includesStructure(partners, self)) {
    return null;
  }
  const carried = selection.some((item) => includesStructure(partners, item));
  return selection.length > 1 && includesStructure(selection, self) && !carried
    ? selection
    : [self];
};

const isStructure = (value: unknown): value is Structure => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "identifier" in value && "object" in value;
};

const isSmartDragItem = (value: unknown): value is SmartDragItem => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "structures" in value && Array.isArray(value.structures);
};

const parseJson = (text: string | undefined): unknown => {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const ARKITEKT_URL = /^arkitekt:\/\/([^:]+):(.+)$/;

const structuresFromUriList = (uriList: string | undefined): Structure[] =>
  (uriList ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().match(ARKITEKT_URL))
    .filter((match): match is RegExpMatchArray => match !== null)
    // A link names the object, it does not carry it: the id is all there is.
    .map(([, identifier, id]) => ({ identifier, object: { id } }));

/**
 * The structures an internal drag carries, while it is still in the air.
 * `null` for a drag from outside: the browser withholds its data until the
 * drop, so what it holds cannot be known yet.
 */
export const smartDragStructures = (session: DragSession): Structure[] | null =>
  session.origin === "internal" &&
  session.kind === SMART_MODEL_DROP_TYPE &&
  isSmartDragItem(session.data)
    ? session.data.structures
    : null;

/** The structures in a drop, or `null` if it holds none we can read. */
export const resolveSmartDrop = (payload: DropPayload): ResolvedSmartDrop | null => {
  if (payload.origin === "internal") {
    if (payload.kind !== SMART_MODEL_DROP_TYPE || !isSmartDragItem(payload.data)) {
      return null;
    }
    return {
      partners: payload.data.structures,
      // Ctrl held as the drag began: skip the registered drop handlers and
      // go straight to the partner panel.
      omitDefaultBehaviour: payload.modifiers.ctrlKey,
    };
  }

  const structures = parseJson(payload.data[STRUCTURES_MIME]);
  if (Array.isArray(structures) && structures.length > 0 && structures.every(isStructure)) {
    return { partners: structures, omitDefaultBehaviour: false };
  }

  const linked = structuresFromUriList(payload.data[URI_LIST_MIME]);
  if (linked.length > 0) {
    return { partners: linked, omitDefaultBehaviour: false };
  }

  const single = parseJson(payload.data[TEXT_MIME]);
  if (isStructure(single)) {
    return { partners: [single], omitDefaultBehaviour: false };
  }

  return null;
};
