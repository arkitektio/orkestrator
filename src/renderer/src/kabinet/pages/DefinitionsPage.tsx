import { KabinetDefinition } from "@/core/linkers";
import DefinitionList from "../components/lists/DefinitionList";

const Page = () => {
  return (
    <KabinetDefinition.ListPage title="Definitions">
      <div className="p-3">
        <DefinitionList />
      </div>
    </KabinetDefinition.ListPage>
  );
};

export default Page;
