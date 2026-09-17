import { GroupByDef } from "@/components/layout/GroupableListRenderer";
import { BrowseActionFragment } from "@/rekuest/api/graphql";
import {
  actionsBrowseLink,
  deriveAvailability,
} from "@/rekuest/lib/actionBrowse";
import { Link } from "react-router-dom";

// Grouping runs on the loaded page only (offset pagination), so a group can be
// cut off at the page edge. Where the backend can filter on the same thing, the
// group title links to that filter — the way to see a whole group.

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

export const getActionGrouping = (
  key: ActionGroupKey,
): GroupByDef<BrowseActionFragment> | undefined =>
  ACTION_GROUPINGS.find((g) => g.key === key);
