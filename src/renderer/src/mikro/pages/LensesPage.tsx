import { MikroLens } from "@/core/linkers";
import { useLensFilterBar } from "../components/filter/LensFilterBar";
import LensList from "../components/lists/LensList";
import { useLiveLenses } from "../lib/lenses/useLiveLenses";

/**
 * Every lens, of every kind: the selections people and tasks cut out of
 * arrays, tables, sparse matrices, meshes, networks and annotation
 * collections. Newest first, since a lens is most often looked for right after
 * something made it.
 *
 * The list chrome (search, kind, sort, dates) lives in the page actions; the
 * list follows the server live, so a task cutting crops fills it in as it runs.
 */
const Page = () => {
  const { filters, ordering, actions, kind } = useLensFilterBar();
  useLiveLenses({ kind: kind ?? undefined });

  return (
    <MikroLens.ListPage title="Lenses" pageActions={actions}>
      <div className="p-3">
        <LensList defaultLimit={40} filters={filters} ordering={ordering} />
      </div>
    </MikroLens.ListPage>
  );
};

export default Page;
