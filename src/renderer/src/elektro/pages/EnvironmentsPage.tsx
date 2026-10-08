import { ElektroEnvironment } from "@/core/linkers";
import EnvironmentList from "../components/lists/EnvironmentList";

const Page = () => {
  return (
    <ElektroEnvironment.ListPage title="Environments">
      <div className="p-3">
        <EnvironmentList defaultLimit={30} />
      </div>
    </ElektroEnvironment.ListPage>
  );
};

export default Page;
