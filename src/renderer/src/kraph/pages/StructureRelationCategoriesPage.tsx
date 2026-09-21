import { Card } from "@/components/ui/card";
import { DialogButton } from "@/components/ui/dialog-button";
import { KraphStructureRelationCategory } from "@/linkers";
import { PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StructureRelationCategoryList from "../components/lists/StructureRelationCategoryList";


const Page = () => {
  const navigate = useNavigate();

  return (
    <KraphStructureRelationCategory.ListPage
      title="Structure Relations"
      pageActions={
        <>
          <DialogButton
            alwaysShow
            name="createstructurerelationcategory"
            variant={"outline"}
            size={"sm"}
            dialogProps={{
              onSuccess: (data) => navigate(KraphStructureRelationCategory.linkBuilder(data.createStructureRelationCategory.id)),
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create
          </DialogButton>
        </>
      }
    >
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-4">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your structure relations categories
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Relations represent the connections between your data. They are
              the links that bind your entities together and allow you to
              understand the relationships between them. Other than entity
              relations they are designed to model relations between your data.
            </p>
          </div>
          <Card className="w-full h-full flex-row relative"></Card>
        </div>

        <StructureRelationCategoryList pagination={{ limit: 30 }} />
      </div>
    </KraphStructureRelationCategory.ListPage>
  );
};

export default Page;
