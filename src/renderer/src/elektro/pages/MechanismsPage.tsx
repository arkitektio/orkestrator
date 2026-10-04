import { ElektroMechanism } from "@/core/linkers";
import MechanismList from "../components/lists/MechanismList";

const Page = () => {
  return (
    <ElektroMechanism.ListPage title="Mechanisms">
      <div className="p-3">
        <MechanismList defaultLimit={30} />
      </div>
    </ElektroMechanism.ListPage>
  );
};

export default Page;
