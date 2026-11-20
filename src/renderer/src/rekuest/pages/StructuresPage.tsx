import { RekuestStructure } from "@/core/linkers";
import StructureList from "../components/lists/StructureList";
import { REKUEST_HELP } from "../help";
const Page = () => {
  return (
    <RekuestStructure.ListPage help={REKUEST_HELP.structures} title={"Structures"}>
      <div className="p-3">
        <StructureList />
      </div>
    </RekuestStructure.ListPage>
  );
};

export default Page;
