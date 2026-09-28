import { RekuestBlok } from "@/core/linkers";
import BlokList from "../components/lists/BlokList";

const Page = () => {


  return (
    <RekuestBlok.ListPage
      title={"Bloks"}
    >
      <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Bloks
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            Bloks are UI elements that can be composed to dashboards, just like
            LEGO blocks. They can provide some more advanced functionality than
            widgets, and can display state to control robotic devices.
          </p>
        </div>
      </div>
      <BlokList />
    </RekuestBlok.ListPage>
  );
};

export default Page;
