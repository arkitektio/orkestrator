import { LokRelease } from "@/core/linkers";
import ReleaseList from "../components/lists/ReleaseList";

const Page = () => {
  return (
    <LokRelease.ListPage title="Releases">
      <div className="p-3">
        <ReleaseList />
      </div>
    </LokRelease.ListPage>
  );
};

export default Page;
