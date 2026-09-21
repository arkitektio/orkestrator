import { TaskEventFragment } from "@/rekuest/api/graphql";
import { Structure } from "@/types";
import React from "react";
import type { SmartSectionContext, SmartSectionSelection } from "./section";

export type OnDone = (args: {
  event?: TaskEventFragment;
  kind: "local" | "action" | "shortcut" | "relation" | "measurement";
}) => void;

export type OnError = (args: {
  event?: TaskEventFragment;
  kind: "local" | "action" | "shortcut" | "relation" | "measurement";
}) => void;

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
};

export type ObjectButtonProps = SmartContextProps & {
  children?: React.ReactNode;
  className?: string;
  variant?: "outline" | "default";
  size?: "sm" | "lg" | "icon";
};

/** What a section receives: the menu's props plus the search text. */
export type PassDownProps = SmartSectionContext;
