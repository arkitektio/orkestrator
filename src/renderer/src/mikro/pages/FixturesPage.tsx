import { MikroFixture } from "@/core/linkers";
import FixtureList from "../components/lists/FixtureList";
import { MIKRO_HELP } from "../help";

const Page = () => (
  <MikroFixture.ListPage title="Fixtures" help={MIKRO_HELP.fixtures}>
    <div className="p-3">
      <FixtureList defaultLimit={40} />
    </div>
  </MikroFixture.ListPage>
);

export default Page;
