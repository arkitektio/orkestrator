import stamp from "@/tested.json";

/** The release of each service the app's documents were validated against, by fakts key. */
export const TESTED: Record<string, string> = stamp;

/** What a release wants of a service it was tested against: that minor, within its major. */
export const wanted = (version: string | undefined): string | undefined => {
  const match = version?.match(/^(\d+)\.(\d+)/);
  if (!match) return undefined;
  return `>=${match[1]}.${match[2]},<${Number(match[1]) + 1}`;
};
