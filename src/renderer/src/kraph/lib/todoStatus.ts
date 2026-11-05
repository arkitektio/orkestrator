import { TodoStatus } from "../api/graphql";
import { Check, Circle, Play } from "lucide-react";
import type React from "react";

/**
 * One look for To do / Doing / Done everywhere a todo shows its state (the page
 * bar's chips, board rows, the Knowledge sidebar, the item page): red still to
 * do, yellow in progress, green done. Semantic colours, so the theme's status
 * tokens, never a fixed palette.
 */

export const STATUS_ICON: Record<TodoStatus, React.ComponentType<{ className?: string }>> = {
  [TodoStatus.Todo]: Circle,
  [TodoStatus.Doing]: Play,
  [TodoStatus.Done]: Check,
};

/** The ring around an avatar or a status mark. */
export const STATUS_RING: Record<TodoStatus, string> = {
  [TodoStatus.Todo]: "ring-destructive",
  [TodoStatus.Doing]: "ring-warning",
  [TodoStatus.Done]: "ring-success",
};

/** Text and icon colour. */
export const STATUS_TONE: Record<TodoStatus, string> = {
  [TodoStatus.Todo]: "text-destructive",
  [TodoStatus.Doing]: "text-warning",
  [TodoStatus.Done]: "text-success",
};

/** A filled pill: soft background, matching border. */
export const STATUS_PILL: Record<TodoStatus, string> = {
  [TodoStatus.Todo]: "border-destructive/50 bg-destructive/10 text-destructive",
  [TodoStatus.Doing]: "border-warning bg-warning-soft text-warning-foreground",
  [TodoStatus.Done]: "border-success bg-success-soft text-success",
};

/** The next state a single click moves to: To do → Doing → Done → To do. */
export const NEXT_STATUS: Record<TodoStatus, TodoStatus> = {
  [TodoStatus.Todo]: TodoStatus.Doing,
  [TodoStatus.Doing]: TodoStatus.Done,
  [TodoStatus.Done]: TodoStatus.Todo,
};
