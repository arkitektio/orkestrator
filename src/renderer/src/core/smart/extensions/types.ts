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

export type SmartContextProps = {
  children?: React.ReactNode;
  className?: string;
  objects: Structure[];
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
