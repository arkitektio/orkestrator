import { MailCategory } from "@/core/linkers";
import CategoryList from "../components/lists/CategoryList";

const Page = () => {
  return (
    <MailCategory.ListPage title="Categories">
      <div className="p-3">
        <CategoryList defaultLimit={30} />
      </div>
    </MailCategory.ListPage>
  );
};

export default Page;
