import { useCommandContext, type CommandPageContext } from "./CommandPaletteProvider";

/**
 * Contribute this page's objects to the global palette.
 *
 * A null-rendering component rather than a bare hook, purely so the migration
 * off the old per-page `<CommandMenu objects={…} />` mounts was a rename at each
 * call site instead of a hook-placement exercise. Prefer `useCommandContext`
 * directly in new code.
 */
export const CommandContext = (props: CommandPageContext) => {
  useCommandContext(props);
  return null;
};

export default CommandContext;
