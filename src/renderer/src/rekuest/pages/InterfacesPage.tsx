import { RekuestInterface } from "@/core/linkers";
import InterfaceList from "../components/lists/InterfaceList";
const Page = () => {
  return (
    <RekuestInterface.ListPage title={"Interfaces"}>
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-3">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your Interfaces
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              All the data types you have created to use in actions.
            </p>
          </div>
        </div>

        <InterfaceList />
      </div>
    </RekuestInterface.ListPage>
  );
};

export default Page;
