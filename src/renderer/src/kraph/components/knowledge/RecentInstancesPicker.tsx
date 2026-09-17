/**
 * "Pick another <term>…" — a list of the organization's recent instances of a
 * word, each shown by its evidence, so the same thing can be picked without a
 * drag. Waits on the backend: it needs an organization-grain `instances`
 * query (filter by term key, ordered by `createdAt` desc) and
 * `Instance.evidence`. Until then the drop target and the context-menu action
 * are the ways to claim sameness, and this renders nothing.
 */
export const RecentInstancesPicker = (_props: {
  term: string;
  onPick: (instanceId: string) => void;
}) => null;

export default RecentInstancesPicker;
