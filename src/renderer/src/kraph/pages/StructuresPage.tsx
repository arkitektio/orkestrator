import { KraphStructure } from "@/core/linkers";
import StructureList from "../components/lists/StructureList";

const Page = () => {
  return (
    <KraphStructure.ListPage title="Structures">
      <div className="p-3">
        <StructureList defaultLimit={30} />
      </div>
    </KraphStructure.ListPage>
  );
};

export default Page;
