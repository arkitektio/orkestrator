import { RekuestBlok } from "@/core/linkers";
import BlokList from "../components/lists/BlokList";
import { REKUEST_HELP } from "../help";

/** The bloks apps' agents provide: they follow the registrations and are forked, never edited. */
const Page = () => {
  return (
    <RekuestBlok.ListPage title={"App-provided Bloks"} help={REKUEST_HELP.providedBloks}>
      <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            App-provided Bloks
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            The interfaces your apps bring along. Their agents keep them in step
            with what they register and materialize them themselves; fork one to
            make it your own.
          </p>
        </div>
      </div>
      <BlokList filters={{ provided: true }} />
    </RekuestBlok.ListPage>
  );
};

export default Page;
