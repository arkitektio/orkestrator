import { RekuestSpace } from "@/core/linkers";
import SpacesList from "../components/lists/SpacesList";
import { REKUEST_HELP } from "../help";

/** The rooms of the organization: each made the first time someone kept where a device stands in it. */
const Page = () => (
  <RekuestSpace.ListPage help={REKUEST_HELP.spaces} title={"Spaces"}>
    <div className="p-3">
      <SpacesList />
    </div>
  </RekuestSpace.ListPage>
);

export default Page;
