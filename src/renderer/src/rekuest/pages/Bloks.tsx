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
      description="Bloks you made or installed: interfaces written in BSX that draw on your agents."
      help={REKUEST_HELP.customBloks}
      pageActions={
        <PageAction alwaysShow size="sm" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => navigate("/rekuest/bloks/new")}>
          New Blok
        </PageAction>
      }
    >
      <div className="p-3">
        <BlokList filters={{ provided: false }} />
      </div>
    </RekuestBlok.ListPage>
  );
};

export default Page;
