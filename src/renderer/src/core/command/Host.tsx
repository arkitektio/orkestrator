import { CommandMenu } from "./Menu";
import { useCommandPalette } from "./CommandPaletteProvider";

/**
 * The palette's single mount point.
 *
 * Reads whatever page is currently registered through `useCommandContext` and
 * hands it to `CommandMenu`, so pages contribute their objects without each
 * mounting a palette of their own.
 */
export const CommandMenuHost = () => {
  const { pageContext } = useCommandPalette();

  return (
    <CommandMenu
      objects={pageContext.objects}
      partners={pageContext.partners}
      returns={pageContext.returns}
      collection={pageContext.collection}
    />
  );
};

export default CommandMenuHost;
