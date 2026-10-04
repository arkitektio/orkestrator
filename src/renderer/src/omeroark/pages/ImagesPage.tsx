import { OmeroArkImage } from "@/core/linkers";
import ImageList from "../components/lists/ImageList";

const Page = () => {
  return (
    <OmeroArkImage.ListPage title="Images">
      <div className="p-3">
        <ImageList />
      </div>
    </OmeroArkImage.ListPage>
  );
};

export default Page;
