import { RekuestSpace } from "@/core/linkers";
import SpacesList from "../components/lists/SpacesList";
import { useCreateSpaceMutation } from "../api/graphql";
import { PageAction } from "@/core/components/ui/page-action";

const Page = () => {

  const [create] = useCreateSpaceMutation({
    refetchQueries: ["Spaces"],
  })



  return (
    <RekuestSpace.ListPage title={"Spaces"} pageActions={
      <PageAction
        alwaysShow
        onClick={() => create({ variables: { input: { name: "New Space " + Date.now() } } })}
      >
        Create
      </PageAction>
    }>
      <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Spaces
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            Panels are UI elements that can be composed to dashboards, just
            browse them here and drag them to your dashboard.
          </p>
        </div>
      </div>
      <SpacesList />
    </RekuestSpace.ListPage>
  );
};

export default Page;
