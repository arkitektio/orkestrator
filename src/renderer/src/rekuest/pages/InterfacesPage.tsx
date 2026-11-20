import { RekuestInterface } from "@/core/linkers";
import InterfaceList from "../components/lists/InterfaceList";
import { REKUEST_HELP } from "../help";
const Page = () => {
  return (
    <RekuestInterface.ListPage help={REKUEST_HELP.interfaces} title={"Interfaces"}>
      <div className="p-3">
        <InterfaceList />
      </div>
    </RekuestInterface.ListPage>
  );
};

export default Page;
