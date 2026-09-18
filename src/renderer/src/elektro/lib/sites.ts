/**
 * Where a trace was recorded or stimulated, read off its dataset's anchors.
 *
 * The Neo model had `Recording` and `Stimulus` objects carrying `cell`,
 * `location` and `position`. They are gone: a recording or stimulus is now an
 * `ArrayDataset`, and what it IS lives on its anchors — one per position along
 * its non-time axes, each optionally naming a `recordingSite` or `stimulusSite`.
 * A multi-channel dataset can therefore name several sites.
 *
 * Structural and free of generated types, so it runs in node.
 */

export type SiteLike = {
  id: string;
  kind: string;
  cell?: string | null;
  location?: string | null;
  position?: number | null;
  label: string;
};

type AnchorLike = {
  recordingSite?: SiteLike | null;
  stimulusSite?: SiteLike | null;
};

export type SiteKind = "recording" | "stimulus";

/** The distinct sites a dataset's anchors name, in anchor order. */
export const sitesOf = (
  dataset: { anchors?: readonly AnchorLike[] | null },
  kind: SiteKind,
): SiteLike[] => {
  const seen = new Set<string>();
  const out: SiteLike[] = [];
  for (const anchor of dataset.anchors ?? []) {
    const site = kind === "recording" ? anchor.recordingSite : anchor.stimulusSite;
    if (!site || seen.has(site.id)) continue;
    seen.add(site.id);
    out.push(site);
  }
  return out;
};

/**
 * What to call a recording or stimulus dataset: its site labels when its anchors
 * name any ("soma_v", or "soma_v, dend_v" for two), else the dataset's own name.
 */
export const siteLabelOf = (
  dataset: { name: string; anchors?: readonly AnchorLike[] | null },
  kind: SiteKind,
): string => {
  const sites = sitesOf(dataset, kind);
  return sites.length > 0 ? sites.map((s) => s.label).join(", ") : dataset.name;
};

/**
 * "cell · location(position)" — the point on the model a site sits at. Null
 * when the site names neither a cell nor a location (a recording from a file
 * has no modelled site), so a row can leave the line out rather than print
 * "undefined".
 */
export const whereOf = (site: {
  cell?: string | null;
  location?: string | null;
  position?: number | null;
}): string | null => {
  if (!site.cell && !site.location) return null;
  const at = site.position == null ? site.location : `${site.location ?? ""}(${site.position})`;
  return [site.cell, at].filter(Boolean).join(" · ") || null;
};
