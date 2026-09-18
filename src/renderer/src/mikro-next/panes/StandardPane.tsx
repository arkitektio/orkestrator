import { ListRender } from '@/components/layout/ListRender'
import { SidebarLayout } from '@/components/layout/SidebarLayout'
import { FancyInput } from '@/components/ui/fancy-input'
import { DroppableNavLink } from '@/components/ui/link'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PaneLink, SidePaneGroup, SidePaneNav } from '@/components/ui/sidepane'
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
  const { data } = useMembersQuery()

  return (
    <SidePaneNav columns={3}>
      <SidePaneGroup title="Data">
        <PaneLink to="/mikro/home">
          <Home />
          Dashboard
        </PaneLink>
        <PaneLink to="/mikro/scenes">
          <File />
          Scenes
        </PaneLink>
        <PaneLink to="/mikro/arraydatasets">
          <Grid3x3 />
          Array Datasets
        </PaneLink>
        <PaneLink to="/mikro/tabledatasets">
          <Table2 />
          Table Datasets
        </PaneLink>
        <PaneLink to="/mikro/coordinatesystems">
          <Axis3d />
          Coordinate Systems
        </PaneLink>
        <PaneLink to="/mikro/annotations">
          <PenTool />
          Annotations
        </PaneLink>
        <PaneLink to="/mikro/folders">
          <Folder />
          Folders
        </PaneLink>
        <PaneLink to="/mikro/files">
          <File />
          Files
        </PaneLink>
      </SidePaneGroup>

      {/* One link per spec, generated from the catalogue so the nav and the
          pages behind it cannot drift apart. */}
      <SidePaneGroup title={<NavLink to="/mikro/arraydatasets">By kind</NavLink>}>
        {ADATASET_SPECS.map((entry) => (
          <PaneLink key={entry.slug} to={arrayDatasetSpecLink(entry.slug)}>
            <entry.icon />
            {entry.label}
          </PaneLink>
        ))}
      </SidePaneGroup>

      {data?.members.map((i) => (
        <SidePaneGroup
          key={i.user.sub}
          limit={5}
          moreTo={`/mikro/peerhome/${i.user.sub}`}
          title={
            <DroppableNavLink to={`/mikro/peerhome/${i.user.sub}`}>
              <JustUsername sub={i.user.sub} />
            </DroppableNavLink>
          }
        >
          {i.folders.map((folder) => (
            <PaneLink to={`/mikro/folders/${folder.id}`} key={folder.id}>
              <Folder />
              <span className="truncate">{folder.name}</span>
            </PaneLink>
          ))}
        </SidePaneGroup>
      ))}
    </SidePaneNav>
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
