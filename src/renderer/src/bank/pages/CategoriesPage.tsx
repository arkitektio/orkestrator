import { PageAction } from "@/core/ui/page-action";
import { DialogButton } from "@/core/ui/dialog-button";
import { BankCategory } from "@/bank/linkers";
import { toast } from "sonner";
import { ListCategoriesDocument, useSeedDefaultCategoriesMutation } from "../api/graphql";
import CategoryList from "../components/lists/CategoryList";

const ROOTS = { roots: true };

const CategoriesPage = () => {
  const [seed, { loading }] = useSeedDefaultCategoriesMutation({ refetchQueries: [ListCategoriesDocument] });
  return (
    <BankCategory.ListPage
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
              seed()
                .then((r) => toast.success(`Added ${r.data?.seedDefaultCategories.length ?? 0} categories`))
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
