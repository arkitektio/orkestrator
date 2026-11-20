import { RekuestBlok } from "@/core/linkers";
import BlokList from "../components/lists/BlokList";
import { REKUEST_HELP } from "../help";

/** The bloks apps' agents provide: they follow the registrations and are forked, never edited. */
const Page = () => {
  return (
    <RekuestBlok.ListPage title={"App-provided Bloks"}
      description="The interfaces your apps bring along. Their agents keep them in step with what they register; fork one to make it your own." help={REKUEST_HELP.providedBloks}>
      <div className="p-3">
        <BlokList filters={{ provided: true }} />
      </div>
    </RekuestBlok.ListPage>
  );
};

export default Page;
