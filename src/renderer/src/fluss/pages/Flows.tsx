import { FlussFlow } from "@/core/linkers";
import FlowList from "../components/lists/FlowList";

const Page = () => {
  return (
    <FlussFlow.ListPage title="Flows">
      <div className="p-3">
        <FlowList pagination={{ limit: 30 }} />
      </div>
    </FlussFlow.ListPage>
  );
};

export default Page;
