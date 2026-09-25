/**
 * Edges into a module that are tolerated, each with its reason:
 *  - `kept`: intended (a declared dependency, or lok as the session service,
 *    or the port system speaking rekuest's schema);
 *  - `open`: still to invert into a host slot or a builtin.
 * The boundary test fails on any edge missing here AND on any entry that no
 * longer occurs, so this list only ever shrinks. Keys are `from -> to` owners
 * (see `ownerOf` in the test).
 */
export const EDGE_ALLOWLIST: Record<string, string> = {
  "alpaka -> kabinet": "open: alpaka chat runs actions on kabinet definitions/pods",
  "alpaka -> rekuest": "open: alpaka's agent chat assigns rekuest actions (candidate: requires rekuest, like fluss)",
  "fluss -> rekuest": "kept: fluss declares requires.services [\"rekuest\"]",
  "host:agent -> rekuest": "kept: the in-app agent assigns and serializes rekuest actions",
  "host:app -> lok": "kept: lok is the session service (identity/brand sync, services page, hero)",
  "host:app -> rekuest": "kept: the port widget registry speaks rekuest",
  "host:connection -> lok": "kept: the connection doctor asks lok for hub health (session service)",
  "host:components -> rekuest": "kept: ports speak the rekuest port schema (generated types + PortKind)",
  "host:lib/arkitekt -> lok": "kept: hub health asks lok (session service)",
  "host:lib/ports -> rekuest": "kept: ports speak the rekuest port schema (generated types + PortKind), never its client",
  "host:lib/taskhooks -> rekuest": "kept: task hooks run on rekuest task events",
  "kabinet -> rekuest": "kept: kabinet declares requires.services [\"rekuest\"] (its smart section installs definitions through rekuest)",
};
