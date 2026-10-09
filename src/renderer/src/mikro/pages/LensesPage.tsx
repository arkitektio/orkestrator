import { MikroLens } from "@/core/linkers";
import LensList from "../components/lists/LensList";

// Only the lenses that cut something out. A dataset carries several unsliced
// lenses, every one of them the dataset looked at whole — they are the Array
// Datasets page, and listing them here would bury the cuts people made.
const SLICED = { sliced: true };

const Page = () => {
  return (
    <MikroLens.ListPage title="Lenses">
      <div className="p-3">
        <LensList defaultLimit={40} filters={SLICED} />
      </div>
    </MikroLens.ListPage>
  );
};

export default Page;
