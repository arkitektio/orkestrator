/** What of a port says whether a blok of its own draws it. */
type MaybeBlokPort = {
  widget?: { __typename?: string } | null;
  children?: readonly (MaybeBlokPort | null | undefined)[] | null;
};

/**
 * Whether any of the ports, at any depth, is drawn by a blok of its own (a BLOK assign widget).
 * Such a blok may read the agents a run would get (`deps`), so a form that holds one asks for
 * the run's binding even when the action has no assign bloks.
 */
export const usesPortBlok = (ports: readonly (MaybeBlokPort | null | undefined)[] | null | undefined): boolean =>
  (ports ?? []).some(
    (port) => port != null && (port.widget?.__typename === "BlokAssignWidget" || usesPortBlok(port.children)),
  );
