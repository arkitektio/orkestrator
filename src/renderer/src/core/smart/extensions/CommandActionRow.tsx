import { useRowPin, useScopedRowValue } from "./rowPin";
import { useSmartMenuSkinOverride, type ActionRowProps } from "./skin";
import { LIST_SKIN } from "./skins/list";

export { CommandActionContent } from "./skins/list";
export { CommandActionIcon, RowIconButton } from "./skins/parts";

/**
 * Every row of the smart menu and the ⌘K palette. The module says what the
 * row is (title, icon, what Enter runs, its progress, a failed run); the skin
 * of the menu it is in draws it (`skin.tsx`) — the list by default, tiles in
 * the scene's annotation card. So a row says `running` / `failure` / `flash`,
 * never a class for them, and is never a raw `CommandItem`: either would
 * draw the list everywhere.
 */
export const CommandActionRow = (props: ActionRowProps) => {
  const pin = useRowPin();
  const value = useScopedRowValue(props.value);
  const Row = (useSmartMenuSkinOverride() ?? LIST_SKIN).Row;
  return <Row {...props} value={value} pin={pin} />;
};
