import { Guard } from "@/app/Arkitekt";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { ProfileSectionFrame } from "@/lib/profile/ProfileSections";
import { ProfileRow, ProfileRows } from "@/lib/profile/rows";
import type { ProfileContext, ProfileSection } from "@/lib/profile/section";
import { MikroArrayDataset, MikroFile, MikroFolder } from "@/linkers";
import { Boxes, File, Folder, Images } from "lucide-react";
import {
  Ordering,
  useGetArrayDatasetsQuery,
  useGetFilesQuery,
  useGetFoldersQuery,
} from "../api/graphql";
import { formatBytes } from "../specs";

/** Their newest datasets, as the thumbnails the dashboard widget draws. */
const LatestImages = ({ sub }: ProfileContext) => {
  const resolve = useResolve();
  const { data } = useGetArrayDatasetsQuery({
    variables: {
      filters: { owner: sub },
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit: 8 },
    },
    fetchPolicy: "cache-and-network",
  });

  const datasets = data?.arrayDatasets ?? [];
  if (datasets.length === 0) return null;

  return (
    <ProfileSectionFrame more={`/mikro/peerhome/${sub}`}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
        {datasets.map((dataset) => (
          <MikroArrayDataset.Smart key={dataset.id} object={dataset}>
            <MikroArrayDataset.DetailLink
              object={dataset}
              className={() => "group block cursor-pointer"}
            >
              <Card className="relative aspect-square overflow-hidden rounded-md bg-muted">
                {dataset.latestSnapshot?.store.key ? (
                  <Image
                    src={resolve(dataset.latestSnapshot.store.key)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Boxes className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1.5 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-[10px] text-white">{dataset.name}</p>
                </div>
              </Card>
            </MikroArrayDataset.DetailLink>
          </MikroArrayDataset.Smart>
        ))}
      </div>
    </ProfileSectionFrame>
  );
};

/** Their newest folders, then their newest files. */
const RecentFiles = ({ sub }: ProfileContext) => {
  const { data: folders } = useGetFoldersQuery({
    variables: {
      filters: { owner: sub },
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit: 4 },
    },
    fetchPolicy: "cache-and-network",
  });
  const { data: files } = useGetFilesQuery({
    variables: {
      filters: { owner: sub },
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit: 6 },
    },
    fetchPolicy: "cache-and-network",
  });

  // A user's default folder is plumbing, not something they made.
  const folderRows = (folders?.folders ?? []).filter((folder) => !folder.isDefault);
  const fileRows = files?.files ?? [];
  if (folderRows.length === 0 && fileRows.length === 0) return null;

  return (
    <ProfileSectionFrame more={`/mikro/peerhome/${sub}`}>
      <ProfileRows>
        {folderRows.map((folder) => (
          <MikroFolder.Smart key={folder.id} object={folder}>
            <MikroFolder.DetailLink object={folder} className="block hover:text-primary">
              <ProfileRow icon={<Folder />} title={folder.name} />
            </MikroFolder.DetailLink>
          </MikroFolder.Smart>
        ))}
        {fileRows.map((file) => (
          <MikroFile.Smart key={file.id} object={file}>
            <MikroFile.DetailLink object={file} className="block hover:text-primary">
              <ProfileRow icon={<File />} title={file.name} meta={file.size != null ? formatBytes(file.size) : undefined} />
            </MikroFile.DetailLink>
          </MikroFile.Smart>
        ))}
      </ProfileRows>
    </ProfileSectionFrame>
  );
};

export const MIKRO_PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: "mikro.latest-images",
    module: "mikro",
    title: "Latest images",
    icon: Images,
    priority: 10,
    Guard: Guard.Mikro,
    Component: LatestImages,
  },
  {
    id: "mikro.recent-files",
    module: "mikro",
    title: "Files & folders",
    icon: Folder,
    priority: 20,
    Guard: Guard.Mikro,
    Component: RecentFiles,
  },
];
