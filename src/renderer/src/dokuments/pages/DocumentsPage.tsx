import { DokumentsDocument } from "@/core/linkers";
import DocumentList from "../components/lists/DocumentList";

const Page = () => {
  return (
    <DokumentsDocument.ListPage title="Documents">
      <div className="p-3">
        <DocumentList defaultLimit={30} />
      </div>
    </DokumentsDocument.ListPage>
  );
};

export default Page;
