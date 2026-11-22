import { GroupByDef } from "@/core/layout/GroupableListRenderer";
import { ActionOrder, BrowseActionFragment, Ordering } from "@/rekuest/api/graphql";
import {
  actionsBrowseLink,
  deriveAvailability,
} from "@/rekuest/lib/actionBrowse";
import { Link } from "react-router-dom";

// A grouping by app, collection or kind is also the server's first ordering
// (`groupOrdering`), so one group's actions come together across pages and the
// page edge cuts at most the last group short. Availability is worked out from
// the implementations here and has no server ordering: those groups cover the
// loaded page only. Where the backend can filter on the same thing, the group
// title links to that filter, the way to see a whole group.

const byTitle = (a: { title: React.ReactNode }, b: { title: React.ReactNode }) =>
  String(a.title).localeCompare(String(b.title));

const appGrouping: GroupByDef<BrowseActionFragment> = {
  key: "app",
  label: "App",
  getGroupId: (item) => item.app.identifier,
  getGroupTitle: (id) => (
    <Link to={actionsBrowseLink({ app: id })} className="hover:underline">
      {id}
    </Link>
  ),
  compareGroups: (a, b) => a.id.localeCompare(b.id),
};

export const UNCOLLECTED = "uncollected";

// An action can sit in several collections; it is filed under the first by
// name so it shows up once rather than once per collection.
const firstCollection = (item: BrowseActionFragment) =>
  [...item.collections].sort((a, b) => a.name.localeCompare(b.name))[0];

const collectionGrouping: GroupByDef<BrowseActionFragment> = {
  key: "collection",
  label: "Collection",
  getGroupId: (item) => firstCollection(item)?.name ?? UNCOLLECTED,
  getGroupTitle: (id) =>
    id === UNCOLLECTED ? (
      "No collection"
    ) : (
      <Link to={actionsBrowseLink({ collection: id })} className="hover:underline">
        {id}
      </Link>
    ),
  // Keep "No collection" last, otherwise alphabetical.
  compareGroups: (a, b) => {
    if (a.id === UNCOLLECTED) return 1;
    if (b.id === UNCOLLECTED) return -1;
    return a.id.localeCompare(b.id);
  },
};

const kindGrouping: GroupByDef<BrowseActionFragment> = {
  key: "kind",
  label: "Kind",
  getGroupId: (item) => item.kind,
  getGroupTitle: (id) => id.charAt(0) + id.slice(1).toLowerCase(),
  compareGroups: byTitle,
};

const AVAILABILITY_ORDER = ["online", "recent", "offline", "none"];
const AVAILABILITY_TITLE: Record<string, string> = {
  online: "Runnable now",
  recent: "Recently active",
  offline: "Offline",
  none: "No implementation",
};

const availabilityGrouping: GroupByDef<BrowseActionFragment> = {
  key: "availability",
  label: "Availability",
  getGroupId: (item) => deriveAvailability(item.implementations).status,
  getGroupTitle: (id) => AVAILABILITY_TITLE[id] ?? id,
  compareGroups: (a, b) =>
    AVAILABILITY_ORDER.indexOf(a.id) - AVAILABILITY_ORDER.indexOf(b.id),
};

/** Ordered group-by options offered on the Actions page. */
export const ACTION_GROUPINGS: GroupByDef<BrowseActionFragment>[] = [
  appGrouping,
  collectionGrouping,
  kindGrouping,
  availabilityGrouping,
];

export const ACTION_GROUP_KEYS = [
  "none",
  ...ACTION_GROUPINGS.map((g) => g.key),
] as const;

export type ActionGroupKey = (typeof ACTION_GROUP_KEYS)[number];

/**
 * The server ordering that keeps a grouping's groups together across pages, put
 * before the page's own sort. Absent for a grouping the server cannot order by.
 */
export const groupOrdering = (key: ActionGroupKey): ActionOrder | undefined =>
  ({
    app: { appIdentifier: Ordering.Asc },
    collection: { collection: Ordering.Asc },
    kind: { kind: Ordering.Asc },
  })[key as "app" | "collection" | "kind"];

export const getActionGrouping = (
  key: ActionGroupKey,
): GroupByDef<BrowseActionFragment> | undefined =>
  ACTION_GROUPINGS.find((g) => g.key === key);
