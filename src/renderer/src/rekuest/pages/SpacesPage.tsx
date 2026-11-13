import { RekuestSpace } from "@/core/linkers";
import SpacesList from "../components/lists/SpacesList";
import { REKUEST_HELP } from "../help";

/** The rooms of the organization: each made the first time someone kept where a device stands in it. */
const Page = () => (
  <RekuestSpace.ListPage help={REKUEST_HELP.spaces} title={"Spaces"}>
    <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
      <div>
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Spaces</h1>
        <p className="mt-3 text-xl text-muted-foreground">
          The rooms the actions&apos; 3D views place their devices in. A room keeps where people left each
          device, for everyone; it is made the first time someone arranges one.
        </p>
      </div>
    </div>
    <SpacesList />
  </RekuestSpace.ListPage>
);

export default Page;
