import { PageLayout } from "@/components/layout/PageLayout";
import { Separator } from "@/components/ui/separator";
import { UploadWrapper } from "@/components/upload/wrapper";
import { useCreateFile } from "@/lib/mikro/hooks";

import { asParamlessRoute } from "@/app/routes/ParamlessRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { HelpSidebar } from "@/components/sidebars/help";
import { Badge } from "@/components/ui/badge";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleSearch } from "@/components/ui/collapsible-search";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
} from "@/components/ui/page-action";
import { useUpload } from "@/providers/upload/UploadProvider";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
  BarChart3,
  Database,
  Network,
  TrendingUp,
  Upload,
} from "lucide-react";
import { HookFunction } from "@/app/routes/ParamlessRoute";
import { OperationVariables, QueryHookOptions } from "@apollo/client";
import {
  ArrayDatasetOrder,
  FolderOrder,
  FileOrder,
  HomePageQuery,
  HomePageQueryVariables,
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
import FolderList from "../components/lists/FolderList";
import FileList from "../components/lists/FileList";
import ArrayDatasetList from "../components/lists/ArrayDatasetList";
import { StatisticsSidebar } from "../components/sidebars/StatisticsSidebar";
import { useMikroBigFileUpload } from "@/mikro/datalayer/useMikroBigFileUpload";
import { parseAsIsoDateTime, parseAsString, parseAsStringLiteral, useQueryState } from "@/hooks/use-search-param-state";


export interface IRepresentationScreenProps { }


const Page = asParamlessRoute(useHomePageQueryForRoute, ({ data }) => {
  const performDataLayerUpload = useMikroBigFileUpload();
  const createFile = useCreateFile();
  const { startUpload } = useUpload();

  const [createdAfter, setCreatedAfter] = useQueryState(
    "after",
    parseAsIsoDateTime
  );

  const [createdBefore, setCreatedBefore] = useQueryState(
    "before",
    parseAsIsoDateTime
  );

  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));

  const [sortField, setSortField] = useQueryState(
    "sort",
    parseAsStringLiteral(["createdAt", "name"] as const).withDefault("createdAt")
  );

  const [sortDirection, setSortDirection] = useQueryState(
    "dir",
    parseAsStringLiteral(["ASC", "DESC"] as const).withDefault("DESC")
  );

  const temporalFilter = {
    createdAfter: createdAfter ?? undefined,
    createdBefore: createdBefore ?? undefined,
  };

  const searchTerm = search.trim();
  const searchFilter = searchTerm ? { search: searchTerm } : {};

  const ordering = Ordering[sortDirection === "ASC" ? "Asc" : "Desc"];
  // Dataset/File/Folder orders are @oneOf inputs that share createdAt/name keys.
  const orderByField =
    sortField === "createdAt"
      ? ({ createdAt: ordering } as const)
      : ({ name: ordering } as const);
  const arrayDatasetOrdering: ArrayDatasetOrder[] = [orderByField];
  const fileOrdering: FileOrder[] = [orderByField];
  const folderOrdering: FolderOrder[] = [orderByField];

  const sortFieldLabels = { createdAt: "Date created", name: "Name" } as const;
  // Defaults the dashboard ships with — a tag is shown when the user diverges.
  const isCustomOrder = sortField !== "createdAt" || sortDirection !== "DESC";

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

  return (
    <PageLayout
      pageActions={
        <>
          {/* Putting data in is what this page is for: pinned, and down to
              its glyph before it would ever be pushed into the burger. */}
          <PageAction.Slot alwaysShow collapse="icon">
            <UploadDialog onFilesSelected={handleFilesSelected}>
              <PageAction icon={<Upload className="h-4 w-4" />} menuLabel="Upload Files">
                Upload Files
              </PageAction>
            </UploadDialog>
          </PageAction.Slot>

          {/* Collapsible search drives the `search` filter on every list */}
          <CollapsibleSearch
            alwaysShow
            value={search}
            onChange={(value) => setSearch(value || null)}
            placeholder="Search datasets, folders and files…"
          />

          {/* Ordering: field + direction in a dropdown, shared across lists.
              A tag surfaces the active sort whenever it differs from default. */}
          <PageAction.Slot collapse="icon" priority={-10}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionTrigger aria-label="Sort">
                  <ArrowUpDown className="h-4 w-4" />
                  <ActionLabel>
                    Sort
                    {isCustomOrder && (
                      <Badge variant="secondary" className="gap-1">
                        {sortFieldLabels[sortField]}
                        {sortDirection === "ASC" ? (
                          <ArrowUpWideNarrow />
                        ) : (
                          <ArrowDownWideNarrow />
                        )}
                      </Badge>
                    )}
                  </ActionLabel>
                </ActionTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sortField}
                  onValueChange={(value) =>
                    setSortField(value as "createdAt" | "name")
                  }
                >
                  <DropdownMenuRadioItem value="createdAt">
                    Date created
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Direction</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sortDirection}
                  onValueChange={(value) =>
                    setSortDirection(value as "ASC" | "DESC")
                  }
                >
                  <DropdownMenuRadioItem value="DESC">
                    Descending
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ASC">
                    Ascending
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </PageAction.Slot>

          {/* The widest control here, and the one least often wanted: it goes
              first, and altogether — a range picker has no useful burger row. */}
          <PageAction.Slot collapse="hide" priority={-20}>
            <DateTimeRangePicker
              initialDateFrom={createdAfter ?? undefined}
              initialDateTo={createdBefore ?? undefined}
              onUpdate={({ range }) => {
                setCreatedAfter(range.from || null);
                setCreatedBefore(range.to || null);
              }}
            />
          </PageAction.Slot>
        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Statistics"><StatisticsSidebar /></Sidebars.Tab>
          <Sidebars.Tab label="Help"><HelpSidebar /></Sidebars.Tab>
        </Sidebars>
      }
      title="Home"
    >



      <UploadWrapper
        uploadFile={performDataLayerUpload}
        createFile={createFile}
      >
        {data?.arrayDatasets?.length == 0 && data.files.length == 0 ? (
          <div className="min-h-full w-full  flex items-center justify-center rounded-lg">
            <div className="max-w-4xl mx-auto text-center px-6 py-16">
              {/* Hero Section */}
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-6 ">
                    <Database className="h-16 w-16 text-primary" />
                  </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Welcome to Mikro
                  </span>
                </h1>

                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  Your powerful data visualization and knowledge graph platform.
                  Create your first graph to start exploring and organizing your
                  data relationships.
                </p>
              </div>




              {/* Action Section */}
              <div className="mt-12 space-y-6">
                <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Visualize Relationships</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    <span>Build Connections</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Analyze Data</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 p-3">
            <CardHeader className="px-0">
              <CardTitle className="text-3xl flex items-center gap-3">
                <Database className="h-8 w-8 text-primary" />
                Your Data
              </CardTitle>
              <CardDescription className="text-lg">
                Your recently uploaded and managed data
              </CardDescription>
            </CardHeader>

            <ArrayDatasetList
              filters={{ notDerived: true, ...temporalFilter, ...searchFilter }}
              ordering={arrayDatasetOrdering}
            />
            <FolderList
              filters={{ parentless: true, ...temporalFilter, ...searchFilter }}
              ordering={folderOrdering}
            />
            <Separator className="my-4" />
            <FileList
              filters={{ ...temporalFilter, ...searchFilter }}
              ordering={fileOrdering}
            />
          </div>
        )}
      </UploadWrapper>
    </PageLayout>
  );
});

export default Page;
