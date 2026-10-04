import { KabinetFlavour } from "@/core/linkers";
import FlavourList from "../components/lists/FlavourList";

const Page = () => {
  return (
    <KabinetFlavour.ListPage title="Flavours">
      <div className="p-3">
        <FlavourList />
      </div>
    </KabinetFlavour.ListPage>
  );
};

export default Page;
