import { LinkKind, type ClaimActFragment } from "@/kraph/api/graphql";

/** One thing an act said, ready to read; `to` is the claim's own page, when it has one. */
export type ActPart = {
  key: string;
  text: string;
  to?: { kind: "instance" | "link" | "metric" | "structure"; id: string };
};

const wordOf = (term?: { key: string; label?: string | null } | null) =>
  term?.label || term?.key || null;

const LINK_PHRASES: Partial<Record<LinkKind, string>> = {
  [LinkKind.SameAs]: "same as",
  [LinkKind.DifferentFrom]: "different from",
  [LinkKind.Informs]: "evidence for",
  [LinkKind.DerivedFrom]: "derived from",
  [LinkKind.ParticipatesAsInput]: "went into",
  [LinkKind.ParticipatesAsOutput]: "came out of",
};

/**
 * What one act said, in the order a person would say it. An act can say several
 * things at once ("this is AIS 6" mints an instance and a sameness link), so a
 * row reads it part by part rather than picking one.
 */
export const describeAct = (act: ClaimActFragment): ActPart[] => [
  ...act.instances.map((instance) => ({
    key: `instance:${instance.id}`,
    text: wordOf(instance.term) ?? "a thing",
    to: { kind: "instance" as const, id: instance.id },
  })),
  ...act.links.map((link) => ({
    key: `link:${link.id}`,
    text: wordOf(link.term) ?? LINK_PHRASES[link.kind] ?? "a link",
    to: { kind: "link" as const, id: link.id },
  })),
  ...act.metrics.map((metric) => ({
    key: `metric:${metric.id}`,
    text: [metric.key, "=", String(metric.value), metric.unit].filter(Boolean).join(" "),
    to: { kind: "metric" as const, id: metric.id },
  })),
  ...act.comments.map((comment) => ({
    key: `comment:${comment.id}`,
    text: `“${comment.text}”`,
  })),
  ...act.standings.map((standing) => ({
    key: `standing:${standing.id}`,
    text: standing.stands ? "attested" : "retracted",
  })),
  // A datum only counts as said when nothing else was: asserting a sentence
  // introduces its datum in passing.
  ...(act.instances.length + act.links.length + act.metrics.length + act.comments.length === 0
    ? act.structures.map((structure) => ({
        key: `structure:${structure.id}`,
        text: `recorded ${structure.identifier}`,
        to: { kind: "structure" as const, id: structure.id },
      }))
    : []),
];
