import { RekuestMemoryShelve } from "@/core/linkers";
import MemoryShelveList from "../components/lists/MemoryShelveList";

const Page = () => {
  return (
    <RekuestMemoryShelve.ListPage title="Memory shelves">
      <div className="p-3">
        <MemoryShelveList defaultLimit={30} />
      </div>
    </RekuestMemoryShelve.ListPage>
  );
};

export default Page;
