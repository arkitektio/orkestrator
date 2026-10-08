import { KabinetRelease } from "@/core/linkers";
import ReleasesList from "../components/lists/ReleasesList";

const Page = () => {
  return (
    <KabinetRelease.ListPage title="Releases">
      <div className="p-3">
        <ReleasesList />
      </div>
    </KabinetRelease.ListPage>
  );
};

export default Page;
