import { useDialog } from "@/core/dialogs/registry";
import { RekuestBlok } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { FilePlus2, FileUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BlokList from "../components/lists/BlokList";
import { REKUEST_HELP } from "../help";

/** The templates people made, installed or forked: theirs to edit, install and delete. */
const Page = () => {
  const navigate = useNavigate();
  const { openDialog } = useDialog();
  return (
    <RekuestBlok.ListPage
      title={"Blok Templates"}
      description="What bloks are made of: interfaces written in BSX. Install one to make a blok that runs on your agents."
      help={REKUEST_HELP.customBloks}
      pageActions={
        <>
        <PageAction size="sm" variant="ghost" icon={<FileUp className="h-4 w-4" />} onClick={() => openDialog("installblokfile", {})}>
          Install from file…
        </PageAction>
        <PageAction alwaysShow size="sm" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => navigate("/rekuest/bloks/new")}>
          New Template
        </PageAction>
        </>
      }
    >
      <div className="p-3">
        <BlokList filters={{ provided: false }} />
      </div>
    </RekuestBlok.ListPage>
  );
};

export default Page;
