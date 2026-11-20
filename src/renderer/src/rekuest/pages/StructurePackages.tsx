import { RekuestStructurePackage } from "@/core/linkers";
import StructurePackageList from "../components/lists/StructurePackageList";
import { REKUEST_HELP } from "../help";
const Page = () => {
  return (
    <RekuestStructurePackage.ListPage help={REKUEST_HELP.structurePackages} title={"Structure Packages"}>
      <div className="p-3">
        <StructurePackageList />
      </div>
    </RekuestStructurePackage.ListPage>
  );
};

export default Page;
