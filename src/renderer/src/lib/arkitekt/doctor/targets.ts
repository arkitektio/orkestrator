import type { ProbeTarget } from "../../../../../main/doctor/protocol";
import { aliasToHttpPath } from "../alias/helpers";
import type { Alias, Instance } from "../fakts/faktsSchema";

/**
 * Turn the things that failed into things main can probe.
 *
 * The rule here is that the doctor must probe the EXACT url the app tried —
 * `resolveWorkingAlias` GETs `aliasToHttpPath(alias, alias.challenge)`, so the
 * probe url is built with the same helper rather than re-derived in main. A
 * doctor that quietly probes a different address is worse than none.
 */

export const DISCOVERY_PROBE_PATH = ".well-known/fakts";

export const aliasToProbeTarget = (alias: Alias, label: string): ProbeTarget => ({
  host: alias.host,
  port: alias.port ?? null,
  ssl: alias.ssl,
  path: alias.path ?? null,
  probePath: alias.challenge || null,
  label,
});

/** Every alias of one service, labelled the way the report will show them. */
export const instanceToProbeTargets = (
  serviceKey: string,
  instance: Instance,
): ProbeTarget[] =>
  instance.aliases.map((alias, index) =>
    aliasToProbeTarget(
      alias,
      instance.aliases.length > 1
        ? `${serviceKey} alias ${index + 1} of ${instance.aliases.length}`
        : serviceKey,
    ),
  );

/**
 * A coordination-server URL, as `discover` would try it: with an explicit
 * scheme that scheme alone, otherwise https AND http, because `discover`
 * races both and "https failed but http worked" is itself a finding.
 */
export const endpointToProbeTargets = (rawUrl: string): ProbeTarget[] => {
  const url = (rawUrl || "").trim();
  if (!url) return [];

  const hasScheme = url.startsWith("http://") || url.startsWith("https://");
  const bases = hasScheme ? [url] : [`https://${url}`, `http://${url}`];

  return bases.flatMap((base) => {
    let parsed: URL;
    try {
      parsed = new URL(base);
    } catch {
      return [];
    }

    const path = parsed.pathname.replace(/^\/|\/$/g, "");
    return [
      {
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : null,
        ssl: parsed.protocol === "https:",
        path: path || null,
        probePath: DISCOVERY_PROBE_PATH,
        label: hasScheme ? parsed.origin : parsed.protocol.replace(":", ""),
      } satisfies ProbeTarget,
    ];
  });
};

/** The url a target resolves to — the same string main will request. */
export const probeTargetUrl = (target: ProbeTarget): string =>
  aliasToHttpPath(
    {
      id: "",
      host: target.host,
      port: target.port ?? null,
      ssl: target.ssl,
      path: target.path ?? null,
      challenge: "",
    },
    target.probePath || "",
  );
