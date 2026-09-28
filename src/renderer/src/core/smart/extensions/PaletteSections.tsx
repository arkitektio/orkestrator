import { smartSections } from "../hostRegistries";
import { SectionHost } from "./SectionHost";
import { resolveSections } from "./sectionRegistry";
import type { SmartContextProps } from "./types";

/**
 * What the ⌘K palette offers for its context: the registered sections that
 * opted into the palette (`palette: true`), through the same `SectionHost`
 * (guard, heading, empty rule) as the menu. No module is named here.
 */
export const PaletteSections = (props: SmartContextProps & { filter?: string }) => {
  const sections = resolveSections(smartSections(), { ...props, sections: { palette: true } });
  return (
    <>
      {sections.map((section) => (
        <SectionHost key={section.id} section={section} context={props} />
      ))}
    </>
  );
};
