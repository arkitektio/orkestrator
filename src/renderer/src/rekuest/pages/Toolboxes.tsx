import { RekuestToolbox } from "@/core/linkers";
import ToolboxList from "../components/lists/ToolboxList";
import { REKUEST_HELP } from "../help";

const Page = () => {
  return (
    <RekuestToolbox.ListPage help={REKUEST_HELP.toolboxes} title={"Toolboxes"}>
      <div className="p-3">
        <ToolboxList />
      </div>
    </RekuestToolbox.ListPage>
  );
};

export default Page;
