import { DokumentsFile } from "@/core/linkers";
import FileList from "../components/lists/FileList";

const Page = () => {
  return (
    <DokumentsFile.ListPage title="Files">
      <div className="p-3">
        <FileList />
      </div>
    </DokumentsFile.ListPage>
  );
};

export default Page;
