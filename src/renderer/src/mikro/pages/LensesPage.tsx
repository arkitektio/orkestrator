import { MikroLens } from "@/core/linkers";
import LensList from "../components/lists/LensList";

const Page = () => {
  return (
    <MikroLens.ListPage title="Lenses">
      <div className="p-3">
        <LensList defaultLimit={40} />
      </div>
    </MikroLens.ListPage>
  );
};

export default Page;
