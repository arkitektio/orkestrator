import { useDialog } from "@/core/dialogs/registry";
import { RekuestMaterializedBlok } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { Blocks, FileUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MaterializedBlokList from "../components/lists/MaterializedBlokList";
import { REKUEST_HELP } from "../help";

/**
 * The bloks people installed: what they open and use. A new one comes from a
 * template (installed there) or from a file someone exported.
 */
const Page = () => {
  const { openDialog } = useDialog();
  const navigate = useNavigate();
  return (
    <RekuestMaterializedBlok.ListPage
      help={REKUEST_HELP.materializedBloks}
      title={"Bloks"}
      description="Interfaces running on your agents: their values are live and their controls act."
      pageActions={
        <>
          <PageAction size="sm" variant="ghost" icon={<FileUp className="h-4 w-4" />} onClick={() => openDialog("installblokfile", {})}>
            Install from file…
          </PageAction>
          <PageAction alwaysShow size="sm" icon={<Blocks className="h-4 w-4" />} onClick={() => navigate("/rekuest/bloks")}>
            Templates
          </PageAction>
        </>
      }
    >
      <div className="p-3">
        <MaterializedBlokList filters={{ provided: false }} />
      </div>
    </RekuestMaterializedBlok.ListPage>
  );
};

export default Page;
