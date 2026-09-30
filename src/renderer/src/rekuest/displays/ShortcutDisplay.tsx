import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Keyboard } from "lucide-react";
import { useShortcutQuery } from "../api/graphql";

/** `@rekuest/shortcut` elsewhere: its name, the action it runs and its key. */
export const ShortcutDisplay = (props: DisplayWidgetProps) => {
  const { data } = useShortcutQuery({ variables: { id: props.id } });
  const shortcut = data?.shortcut;
  if (!shortcut) return <DisplayLinePlaceholder {...props} icon={Keyboard} />;

  return (
    <DisplayLine
      {...props}
      icon={Keyboard}
      title={shortcut.name}
      meta={[shortcut.action.name, shortcut.bindNumber != null && `key ${shortcut.bindNumber}`]}
    />
  );
};
