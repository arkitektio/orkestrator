import { RekuestResolution } from "@/core/linkers";
import ResolutionList from "../components/lists/ResolutionList";

const Page = () => {
  return (
    <RekuestResolution.ListPage title="Resolutions">
      <div className="p-3">
        <ResolutionList />
      </div>
    </RekuestResolution.ListPage>
  );
};

export default Page;
