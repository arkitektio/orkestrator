import React from "react";
import { smartSections } from "../hostRegistries";
import { SectionHost } from "./SectionHost";
import { resolveSections } from "./sectionRegistry";
import type { RelatedContext, SmartContextProps } from "./types";

type PaletteSectionsProps = SmartContextProps & { filter?: string };

/**
 * What the ⌘K palette offers for its context: the registered sections that
 * opted into the palette (`palette: true`), through the same `SectionHost`
 * (guard, heading, empty rule) as the menu. No module is named here.
 *
 * Then, for each context the page also stands for (`related`: a container's
 * whole lens), the sections that serve one (`related` on the descriptor),
 * headed with its label. A section folding them into its one query asks the
 * same thing from every mount, so a related context costs no request of its
 * own.
 */
export const PaletteSections = (props: PaletteSectionsProps) => {
  const sections = resolveSections(smartSections(), { ...props, sections: { palette: true } });
  return (
    <>
      {sections.map((section) => (
        <SectionHost key={section.id} section={section} context={props} />
      ))}
      {props.related?.map((related) => (
        <RelatedSections key={related.key} related={related} page={props} />
      ))}
    </>
  );
};

const RelatedSections = ({
  related,
  page,
}: {
  related: RelatedContext;
  page: PaletteSectionsProps;
}) => {
  // The related objects alone: the page's partners and return types are the
  // page's, not its lens'.
  const context = React.useMemo(
    () => ({
      filter: page.filter,
      objects: related.objects,
      related: page.related,
      primary: { objects: page.objects, partners: page.partners, returns: page.returns },
      collection: page.collection,
      onDone: page.onDone,
    }),
    [
      page.filter,
      related.objects,
      page.related,
      page.objects,
      page.partners,
      page.returns,
      page.collection,
      page.onDone,
    ],
  );
  if (related.objects.length === 0) return null;
  const sections = resolveSections(smartSections(), {
    ...context,
    sections: { palette: true },
  }).filter((section) => section.related !== undefined);
  return (
    <>
      {sections.map((section) => (
        <SectionHost key={section.id} section={section} context={context} scope={related} />
      ))}
    </>
  );
};
