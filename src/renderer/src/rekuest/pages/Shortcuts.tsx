import { RekuestShortcut } from "@/core/linkers";
import ShortcutList from "../components/lists/ShortcutList";
import { REKUEST_HELP } from "../help";

const Page = () => {
  return (
    <RekuestShortcut.ListPage help={REKUEST_HELP.shortcuts} title={"Shortcuts"}>
      <div className="p-3">
        <ShortcutList />
      </div>
    </RekuestShortcut.ListPage>
  );
};

export default Page;
