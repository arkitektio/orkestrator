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
  HomeResultsDocument,
  HomeRootDetailsDocument,
  HomeRootsDocument,
  HomePageQuery,
  HomePageQueryVariables,
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
import { RecentData } from "../components/home/RecentData";
import { HomeFilterBar, useHomeFilters } from "../components/home/HomeFilters";
import { HomeResultsProvider } from "../components/home/homeResults";
import { useLiveLenses } from "../lib/lenses/useLiveLenses";
import { HomeOverviewSidebar } from "../components/sidebars/HomeOverviewSidebar";
import { useMikroBigFileUpload } from "@/mikro/datalayer/useMikroBigFileUpload";
import { MIKRO_HELP } from "../help";

/**
 * A converter writing a series creates its whole lens, and so does a task
 * writing a mask or a table from one: those events are when a file's card
 * gains an image or a result.
 */
const LIVE_REFETCH = [HomeRootsDocument, HomeRootDetailsDocument, HomeResultsDocument];

/**
 * mikro's front door: what is new, on the whole stage. Where to go — every
 * page, with how much it holds and how much came this week — is the sidebar's
 * Overview tab.
 *
 * The newest parentless data comes first, whatever its kind: an upload as a
 * card holding the images converted out of it, an image or a table that came
 * on its own as its own card. Then pinned folders. No lenses here: a tile is
 * the dataset and opens the dataset's page. The filter row over the grid
 * narrows it by who made it, the collaboration it is in, and when it was
 * acquired or created; search and sort live on the list pages.
 */
const Page = asParamlessRoute(useHomePageQueryForRoute, ({ data }) => {
  useLiveLenses({ refetch: LIVE_REFETCH });
  const performDataLayerUpload = useMikroBigFileUpload();
  const createFile = useCreateFile();
  const { startUpload } = useUpload();
  const homeFilters = useHomeFilters();

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
        <Sidebars defaultTab="Overview">
          {/* mikro's pages live here, each with its numbers, so the stage is the data. */}
          <Sidebars.Tab label="Overview"><HomeOverviewSidebar /></Sidebars.Tab>
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
          pages={false}
          title="Mikro"
          description="Your images, the files they came from, and everything else you brought in."
        >
          {isEmpty ? (
            <HomeEmpty title="No data yet">
              Drop files anywhere on this page, or press Upload Files, to bring
              in your first data.
            </HomeEmpty>
          ) : (
            // Every tile below asks what was made from it through one query.
            <HomeResultsProvider>
              {/* The filter row belongs to the grid it narrows, not to the page. */}
              <div className="flex flex-col gap-3">
                <HomeFilterBar filters={homeFilters} />
                <RecentData filters={homeFilters.filters} onClear={homeFilters.clear} />
              </div>
              <PinnedFolders />
            </HomeResultsProvider>
          )}
        </ModuleHome>
      </UploadWrapper>
    </PageLayout>
  );
});

export default Page;
