import { ListRender } from '@/components/layout/ListRender'
import { SidebarLayout } from '@/components/layout/SidebarLayout'
import { FancyInput } from '@/components/ui/fancy-input'
import { DroppableNavLink } from '@/components/ui/link'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { PaneLink, SidePaneGroup } from '@/components/ui/sidepane'
import { Toggle } from '@/components/ui/toggle'
import { JustUsername } from '@/lok-next/components/UserAvatar'
import { useDebounce } from '@uidotdev/usehooks'
import { ArrowDown, Axis3d, File, Folder, Grid3x3, Home, PenTool, Table2 } from 'lucide-react'
import * as React from 'react'
import { NavLink } from 'react-router-dom'
import { GlobalSearchQueryVariables, useGlobalSearchQuery, useMembersQuery } from '../api/graphql'
import { ADATASET_SPECS, arrayDatasetSpecLink } from '../specs'
import ArrayDatasetCard from '../components/cards/ArrayDatasetCard'
import FileCard from '../components/cards/FileCard'
import FolderCard from '../components/cards/FolderCard'

export const NavigationPane = () => {
  const { data, error } = useMembersQuery()

  return (
    <div className="flex-1 flex-col">
      <nav className="grid items-start px-1 text-xs font-medium lg:px-2">
        <SidePaneGroup title="Explore">
          <PaneLink
            to="/mikro/home"
            className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </PaneLink>
        </SidePaneGroup>

        <SidePaneGroup title="Data">
          <PaneLink to="/mikro/arraydatasets" className="flex gap-3 w-full hover:text-primary">
            <Grid3x3 className="h-4 w-4" />
            Array Datasets
          </PaneLink>
          <PaneLink to="/mikro/coordinatesystems" className="flex gap-3 w-full hover:text-primary">
            <Axis3d className="h-4 w-4" />
            Coordinate Systems
          </PaneLink>
          <PaneLink to="/mikro/tabledatasets" className="flex gap-3 w-full hover:text-primary">
            <Table2 className="h-4 w-4" />
            Table Datasets
          </PaneLink>
          <PaneLink to="/mikro/annotations" className="flex gap-3 w-full hover:text-primary">
            <PenTool className="h-4 w-4" />
            Annotations
          </PaneLink>
          <PaneLink to="/mikro/folders" className="flex gap-3 w-full hover:text-primary">
            <Folder className="h-4 w-4" />
            Folders
          </PaneLink>
          <PaneLink to="/mikro/files" className="flex gap-3 w-full hover:text-primary">
            <File className="h-4 w-4" />
            Files
          </PaneLink>
          <PaneLink to="/mikro/scenes" className="flex gap-3 w-full hover:text-primary">
            <File className="h-4 w-4" />
            Scenes
          </PaneLink>
        </SidePaneGroup>

        {/* One section per spec, generated from the catalogue so the sidebar and
            the pages behind it cannot drift apart. The header is the unfiltered
            list — "all of them" — and each link narrows it to one spec. */}
        <SidePaneGroup
          title={
            <NavLink
              to="/mikro/arraydatasets"
              className="text-muted-foreground text-xs font-semibold uppercase hover:text-primary"
            >
              Array Datasets
            </NavLink>
          }
        >
          {ADATASET_SPECS.map((entry) => (
            <PaneLink
              key={entry.slug}
              to={arrayDatasetSpecLink(entry.slug)}
              className="flex gap-3 w-full hover:text-primary"
            >
              <entry.icon className="h-4 w-4" />
              {entry.label}
            </PaneLink>
          ))}
        </SidePaneGroup>

        <Separator className="my-3" />

        {data?.members.map((i) => (
          <React.Fragment key={i.user.sub}>
            <SidePaneGroup
              title={
                <DroppableNavLink
                  to={`/mikro/peerhome/${i.user.sub}`}
                  className="text-muted-foreground text-xs font-semibold uppercase "
                >
                  <JustUsername sub={i.user.sub} />
                </DroppableNavLink>
              }
            >
              {i.folders.map((folder) => (
                <DroppableNavLink
                  to={`/mikro/folders/${folder.id}`}
                  key={folder.id}
                  className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
                >
                  <Folder className="h-4 w-4" />
                  {folder.name}
                </DroppableNavLink>
              ))}
            </SidePaneGroup>
          </React.Fragment>
        ))}
        {error && <div>Error: {JSON.stringify(error)}</div>}
      </nav>
    </div>
  )
}

const Pane: React.FunctionComponent = () => {
  const [search, setSearch] = React.useState('')
  const [noArrayDatasets, setNoArrayDatasets] = React.useState(false)
  const [noFiles, setNoFiles] = React.useState(false)
  const [noFolders, setNoFolders] = React.useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const variables: GlobalSearchQueryVariables = {
    search: debouncedSearch,
    noArrayDatasets,
    noFiles,
    noFolders,
    pagination: {
      limit: 10
    }
  }

  const { data, refetch } = useGlobalSearchQuery({ variables })

  React.useEffect(() => {
    refetch(variables)
  }, [debouncedSearch, noArrayDatasets, noFiles, noFolders])

  const searchBar = (
    <div className="w-full flex flex-row">
      <Popover>
        <PopoverAnchor asChild>
          <div className="h-full w-full relative flex flex-row">
            <FancyInput
              placeholder="Search..."
              type="string"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-grow h-full bg-background text-foreground w-full"
            />
            <PopoverTrigger className="absolute right-0 top-[50%] translate-y-[-50%]  translate-x-[-50%] text-muted/20">
              <ArrowDown />
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent>
          <div className="flex flex-col gap-2">
            <Toggle
              label="No Datasets"
              name="noArrayDatasets"
              pressed={noArrayDatasets}
              onPressedChange={setNoArrayDatasets}
            >
              Exclude Datasets
            </Toggle>
            <Toggle label="No Files" name="noFiles" pressed={noFiles} onPressedChange={setNoFiles}>
              Exclude Files
            </Toggle>
            <Toggle
              label="No Folders"
              name="noFolders"
              pressed={noFolders}
              onPressedChange={setNoFolders}
            >
              Exclude Folders
            </Toggle>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )

  return (
    <SidebarLayout searchBar={searchBar}>
      {search.trim() === '' ? (
        <NavigationPane />
      ) : (
        <div className="h-full">
          <ListRender array={data?.arrayDatasets}>
            {(item, i) => <ArrayDatasetCard item={item} key={i} />}
          </ListRender>
          <ListRender array={data?.files}>
            {(item, i) => <FileCard item={item} key={i} />}
          </ListRender>
          <ListRender array={data?.folders}>
            {(item, i) => <FolderCard item={item} key={i} />}
          </ListRender>
        </div>
      )}
    </SidebarLayout>
  )
}

export default Pane
