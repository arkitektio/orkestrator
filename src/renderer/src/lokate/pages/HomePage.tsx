import { PageLayout } from "@/core/layout/PageLayout";
import { ModuleHome, ModuleHomeSidebars } from "@/core/layout/ModuleHome";
import { Ordering } from "../api/graphql";
import TripList from "../components/lists/TripList";
import VisitList from "../components/lists/VisitList";
import { LOKATE_HELP } from "../help";

// Hoisted: the lists reset their paging whenever this changes identity.
const NEWEST_FIRST = [{ start: Ordering.Desc }];

/**
 * Lokate's front door: the newest stays and trips. Its pages (the day by day
 * Timeline among them) are the sidebar's Overview tab.
 */
const HomePage = () => (
  <PageLayout
    title="Lokate"
    help={LOKATE_HELP.home}
    sidebars={<ModuleHomeSidebars moduleKey="lokate" />}
  >
    <ModuleHome
      moduleKey="lokate"
      pages={false}
      title="Lokate"
      description="Where you have been: stays, trips and your named places."
    >
      <VisitList title="Recent visits" ordering={NEWEST_FIRST} defaultLimit={8} />
      <TripList title="Recent trips" ordering={NEWEST_FIRST} defaultLimit={6} />
    </ModuleHome>
  </PageLayout>
);

export default HomePage;
