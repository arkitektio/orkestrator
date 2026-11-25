import { MikroMeshCollection } from "@/core/linkers";
import MeshCollectionList from "../components/lists/MeshCollectionList";
import { MIKRO_HELP } from "../help";

const Page = () => (
  <MikroMeshCollection.ListPage title="Mesh collections" help={MIKRO_HELP.meshCollections}>
    <div className="p-3">
      <MeshCollectionList defaultLimit={40} />
    </div>
  </MikroMeshCollection.ListPage>
);

export default Page;
