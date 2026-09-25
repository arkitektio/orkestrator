import { useSettings } from "@/core/settings/store/SettingsContext";
import { TaskNotificationStack } from "./TaskNotificationStack";

/**
 * Rekuest's rail island: live tasks. An experiment (Settings → General),
 * gated here rather than inside the stack: the stack runs the task query on
 * mount, so switching it off has to keep it from mounting at all.
 */
export const TaskIsland = () => {
  const { settings } = useSettings();
  return settings.experimentTaskIsland !== false ? <TaskNotificationStack /> : null;
};
