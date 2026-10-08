import { PortKind } from "@/rekuest/api/graphql";
import { identifierToName, portToLabel } from "./utils";
import { LabellablePort } from "./types";

/**
 * How a port presents itself in a form: its label, the line under it, the
 * text in its empty control and how much of a row it takes. One place, so a
 * port the author left bare (no label, no description) still reads like a
 * sentence instead of a key, and every widget agrees.
 */

type PresentablePort = LabellablePort & {
  description?: string | null;
  referenceUnit?: string | null;
};

/** The widget, as far as presentation cares (any assign widget fragment fits). */
type PresentableWidget = {
  __typename?: string;
  placeholder?: string | null;
  asParagraph?: boolean | null;
  min?: number | null;
  max?: number | null;
  fallback?: PresentableWidget | null;
} | null | undefined;

export type PortSize = "narrow" | "medium" | "wide" | "full";

/** Choices up to here are shown side by side; up to `SELECT_MAX` in a dropdown. */
export const SEGMENTED_MAX = 4;
export const SELECT_MAX = 8;

export type ChoicePresentation = "segmented" | "select" | "search";

export const choicePresentation = (count: number): ChoicePresentation =>
  count === 0 ? "search" : count <= SEGMENTED_MAX ? "segmented" : count <= SELECT_MAX ? "select" : "search";

/** `exposure_time`, `exposureTime` → "Exposure time". */
export const humanizeKey = (key: string): string => {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : key;
};

export const portLabel = (port: PresentablePort): string =>
  port.label || humanizeKey(port.key ?? "");

const withArticle = (noun: string) => `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;

const structureName = (port: PresentablePort, fallback: string) =>
  identifierToName(port.identifier, fallback).toLowerCase();

/** A child port named like a thing: "numbers", "images", "texts". */
const pluralOf = (port: PresentablePort): string => {
  switch (port.kind) {
    case PortKind.Int:
    case PortKind.Float:
      return "numbers";
    case PortKind.String:
      return "texts";
    case PortKind.Bool:
      return "switches";
    case PortKind.Date:
      return "dates";
    case PortKind.Quantity:
      return "values";
    case PortKind.Enum:
      return "options";
    case PortKind.Structure:
    case PortKind.MemoryStructure:
    case PortKind.Model: {
      const name = structureName(port, "item");
      return name.endsWith("s") ? name : `${name}s`;
    }
    default:
      return "items";
  }
};

const firstChild = (port: PresentablePort): PresentablePort | undefined =>
  (port.children?.find(Boolean) as PresentablePort | undefined) ?? undefined;

const effective = (widget: PresentableWidget): PresentableWidget =>
  widget?.__typename === "CustomAssignWidget" ? (widget.fallback ?? null) : widget;

const generated = (port: PresentablePort, widget: PresentableWidget): string => {
  switch (port.kind) {
    case PortKind.Int:
    case PortKind.Float: {
      const base = port.kind === PortKind.Int ? "A whole number" : "A number";
      if (widget?.__typename === "SliderAssignWidget" && widget.min != null && widget.max != null) {
        return `${base} between ${widget.min} and ${widget.max}`;
      }
      return base;
    }
    case PortKind.Quantity:
      return port.referenceUnit ? `A value in ${port.referenceUnit}` : "A value with a unit";
    case PortKind.String:
      return widget?.asParagraph ? "A longer text" : "A text";
    case PortKind.Bool:
      return "On or off";
    case PortKind.Date:
      return "A date and time";
    case PortKind.Enum: {
      const count = port.choices?.length ?? 0;
      return count > 0 ? `Pick one of ${count} options` : "Pick an option";
    }
    case PortKind.Structure:
    case PortKind.MemoryStructure:
      return `Select ${withArticle(structureName(port, "object"))}`;
    case PortKind.List: {
      const child = firstChild(port);
      return child ? `One or more ${pluralOf(child)}` : "A list";
    }
    case PortKind.Dict: {
      const child = firstChild(port);
      return child ? `Named ${pluralOf(child)}` : "Named values";
    }
    case PortKind.Model:
      return port.identifier ? `The fields of ${withArticle(structureName(port, "model"))}` : "A group of fields";
    case PortKind.Union:
      return "Pick one of the kinds, then fill it in";
    default:
      return portToLabel(port);
  }
};

/**
 * The line under the field: the author's description, else one made from
 * what the port says about itself ("A whole number", "Select an image").
 */
export const portDescription = (port: PresentablePort, widget?: PresentableWidget): string => {
  if (port.description) return port.description;
  const text = generated(port, effective(widget));
  return port.nullable ? `${text} (optional)` : text;
};

/** The text inside the empty control: the widget's own, else a short prompt. */
export const portPlaceholder = (port: PresentablePort, widget?: PresentableWidget): string => {
  const own = effective(widget)?.placeholder;
  if (own) return own;
  switch (port.kind) {
    case PortKind.Int:
    case PortKind.Float:
    case PortKind.Quantity:
      return "0";
    case PortKind.Enum:
      return "Choose…";
    case PortKind.Structure:
    case PortKind.MemoryStructure:
      return `Search ${pluralOf(port)}…`;
    case PortKind.List: {
      const child = firstChild(port);
      return child ? `Add ${pluralOf(child)}…` : "Add…";
    }
    default:
      return "";
  }
};

/** Kinds a list shows as chips typed into one input, when the item is bare. */
export const isTagListPort = (port: PresentablePort): boolean => {
  if (port.kind !== PortKind.List) return false;
  const child = firstChild(port) as (PresentablePort & { widget?: unknown }) | undefined;
  if (!child || child.widget || (child.choices?.length ?? 0) > 0) return false;
  return child.kind === PortKind.String || child.kind === PortKind.Int || child.kind === PortKind.Float;
};

/**
 * How much of a row the port's control wants. Small scalars pack side by
 * side; anything that renders a sub-form takes the row.
 */
export const portSize = (port: PresentablePort, widget?: PresentableWidget): PortSize => {
  const w = effective(widget);
  switch (port.kind) {
    case PortKind.Bool:
    case PortKind.Int:
    case PortKind.Float:
      return w?.__typename === "SliderAssignWidget" ? "medium" : "narrow";
    case PortKind.Enum:
      return choicePresentation(port.choices?.length ?? 0) === "select" ? "narrow" : "medium";
    case PortKind.String:
      return w?.asParagraph ? "wide" : "medium";
    case PortKind.Date:
    case PortKind.Quantity:
    case PortKind.Structure:
      return "medium";
    case PortKind.List: {
      if (isTagListPort(port)) return "wide";
      const child = firstChild(port) as (PresentablePort & { widget?: { __typename?: string } | null }) | undefined;
      const picker = child?.widget?.__typename;
      return picker === "SearchAssignWidget" || picker === "ChoiceAssignWidget" ? "wide" : "full";
    }
    default:
      return "full";
  }
};
