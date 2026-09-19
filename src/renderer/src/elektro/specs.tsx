import { Clock, Layers, Waves, type LucideIcon } from "lucide-react";
import { ArrayDatasetSpec } from "./api/graphql";

/**
 * Elektro's catalogue of array-dataset specs — what the server says a dataset
 * IS from its axes, one page each under `/elektro/arraydatasets/spec/:slug`.
 *
 * Only the kinds that tell SIGNALS apart. The enum is shared with mikro and also
 * carries spatial ranks (IMAGE, VOLUME, …), which describe no electrophysiology
 * array — and SCALAR ("no spatial extent") holds for nearly every recording, so a
 * page of it would just be every dataset again. Those are deliberately absent:
 * no page, no nav link, no tag. Mikro keeps its own catalogue
 * (`mikro-next/specs.tsx`), in a micrograph's words.
 */

export type ArrayDatasetSpecEntry = {
  spec: ArrayDatasetSpec;
  /** URL segment under /elektro/arraydatasets/spec/. */
  slug: string;
  /** Plural, for the page and the nav. */
  label: string;
  /** Lowercase, for a tag on a card or in the Info tab. */
  short: string;
  description: string;
  icon: LucideIcon;
};

export const ARRAY_DATASET_SPECS: readonly ArrayDatasetSpecEntry[] = [
  {
    spec: ArrayDatasetSpec.Timeseries,
    slug: "timeseries",
    label: "Timeseries",
    short: "timeseries",
    description:
      "Datasets carrying a TIME axis — a signal: a recording, a stimulus, a simulated trace.",
    icon: Clock,
  },
  {
    spec: ArrayDatasetSpec.Multichannel,
    slug: "multichannel",
    label: "Multichannel",
    short: "multichannel",
    description:
      "Datasets carrying a CHANNEL axis — several electrodes or sites at once. A one-channel axis still counts.",
    icon: Layers,
  },
  {
    spec: ArrayDatasetSpec.Spectral,
    slug: "spectral",
    label: "Spectral",
    short: "spectral",
    description:
      "Datasets carrying a FREQUENCY axis: a spectrum or a spectrogram, not a signal over time.",
    icon: Waves,
  },
];

export const ARRAY_DATASET_SPEC_BY_SLUG: Record<string, ArrayDatasetSpecEntry> =
  Object.fromEntries(ARRAY_DATASET_SPECS.map((entry) => [entry.slug, entry]));

export const arrayDatasetSpecLink = (slug: string) => `/elektro/arraydatasets/spec/${slug}`;

/** A dataset's specs that elektro catalogues, in catalogue order (the rest are not shown). */
export const specsOf = (specs: readonly ArrayDatasetSpec[] | null | undefined) =>
  ARRAY_DATASET_SPECS.filter((entry) => specs?.includes(entry.spec));
