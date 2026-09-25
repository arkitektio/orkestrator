import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Badge } from "@/components/ui/badge";
import { UploadWrapper } from "@/components/upload/wrapper";
import { useMikroBigFileUpload } from "@/mikro/datalayer/useMikroBigFileUpload";
import { useCreateFile } from "@/mikro/api/hooks";
import { MikroFolder } from "@/linkers";
import { useState } from "react";
import { useGetFolderQuery } from "../api/graphql";
import {
  FolderExplorerActions,
  FolderListExplorer,
  useFolderExplorer,
} from "../components/explorer/FolderListExplorer";
import { FolderTableExplorer } from "../components/explorer/FolderTableExplorer";
import { FolderInfoSidebar } from "../components/sidebars/FolderInfoSidebar";

export type ViewType = "list" | "icons";
 const TPage = asDetailQueryRoute(useGetFolderQuery, ({ data }) => {
  const [viewType, setViewType] = useState<ViewType>("icons");
  // Before the branch: the table view used to return above this call, so
  // switching views changed the hook count and React tore the page down.
  const explorerState = useFolderExplorer(data.folder);
  // Files dropped from the OS land in THIS folder, not the default one — the
  // `fromFileLike` mutation takes the folder id, so nothing has to be moved
  // afterwards. Hooks before the branch, for the reason above.
  const performUpload = useMikroBigFileUpload();
  const createFile = useCreateFile(data.folder.id);

  if (viewType === "list") {
    return <FolderTableExplorer folder={data.folder} setView={setViewType} />;
  }

  const folder = data.folder;
  const itemCount = explorerState.filteredAndSortedData.length;

  return (
    <MikroFolder.ModelPage
      title={folder?.name}
      object={folder}
      // The contents fill the middle, everything *about* the folder lives in the
      // rail — the same split as the dataset pages. Only the icons view gets it:
      // the `list` branch above returns `FolderTableExplorer` without a
      // `ModelPage` at all, so it has no rail to hang a tab on.
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <FolderInfoSidebar folder={folder} />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
      // New folder, view mode, refresh and paging belong to the page, not to
      // the list — the explorer's own row keeps only search, type and sort.
      pageActions={
        <FolderExplorerActions folder={folder} explorerState={explorerState} />
      }
    >
      <div className="flex h-full w-full flex-col gap-2">
        {/* The breadcrumb trail above only knows the route (".../folders/5"),
            so without this the page never says which folder you are in. Same
            title treatment as the dataset pages. */}
        <div className="flex flex-col gap-0.5">
          {folder.parent && (
            <MikroFolder.DetailLink
              object={folder.parent}
              className="w-fit truncate text-xs text-muted-foreground hover:text-foreground"
            >
              ← {folder.parent.name}
            </MikroFolder.DetailLink>
          )}
          <MikroFolder.DetailLink
            object={folder}
            className="ellipsis truncate break-all text-3xl font-semibold leading-tight text-ellipsis"
          >
            {folder.name}
          </MikroFolder.DetailLink>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {folder.description && <span className="truncate">{folder.description}</span>}
            <Badge variant="outline" className="text-[0.625rem]">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>

        {/* `min-h-0` so the explorer's own scroll container is what scrolls,
            rather than the page growing and taking the title off screen. */}
        <div className="min-h-0 flex-1">
          {/* Dropping files from the OS uploads them into this folder. The
              explorer's own drop target only accepts structures, so a file
              drag falls through to this one — innermost-wins never applies,
              the two never both accept the same drag. */}
          <UploadWrapper uploadFile={performUpload} createFile={createFile}>
            <FolderListExplorer
              folder={folder}
              setView={setViewType}
              explorerState={explorerState}
            />
          </UploadWrapper>
        </div>
      </div>
    </MikroFolder.ModelPage>
  );
});


export default TPage;
