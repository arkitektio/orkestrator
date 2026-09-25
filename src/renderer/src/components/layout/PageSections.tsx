import { pageSectionsFor } from "@/app/modules/registries";
import type { PageSection } from "@/lib/module-host/define";
import { smartRegistry } from "@/providers/smart/registry";
import type { Identifier, Object } from "@/types";

type SectionsProps = {
  identifier: Identifier;
  object: Object;
  /** Called when a section changed the object, so the page can refetch. */
  onChanged?: () => unknown;
};

/**
 * What other modules add to this model's page (`section` surfaces, a module's
 * `pageSections` builtin). The page names a place; the modules decide what
 * goes there. Nothing is imported from the contributing module, and each
 * section sits behind its own module's guard.
 */
export const PageSections = ({
  identifier,
  object,
  placement,
  onChanged,
}: SectionsProps & { placement: PageSection["placement"] }) => (
  <>
    {pageSectionsFor(identifier, { placement, slot: null }, smartRegistry.isDatum(identifier)).map(
      ({ id, Component }) => (
        <Component key={id} identifier={identifier} object={object} onChanged={onChanged} />
      ),
    )}
  </>
);

/** Whether anything fills a host-drawn sidebar for this model. */
export const hasSlotSections = (identifier: Identifier, slot: NonNullable<PageSection["slot"]>) =>
  pageSectionsFor(identifier, { slot }, smartRegistry.isDatum(identifier)).length > 0;

/** The contents of a host-drawn sidebar ("knowledge", "chat") for one model. */
export const SlotSections = ({
  identifier,
  object,
  slot,
}: SectionsProps & { slot: NonNullable<PageSection["slot"]> }) => (
  <>
    {pageSectionsFor(identifier, { slot }, smartRegistry.isDatum(identifier)).map(({ id, Component }) => (
      <Component key={id} identifier={identifier} object={object} />
    ))}
  </>
);
