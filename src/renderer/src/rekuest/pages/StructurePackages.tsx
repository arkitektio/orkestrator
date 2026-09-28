import { RekuestStructurePackage } from "@/core/linkers";
import StructurePackageList from "../components/lists/StructurePackageList";
const Page = () => {
  return (
    <RekuestStructurePackage.ListPage title={"Structure Packages"}>
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-3">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your Structure Packages
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Structure Packages are collection of types that can be used in
              various actions.
            </p>
          </div>
        </div>

        <StructurePackageList />
      </div>
    </RekuestStructurePackage.ListPage>
  );
};

export default Page;
