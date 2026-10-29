import type { PageActionPolicy } from "@/core/ui/actionPlan";
import { Structure } from "@/core/types";
import React from "react";
import type { SmartSectionContext, SmartSectionSelection } from "./section";

/**
 * A row finished. `kind` names what ran ("local", "action", "shortcut", …),
 * `event` is whatever the contributing module reports (rekuest: the task's
 * last event); the host only passes both through.
 */
export type OnDone = (args: { event?: unknown; kind: string }) => void;

/**
 * Another object the page stands for, offered beside its own: a container's
 * whole lens, on the container's page. A context of its own (one identifier
 * per context, so the demands stay matchable), never mixed into `objects`.
 */
export type RelatedContext = {
  /** Stable within the page; scopes the rows' cmdk values. */
  key: string;
  /** The heading its rows are listed under ("Whole array"). */
  label: string;
  objects: Structure[];
};

export type SmartContextProps = {
  children?: React.ReactNode;
  className?: string;
  objects: Structure[];
  /**
   * What the page also stands for (the ⌘K palette lists each after the
   * page's own rows). Sections opt in with `related` on their descriptor.
   */
  related?: readonly RelatedContext[];
  partners?: Structure[];
  returns?: string[];
  expect?: string[];
  collection?: string;
  onDone?: OnDone;
  onError?: (error: string) => void;
  /**
   * Which sections to show. By module (`"kraph"`) or by id
   * (`"rekuest.shortcuts"`); see `section.ts`. Default: every registered one.
   */
  sections?: SmartSectionSelection;
  /**
   * What the rows RUN with, when the menu's structures stand for objects not
   * made yet (the scene card's crop of a lens to a shape). Filtering reads
   * `objects` / `partners` as they are — a match needs only identifiers and
   * descriptors — and a row awaits this before it builds an action's
   * arguments, so the object is made only when something runs on it.
   * Honoured by rekuest's rows: a menu passing it narrows `sections` to
   * those, or another row would run on the stand-ins.
   */
  materialize?: () => Promise<Pick<SmartContextProps, "objects" | "partners">>;
  /**
   * Focus the search field on open. Default true; off where the menu opens
   * while a key is still held, whose auto-repeat would type into it.
   */
  autoFocus?: boolean;
};

export type ObjectButtonProps = SmartContextProps &
  // The menu button is page chrome as often as not; carrying the policy lets
  // an action row read it off the element like any other action.
  PageActionPolicy & {
    children?: React.ReactNode;
    className?: string;
    variant?: "outline" | "default";
    size?: "sm" | "lg" | "icon";
    /**
     * Control the popover from outside, for a caller that has to know when
     * the menu is up (the scene's hover card holds its shape while it is).
     * Left out, the button opens and closes itself.
     */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  };

/** What a section receives: the menu's props plus the search text. */
export type PassDownProps = SmartSectionContext;
