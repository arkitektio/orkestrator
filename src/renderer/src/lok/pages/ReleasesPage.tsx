import { LokRelease } from "@/core/linkers";
import ReleaseList from "../components/lists/ReleaseList";
import { LOK_HELP } from "../help";

const Page = () => {
  return (
    <LokRelease.ListPage title="Releases" help={LOK_HELP.releases}>
      <div className="p-3">
        <ReleaseList />
      </div>
    </LokRelease.ListPage>
  );
};

export default Page;
