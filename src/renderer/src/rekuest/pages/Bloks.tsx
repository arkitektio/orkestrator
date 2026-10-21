import { RekuestBlok } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { FilePlus2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BlokList from "../components/lists/BlokList";
import { REKUEST_HELP } from "../help";

/** The bloks people made or installed: theirs to edit, materialize and delete. */
const Page = () => {
  const navigate = useNavigate();
  return (
    <RekuestBlok.ListPage
      title={"Custom Bloks"}
      help={REKUEST_HELP.customBloks}
      pageActions={
        <PageAction alwaysShow size="sm" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => navigate("/rekuest/bloks/new")}>
          New Blok
        </PageAction>
      }
    >
      <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Custom Bloks
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            Bloks are UI elements that can be composed to dashboards, just like
            LEGO blocks. These are the ones you made, installed from a repository
            or forked from an app: yours to change and to materialize with any
            agents.
          </p>
        </div>
      </div>
      <BlokList filters={{ provided: false }} />
    </RekuestBlok.ListPage>
  );
};

export default Page;
