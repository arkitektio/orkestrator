import { RekuestImplementation } from "@/core/linkers";
import { Ordering } from "../api/graphql";
import ImplementationList from "../components/lists/ImplementationList";
const Page = () => {
  return (
    <RekuestImplementation.ListPage title={"Implementations"}>
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-3">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your latest Implementations
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              All the data types you have created to use in actions.
            </p>
          </div>
        </div>

        <ImplementationList order={{ createdAt: Ordering.Desc }} pagination={{ limit: 20 }} />
      </div>
    </RekuestImplementation.ListPage>
  );
};

export default Page;
