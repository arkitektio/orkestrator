import { PageAction } from "@/core/ui/page-action";
import { DialogButton } from "@/core/ui/dialog-button";
import { BankCategory } from "@/bank/linkers";
import { toast } from "@/core/notify";
import { ListCategoriesDocument, useSyncBaseCategoriesMutation } from "../api/graphql";
import CategoryList from "../components/lists/CategoryList";
import { BANK_HELP } from "../help";

const ROOTS = { roots: true };

const CategoriesPage = () => {
  const [sync, { loading }] = useSyncBaseCategoriesMutation({ refetchQueries: [ListCategoriesDocument] });
  return (
    <BankCategory.ListPage
      help={BANK_HELP.categories}
      title="Categories"
      pageActions={
        <>
          <DialogButton name="bankcreatecategory" size="sm" variant="outline" dialogProps={{}} options={{ size: "small" }}>
            New category
          </DialogButton>
          <PageAction
            size="sm"
            priority={-10}
            disabled={loading}
            onClick={() =>
              sync()
                .then((r) => {
                  const added = r.data?.syncBaseCategories.length ?? 0;
                  toast.success(added ? `Added ${added} default categories` : "All default categories are there");
                })
                .catch((e: Error) => toast.error(e.message))
            }
          >
            Add defaults
          </PageAction>
        </>
      }
    >
      <div className="p-3">
        <CategoryList
          title=""
          filters={ROOTS}
          defaultLimit={100}
          emptyDescription="Start from the default set, or create your own."
        />
      </div>
    </BankCategory.ListPage>
  );
};

export default CategoriesPage;
