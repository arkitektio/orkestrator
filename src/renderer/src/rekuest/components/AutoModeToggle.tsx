import { Toggle } from "@/core/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { TaskPolicy } from "@/rekuest/api/graphql";
import { Zap } from "lucide-react";
import { useCallback, useState } from "react";

const STORAGE_PREFIX = "rekuest:auto-mode:";

const read = (key: string): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === "1";
  } catch {
    return false;
  }
};

const write = (key: string, on: boolean) => {
  try {
    if (on) window.localStorage.setItem(STORAGE_PREFIX + key, "1");
    else window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // Not remembered: the toggle still works for this session.
  }
};

/**
 * The key the assign form remembers a target's choice under. A one-click run
 * of the same action (or implementation) reads it with {@link rememberedPolicy},
 * so it runs the way the form last ran it.
 */
export const assignAutoKey = (target: { action?: string | null; implementation?: string | null }) =>
  `assign:${target.action ?? target.implementation ?? ""}`;

/** The policy remembered under `key`, for a run started without a toggle on screen. */
export const rememberedPolicy = (key: string): TaskPolicy =>
  read(key) ? TaskPolicy.Auto : TaskPolicy.Ask;

/**
 * Auto-mode for the tasks a surface starts, remembered per `key` (a room, a
 * dialog). Off, every child an agent asks for under the task waits for the
 * user's approval (ASK, the server's default); on, they run without asking.
 */
export const useAutoMode = (key: string) => {
  const [auto, setAutoState] = useState(() => read(key));
  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) {
    // A different room: its own remembered choice, not the last room's.
    setSeenKey(key);
    setAutoState(read(key));
  }
  const setAuto = useCallback(
    (on: boolean) => {
      write(key, on);
      setAutoState(on);
    },
    [key],
  );
  const policy = auto ? TaskPolicy.Auto : TaskPolicy.Ask;
  return { auto, setAuto, policy } as const;
};

export const AutoModeToggle = ({
  auto,
  onChange,
  className,
}: {
  auto: boolean;
  onChange: (on: boolean) => void;
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Toggle
        size="sm"
        pressed={auto}
        onPressedChange={onChange}
        aria-label="Auto-mode"
        className={className}
      >
        <Zap className={auto ? "text-amber-500" : undefined} />
        Auto
      </Toggle>
    </TooltipTrigger>
    <TooltipContent>
      {auto
        ? "Auto-mode: what the agents ask to run, runs without asking you."
        : "What the agents ask to run waits for your approval. Turn on to let it run without asking."}
    </TooltipContent>
  </Tooltip>
);
