import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { PageAction } from "@/core/ui/page-action";
import { Pencil } from "lucide-react";
import { CategorySync, useGetCategoryQuery } from "../api/graphql";
import { MailList } from "../components/list/MailList";
import { MailSplit } from "../components/split/MailSplit";
import { MailCategory } from "../linkers";

/** A category's conversations across its mailbox's folders, newest first. */
const CategoryPage = asDetailQueryRoute(useGetCategoryQuery, ({ data }) => {
  const category = data.category;
  const { openDialog } = useDialog();

  return (
    <MailCategory.ModelPage
      title={category.name}
      object={category}
      pageActions={
        <>
          <PageAction
            size="sm"
            collapse="icon"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openDialog("kuvertcategory", { id: category.id }, { size: "small" })}
          >
            Edit
          </PageAction>
          <MailCategory.ObjectButton alwaysShow object={category} />
        </>
      }
    >
      <MailSplit
        list={
          <MailList
            key={category.id}
            title={category.name}
            subtitle={[
              category.account.emailAddress,
              category.sync === CategorySync.Keyword ? `on the server as ${category.keyword}` : "only here",
            ].join(" · ")}
            source={{ kind: "threads", filters: { category: category.id } }}
            empty={{ title: "Nothing in it", description: `Put mail into ${category.name} from its toolbar or menu.` }}
          />
        }
      />
    </MailCategory.ModelPage>
  );
});

export default CategoryPage;
