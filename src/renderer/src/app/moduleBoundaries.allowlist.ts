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
  "alpaka -> lok": "open: chat list resolves users through lok (-> @lok/user display)",
  "alpaka -> rekuest": "open: alpaka's agent chat assigns rekuest actions (candidate: requires rekuest, like fluss)",
  "elektro -> lok": "open: AppInfo by OAuth client_id; @lok/client is addressed by its internal id",
  "fluss -> rekuest": "kept: fluss declares requires.services [\"rekuest\"]",
  "host:app -> kraph": "open: DetailQueryRoute wraps pages in kraph's GraphScopeProvider",
  "host:app -> lok": "kept: lok is the session service (identity/brand sync, doctor, hero)",
  "host:app -> rekuest": "kept: the in-app agent (app/agent) and the port widget registry speak rekuest; open: TaskNotificationStack",
  "host:blok -> lovekit": "open: the blok catalog's lovekit component",
  "host:blok -> rekuest": "open: blok catalog export uses rekuest's catalog input type",
  "host:command -> alpaka": "open: the palette's 'ask' is alpaka's talk-about (-> a palette source builtin)",
  "host:command -> elektro": "open: route catalog reads elektro specs (-> manifest nav)",
  "host:command -> kabinet": "open: palette menu mounts kabinet's smart section directly",
  "host:command -> mikro": "open: route catalog reads mikro specs (-> manifest nav)",
  "host:command -> rekuest": "open: palette menu mounts rekuest's Run-on and smart sections directly",
  "host:components -> rekuest": "kept: ports speak the rekuest port schema (generated types + PortKind)",
  "host:dialogs -> lok": "kept: bug reports describe the client and user via lok (session service)",
  "host:dialogs -> rekuest": "open: bug report reads the failing task from rekuest",
  "host:lib/arkitekt -> lok": "kept: hub health asks lok (session service)",
  "host:lib/export -> rekuest": "open: export dialog assigns rekuest export actions",
  "host:lib/ports -> rekuest": "kept: ports speak the rekuest port schema (generated types + PortKind), never its client",
  "host:lib/taskhooks -> rekuest": "kept: task hooks run on rekuest task events",
  "host:providers -> alpaka": "open: smart extension index names alpaka's section (-> builtins only)",
  "host:providers -> kabinet": "open: smart extension index + kabinet demands (-> builtins only)",
  "host:providers -> kraph": "open: smart extension index names kraph's; builtin dashboard widgets query kraph",
  "host:providers -> lok": "open: builtin dashboard widgets query lok",
  "host:providers -> rekuest": "open: the smart menu's Run-on, demands and prefetch are rekuest-shaped",
  "host:settings -> lok": "kept: services page and brand writer (lok is the session service)",
  "kabinet -> rekuest": "open: kabinet cards deploy through rekuest (-> rekuest sections on @kabinet/*)",
  "kraph -> alpaka": "open: ImageCreator hands a generated File back to kraph's upload",
  "kraph -> lok": "open: ClaimRuleEditor user search (-> lok search builtin); client names by client_id",
  "mikro -> lok": "open: AppInfo by OAuth client_id; @lok/client is addressed by its internal id",
  "lok -> kraph": "open: lok's dashboard embeds kraph's LatestMentionsSection (-> section)",
  "rekuest -> lok": "open: DeviceImprint by nodeId; facet filter and Home stats query lok",
};
