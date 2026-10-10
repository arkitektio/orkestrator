import { PageLayout } from "@/core/layout/PageLayout";
import { Separator } from "@/core/ui/separator";
import { UploadWrapper } from "@/core/datalayer/upload/wrapper";
import { useCreateFile } from "@/mikro/api/hooks";

import { asParamlessRoute } from "@/core/layout/routes/ParamlessRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { HelpSidebar } from "@/core/layout/help";
import { Badge } from "@/core/ui/badge";
import { CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { DateTimeRangePicker } from "@/core/ui/date-time-range-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
} from "@/core/ui/page-action";
import { useUpload } from "@/core/datalayer/UploadProvider";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
  Database,
  Upload,
} from "lucide-react";
import { HookFunction } from "@/core/layout/routes/ParamlessRoute";
import { OperationVariables, QueryHookOptions } from "@apollo/client";
import {
  ChartOrder,
  FolderOrder,
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
import { ChartSectionList } from "../components/lists/ChartList";
import FolderList from "../components/lists/FolderList";
import FileList from "../components/lists/FileList";
import { DataLensList, LensSectionList } from "../components/lists/LensList";
import { useLiveLenses } from "../lib/lenses/useLiveLenses";
import { StatisticsSidebar } from "../components/sidebars/StatisticsSidebar";
import { useMikroBigFileUpload } from "@/mikro/datalayer/useMikroBigFileUpload";
import { parseAsIsoDateTime, parseAsString, parseAsStringLiteral, useQueryState } from "@/core/util/hooks/use-search-param-state";
import { MIKRO_HELP } from "../help";


export interface IRepresentationScreenProps { }


const Page = asParamlessRoute(useHomePageQueryForRoute, ({ data }) => {
  // Both lens grids follow the server: an upload adds a whole lens, a task
  // cutting crops fills the selections in as it runs.
  useLiveLenses();
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
  // Lens/File/Folder orders are @oneOf inputs that share createdAt/name keys.
  const orderByField =
    sortField === "createdAt"
      ? ({ createdAt: ordering } as const)
      : ({ name: ordering } as const);
  const fileOrdering: FileOrder[] = [orderByField];
  const folderOrdering: FolderOrder[] = [orderByField];
  const chartOrdering: ChartOrder[] = [orderByField];
  const lensOrdering: LensOrder[] = [orderByField];

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
            placeholder="Search data, folders and files…"
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
      help={MIKRO_HELP.home}
    >



      <UploadWrapper
        uploadFile={performDataLayerUpload}
        createFile={createFile}
      >
        {data?.lenses.length == 0 && data.files.length == 0 ? (
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
                  Your images, tables, meshes and annotations in one place.
                  Drop files anywhere on this page, or press Upload Files, to
                  bring in your first data.
                </p>
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

            {/* Pulled up against the header: the pills read as part of it,
                not as one more list. */}
            <PinnedFolders className="-mt-4" />

            {/* The data, as the lenses that select all of it: one tile per
                dataset, table, mesh, network and annotation collection. A tile
                IS its whole lens, so selecting tiles here is how a task is
                handed its input. `LensFilter` has no `notDerived` yet, so
                derived arrays are listed too. */}
            <DataLensList
              filters={{ sliced: false, ...temporalFilter, ...searchFilter }}
              ordering={lensOrdering}
            />
            {/* What people and tasks cut out of that data, newest first. */}
            <LensSectionList
              title="Selections"
              filters={{ sliced: true, ...temporalFilter, ...searchFilter }}
              ordering={lensOrdering}
            />
            <FolderList
              filters={{ parentless: true, ...temporalFilter, ...searchFilter }}
              ordering={folderOrdering}
            />
            {/* ChartFilter has no created-range, so under a date filter the
                charts step aside rather than ignore it. */}
            {!createdAfter && !createdBefore && (
              <ChartSectionList filters={searchFilter} ordering={chartOrdering} />
            )}
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
