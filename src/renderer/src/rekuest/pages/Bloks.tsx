import { RekuestBlok } from "@/core/linkers";
import { BlokOriginToggle, useBlokOrigin } from "../components/BlokOriginToggle";
import BlokList from "../components/lists/BlokList";
import { REKUEST_HELP } from "../help";

const Page = () => {
  const { origin, setOrigin, provided } = useBlokOrigin();

  return (
    <RekuestBlok.ListPage
      title={"Bloks"}
      help={REKUEST_HELP.bloks}
      pageActions={<BlokOriginToggle origin={origin} setOrigin={setOrigin} />}
    >
      <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Bloks
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            Bloks are UI elements that can be composed to dashboards, just like
            LEGO blocks. They can provide some more advanced functionality than
            widgets, and can display state to control robotic devices. An app's
            agents provide some; fork one to make it your own.
          </p>
        </div>
      </div>
      <BlokList filters={provided === undefined ? undefined : { provided }} />
    </RekuestBlok.ListPage>
  );
};

export default Page;
