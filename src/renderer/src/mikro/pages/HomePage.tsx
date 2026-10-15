import { PageLayout } from "@/core/layout/PageLayout";
import { UploadWrapper } from "@/core/datalayer/upload/wrapper";
import { useCreateFile } from "@/mikro/api/hooks";

import { asParamlessRoute } from "@/core/layout/routes/ParamlessRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { HelpSidebar } from "@/core/layout/help";
import { PageAction } from "@/core/ui/page-action";
import { useUpload } from "@/core/datalayer/UploadProvider";
import { Upload } from "lucide-react";
import { HomeEmpty, ModuleHome } from "@/core/layout/ModuleHome";
import { HookFunction } from "@/core/layout/routes/ParamlessRoute";
import { OperationVariables, QueryHookOptions } from "@apollo/client";
import {
  FileOrder,
  HomePageQuery,
  HomePageQueryVariables,
  LensOrder,
  Ordering,
  useHomePageQuery,
} from "../api/graphql";

// `useHomePageQuery`'s wrapped `useQuery` (mikro's `nextFetchPolicy` default)
// pins its options type to the exact (variable-less) query shape, which is
// narrower than `asParamlessRoute`'s generic `HookFunction`; this adapter
// bridges the two without changing the actual (variable-less) query call.
const useHomePageQueryForRoute: HookFunction<HomePageQuery, OperationVariables> = (
  options,
) =>
  useHomePageQuery(
    options as unknown as QueryHookOptions<HomePageQuery, HomePageQueryVariables>,
  ) as unknown as ReturnType<HookFunction<HomePageQuery, OperationVariables>>;
import { UploadDialog } from "../components/dialogs/UploadDialog";
import { PinnedFolders } from "../components/folder/PinnedFolders";
import FileList from "../components/lists/FileList";
import { DataLensList } from "../components/lists/LensList";
import { useLiveLenses } from "../lib/lenses/useLiveLenses";
import { StatisticsSidebar } from "../components/sidebars/StatisticsSidebar";
import { useMikroBigFileUpload } from "@/mikro/datalayer/useMikroBigFileUpload";
import { MIKRO_HELP } from "../help";

/** Newest first: the dashboard shows what just arrived, the list pages the rest. */
const RECENT_LENSES: LensOrder[] = [{ createdAt: Ordering.Desc }];
const RECENT_FILES: FileOrder[] = [{ createdAt: Ordering.Desc }];
/**
 * The whole lens of every container: one tile per dataset, table, mesh, …
 * Only what was brought in: a dataset computed from another (a mask, a
 * result) is reached from its source, not listed here.
 */
const RECENT_DATA = { sliced: false, notDerived: true } as const;

/**
 * mikro's front door: where to go, then what is new.
 *
 * It used to be a browser of everything — search, sort and a date range over
 * every list. Those live on the list pages now, which this page links to
 * first (the same pages as the right-click card on mikro's rail tile). What
 * stays is the short list: pinned folders, the newest data, the newest files.
 * Each list's title opens its full page.
 */
const Page = asParamlessRoute(useHomePageQueryForRoute, ({ data }) => {
  // The data grid follows the server: an upload adds a whole lens.
  useLiveLenses();
  const performDataLayerUpload = useMikroBigFileUpload();
  const createFile = useCreateFile();
  const { startUpload } = useUpload();

  const handleFilesSelected = (files: File[]) => {
    files.forEach((file) => {
      startUpload(
        file,
        async (file, { id, onProgress, signal }) => {
          return await performDataLayerUpload(file, {
            id,
            signal,
            onProgress,
          });
        },
        async (file, key) => {
          return await createFile(file, key);
        }
      ).catch((e) => {
        console.error("Upload error:", e);
      });
    });
  };

  const isEmpty = data?.lenses.length == 0 && data.files.length == 0;

  return (
    <PageLayout
      pageActions={
        // Putting data in is what this page is for: pinned, and down to its
        // glyph before it would ever be pushed into the burger.
        <PageAction.Slot alwaysShow collapse="icon">
          <UploadDialog onFilesSelected={handleFilesSelected}>
            <PageAction icon={<Upload className="h-4 w-4" />} menuLabel="Upload Files">
              Upload Files
            </PageAction>
          </UploadDialog>
        </PageAction.Slot>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Statistics"><StatisticsSidebar /></Sidebars.Tab>
          <Sidebars.Tab label="Help"><HelpSidebar /></Sidebars.Tab>
        </Sidebars>
      }
      title="Home"
      help={MIKRO_HELP.home}
    >
      <UploadWrapper
        uploadFile={performDataLayerUpload}
        createFile={createFile}
      >
        <ModuleHome
          moduleKey="mikro"
          title="Mikro"
          description="Your images, tables, meshes and annotations in one place."
        >
          {isEmpty ? (
            <HomeEmpty title="No data yet">
              Drop files anywhere on this page, or press Upload Files, to bring
              in your first data.
            </HomeEmpty>
          ) : (
            <>
              <PinnedFolders />
              {/* A tile IS its whole lens, so selecting tiles here is how a
                  task is handed its input. */}
              <DataLensList
                title="Recent data"
                filters={RECENT_DATA}
                ordering={RECENT_LENSES}
                defaultLimit={12}
              />
              <FileList title="Recent files" ordering={RECENT_FILES} defaultLimit={6} />
            </>
          )}
        </ModuleHome>
      </UploadWrapper>
    </PageLayout>
  );
});

export default Page;
