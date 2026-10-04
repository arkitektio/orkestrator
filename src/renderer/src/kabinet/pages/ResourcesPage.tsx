import { KabinetResource } from "@/core/linkers";
import ResourceList from "../components/lists/ResourceList";

const Page = () => {
  return (
    <KabinetResource.ListPage title="Resources">
      <div className="p-3">
        <ResourceList />
      </div>
    </KabinetResource.ListPage>
  );
};

export default Page;
