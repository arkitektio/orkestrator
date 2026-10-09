import { asDetailQueryRoute } from '@/core/layout/routes/DetailQueryRoute'
import { useDialog } from '@/core/dialogs/registry'
import { MikroArrayDataset } from '@/core/linkers'
import { Button } from '@/core/ui/button'
import { Plus } from 'lucide-react'
import { useGetArrayDatasetQuery } from '../api/graphql'
import LensCard from '../components/cards/LensCard'
import { MoveToFolderButton } from '../components/folder/MoveToFolderButton'
import { DatasetFacts, DatasetLineage } from '../components/sidebars/DatasetInfoSidebar'
import { MIKRO_HELP } from '../help'

/**
 * One array dataset, as what it is: a container.
 *
 * A dataset is not looked at or processed directly — a LENS of it is: the lens
 * that selects all of it, or one that cuts a part out. So this page does not
 * draw the data. It leads with the dataset's lenses, each a tile that opens
 * that lens' viewer (`LensPage`), and is where a new one is cut. Under them is
 * everything that is true of the dataset as a whole and of no lens in
 * particular: what it is, where it is filed, where it came from, what was
 * computed from it, and its files.
 *
 * The page's one object button acts on the DATASET (file it, delete it,
 * calibrate it). Running something on its data is done from a lens.
 */
export const ArrayDatasetPage = asDetailQueryRoute(useGetArrayDatasetQuery, ({ data }) => {
  const dataset = data.arrayDataset
  const { openDialog } = useDialog()

  return (
    <MikroArrayDataset.ModelPage
      object={dataset}
      help={MIKRO_HELP.arrayDataset}
      title={dataset.name}
      actions={<MikroArrayDataset.Actions object={dataset} />}
      pageActions={
        <>
          {/* `folder` is nullable and the null is meaningful — a dataset nobody
              filed reads "Unfiled", which is not the same as not knowing. */}
          <MoveToFolderButton
            subject={{ kind: 'arrayDataset', ids: [dataset.id] }}
            currentFolder={dataset.folder ?? null}
          />
          <MikroArrayDataset.ObjectButton alwaysShow object={dataset}>
            Dataset
          </MikroArrayDataset.ObjectButton>
        </>
      }
    >
      <div className="flex flex-col gap-8 p-6">
        <section className="flex flex-col gap-3">
          <div className="flex flex-row items-center justify-between gap-2">
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold">Lenses</h2>
              <p className="text-xs text-muted-foreground">
                Open a lens to view it or run a task on it.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openDialog('createlens', { dataset: dataset.id }, { size: 'medium' })}
            >
              <Plus className="mr-2 h-4 w-4" />
              New lens
            </Button>
          </div>

          {/* The whole array first: it is the lens every dataset has, and the
              one most people came for. Then every part cut out of it. */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
            {dataset.fullLens && <LensCard item={dataset.fullLens} />}
            {dataset.lenses.map((lens) => (
              <LensCard key={lens.id} item={lens} />
            ))}
          </div>
        </section>

        {/* What is true of the dataset as a whole. Plain sections, no cards:
            this is reference text under the thing people actually click. */}
        <section className="flex max-w-2xl flex-col gap-4">
          <DatasetFacts dataset={dataset} />
          <DatasetLineage dataset={dataset} />
        </section>
      </div>
    </MikroArrayDataset.ModelPage>
  )
})

export default ArrayDatasetPage
