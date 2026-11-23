import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { Toggle } from "@/core/ui/toggle";
import { cn } from "@/core/util/utils";
import { Unplug } from "lucide-react";
import { overSession } from "../session/calls";
import { useRekuestSession, useRekuestSessionStatus } from "../session/hooks";

/** How long a window may be gone, the choices offered. */
const CHOICES = [
  { seconds: 30, label: "30 s" },
  { seconds: 60, label: "1 min" },
  { seconds: 300, label: "5 min" },
];

/**
 * "Stop if I leave": the dead man switch of the run about to start. Pressed,
 * the run is cancelled once this window has been gone the chosen time (closed,
 * crashed, offline); otherwise a run never depends on the window. Only offered
 * while the window has a session with the server, the only thing that knows
 * whether it is there.
 */
export const DeadmanToggle = ({
  seconds,
  onChange,
  className,
}: {
  /** The switch's seconds, or null when off. */
  seconds: number | null;
  onChange: (seconds: number | null) => void;
  className?: string;
}) => {
  const session = useRekuestSession();
  useRekuestSessionStatus(session);
  if (!overSession(session)) return null;
  const on = seconds != null;
  return (
    <span className={cn("flex items-center gap-1", className)}>
      <Toggle
        size="sm"
        pressed={on}
        onPressedChange={(pressed) => onChange(pressed ? (seconds ?? CHOICES[1].seconds) : null)}
        aria-label="Stop if I leave"
        title="Stop the run if this window goes away (closed, crashed or offline) for a while"
      >
        <Unplug className={on ? "text-warning" : undefined} />
        Stop if I leave
      </Toggle>
      {on && (
        <Select value={String(seconds)} onValueChange={(value) => onChange(Number(value))}>
          <SelectTrigger className="h-8 w-20 text-xs" aria-label="After how long">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHOICES.map((choice) => (
              <SelectItem key={choice.seconds} value={String(choice.seconds)}>
                {choice.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </span>
  );
};
