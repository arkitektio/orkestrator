import { KabinetBackend } from "@/core/linkers";
import BackendList from "../components/lists/BackendList";

const Page = () => {
  return (
    <KabinetBackend.ListPage title="Backends">
      <div className="p-3">
        <BackendList />
      </div>
    </KabinetBackend.ListPage>
  );
};

export default Page;
