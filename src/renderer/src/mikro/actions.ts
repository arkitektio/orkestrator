import { buildDeleteAction } from "@/core/smart/localactions/builders/deleteAction";
import type { ModuleServices } from "@/core/connection/arkitekt/host";
import {
  CreateChartFromCoordinateSystemDocument,
  CreateChartFromCoordinateSystemMutation,
  CreateChartFromCoordinateSystemMutationVariables,
  CreateTraceChartLayerDocument,
  CreateTraceChartLayerMutation,
  CreateTraceChartLayerMutationVariables,
  CreateSceneFromCoordinateSystemDocument,
  CreateSceneFromCoordinateSystemMutation,
  CreateSceneFromCoordinateSystemMutationVariables,
  CreateListLensDocument,
  CreateListLensMutation,
  CreateListLensMutationVariables,
  CreateSceneFromLensDocument,
  CreateSceneFromLensMutation,
  CreateSceneFromLensMutationVariables,
  DeleteArrayDatasetDocument,
  DeleteChartDocument,
  DeleteFolderDocument,
  DeleteFileDocument,
  DeleteLensDocument,
  DeleteSceneDocument,
  GetChartsDocument,
  GetCoordinateSystemDocument,
  GetFolderDocument,
  GetFoldersDocument,
  GetScenesDocument,
  GetFolderQuery,
  GetFolderQueryVariables,
  PinFolderDocument,
  PinFolderMutation,
  PinFolderMutationVariables,
  PutFoldersInFolderDocument,
  PutFoldersInFolderMutation,
  PutFoldersInFolderMutationVariables,
  PutFilesInFolderMutation,
  PutFilesInFolderMutationVariables,
  PutFilesInFolderDocument,
  PutArrayDatasetsInFolderDocument,
  PutArrayDatasetsInFolderMutation,
  PutArrayDatasetsInFolderMutationVariables,
  PutTableDatasetsInFolderDocument,
  PutTableDatasetsInFolderMutation,
  PutTableDatasetsInFolderMutationVariables,
} from "@/mikro/api/graphql";
import { linkBuilder } from "@/core/smart/builder";
import { sceneRegistrationLink } from "@/mikro/components/registration/entry";
import {
  Boxes,
  ChartSpline,
  Clapperboard,
  File,
  FolderInput,
  Table2,
  Layers,
  Pencil,
  Pin,
  Ruler,
  ScanSearch,
  Waypoints,
} from "lucide-react";
import { Action } from "@/core/smart/localactions/LocalActionProvider";
import { getRefetchableQueriesForEntities } from "@/core/smart/localactions/helpers/refetch";

type MikroAction = Action<ModuleServices<"mikro">>;

export const MIKRO_ACTIONS: Record<string, MikroAction> = {
  'create-scene-from-arrayDataset': {
    title: 'Create Scene',
    description:
      "Bootstrap a renderable scene of this whole array dataset: its whole-array lens, one layer per channel, in its own pixel grid",
    icon: Clapperboard,
    pinned: true,
    conditions: [
      { type: 'identifier', identifier: '@mikro/arraydataset' },
      { type: 'nopartner' },
    ],
    collections: ['arrayDataset'],
    execute: async ({ state, services, navigate }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/arraydataset',
      );

      if (!selected?.id) {
        throw new Error('No array dataset selected for Create Scene action');
      }

      const mikro = services.mikro;
      if (!mikro) {
        throw new Error('Mikro service is not available');
      }

      // A dataset is drawn through a lens, and "all of it" is the lens with no
      // slices. `createLens` hands back the one the dataset already has — every
      // dataset is created with it — so this names it rather than minting one.
      // To render at physical scale instead, stage the lens from its page,
      // which offers the spaces the dataset is registered into.
      const { data: lensData } = await mikro.client.mutate<
        CreateListLensMutation,
        CreateListLensMutationVariables
      >({
        mutation: CreateListLensDocument,
        variables: { input: { dataset: selected.id, slices: [] } },
      });
      const lens = lensData?.createLens;
      if (!lens) {
        throw new Error('This dataset has no whole-array lens to build a scene of');
      }

      const { data } = await mikro.client.mutate<
        CreateSceneFromLensMutation,
        CreateSceneFromLensMutationVariables
      >({
        mutation: CreateSceneFromLensDocument,
        // `kind` (the layer recipe) is inferred from the dataset's axes, and
        // only LABEL needs asking for.
        variables: { input: { lens: lens.id } },
        refetchQueries: [GetScenesDocument, 'GetLens', 'GetArrayDataset'],
        awaitRefetchQueries: true,
      });

      const scene = data?.createSceneFromLens;
      if (!scene) {
        throw new Error('Scene creation returned no scene');
      }

      // The viewer is the lens' page; name the new scene so it is the one on
      // screen.
      navigate(`${linkBuilder('mikro/lenses')(lens.id)}?scene=${encodeURIComponent(scene.id)}`);
    },
  },
  // The same for a lens someone already holds. Not a call on the lens' SPACE:
  // staging a space draws whatever lives in it, which behind a cut is its whole
  // dataset. Naming the lens is what makes the scene show the cut.
  'create-scene-from-lens': {
    title: 'Create Scene',
    description:
      'Bootstrap a scene showing just this lens: its selection of the dataset, one layer per channel, where it was cut from',
    icon: Clapperboard,
    pinned: true,
    conditions: [
      { type: 'identifier', identifier: '@mikro/lens' },
      { type: 'nopartner' },
    ],
    collections: ['lens'],
    execute: async ({ state, services, navigate }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/lens',
      );

      if (!selected?.id) {
        throw new Error('No lens selected for Create Scene action');
      }

      const mikro = services.mikro;
      if (!mikro) {
        throw new Error('Mikro service is not available');
      }

      const { data } = await mikro.client.mutate<
        CreateSceneFromLensMutation,
        CreateSceneFromLensMutationVariables
      >({
        mutation: CreateSceneFromLensDocument,
        // `kind` (the layer recipe) and `world` are left to the server: the
        // recipe is inferred from the lens' axes, and the world is the
        // dataset's own grid, so the cut sits where it was taken from.
        variables: { input: { lens: selected.id } },
        // The lens' page lists its scenes; awaited so it holds the new one by
        // the time we land there asking for it.
        refetchQueries: [GetScenesDocument, 'GetLens', 'GetArrayDataset'],
        awaitRefetchQueries: true,
      });

      const scene = data?.createSceneFromLens;
      if (!scene) {
        throw new Error('Scene creation returned no scene');
      }

      // Stay with the lens — its page is where a lens' scenes are drawn — and
      // name the new scene so it is the one on screen.
      navigate(`${linkBuilder('mikro/lenses')(selected.id)}?scene=${encodeURIComponent(scene.id)}`);
    },
  },
  // One dialog behind two selections: from a dataset it starts at the whole
  // array, from a lens at that lens' slices — a tighter cut of the same data.
  'create-lens-from-arrayDataset': {
    title: 'New Lens…',
    description:
      'Cut a selection out of this array dataset — a range of planes, a region, a timepoint — to open or process on its own',
    icon: ScanSearch,
    conditions: [
      { type: 'identifier', identifier: '@mikro/arraydataset' },
      { type: 'nopartner' },
    ],
    collections: ['arrayDataset'],
    execute: async ({ state, dialog }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/arraydataset',
      );
      if (!selected?.id) {
        throw new Error('No array dataset selected for New Lens action');
      }
      dialog.openDialog('createlens', { dataset: selected.id }, { size: 'medium' });
    },
  },
  'create-lens-from-lens': {
    title: 'New Lens From This…',
    description:
      'Start from this lens\' slices and cut again: a new lens over the same dataset',
    icon: ScanSearch,
    conditions: [
      { type: 'identifier', identifier: '@mikro/lens' },
      { type: 'nopartner' },
    ],
    collections: ['lens'],
    execute: async ({ state, dialog }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/lens',
      );
      if (!selected?.id) {
        throw new Error('No lens selected for New Lens action');
      }
      dialog.openDialog('createlens', { lens: selected.id }, { size: 'medium' });
    },
  },
  'rename-lens': {
    title: 'Rename Lens…',
    description:
      'Give this lens a name to find it by, or clear the one it has. What it selects does not change',
    icon: Pencil,
    conditions: [
      { type: 'identifier', identifier: '@mikro/lens' },
      { type: 'nopartner' },
    ],
    collections: ['lens'],
    execute: async ({ state, dialog }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/lens',
      );
      if (!selected?.id) {
        throw new Error('No lens selected for Rename Lens action');
      }
      dialog.openDialog('renamelens', { lens: selected.id }, { size: 'small' });
    },
  },
  'create-scene-from-coordinatesystem': {
    title: 'Create Scene',
    description:
      'Mirror this coordinate system into a new scene, materializing the sources registered into it as layers',
    icon: Clapperboard,
    pinned: true,
    conditions: [
      { type: 'identifier', identifier: '@mikro/coordinatesystem' },
      { type: 'nopartner' },
    ],
    collections: ['coordinatesystem'],
    execute: async ({ state, services, navigate }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/coordinatesystem',
      );

      if (!selected?.id) {
        throw new Error('No coordinate system selected for Create Scene action');
      }

      const mikro = services.mikro;
      if (!mikro) {
        throw new Error('Mikro service is not available');
      }

      const { data } = await mikro.client.mutate<
        CreateSceneFromCoordinateSystemMutation,
        CreateSceneFromCoordinateSystemMutationVariables
      >({
        mutation: CreateSceneFromCoordinateSystemDocument,
        // `policy` is left to the server default (nchildren cap, meshes on,
        // tables untransformed).
        variables: { input: { coordinateSystem: selected.id } },
        // Refresh the global scene list and the source system's page, whose
        // Scenes section lists exactly this inverse relation.
        refetchQueries: [GetScenesDocument, GetCoordinateSystemDocument],
      });

      const scene = data?.createSceneFromCoordinateSystem;
      if (!scene) {
        throw new Error('Scene creation returned no scene');
      }

      navigate(linkBuilder('mikro/scenes')(scene.id));
    },
  },
  'create-chart-from-coordinatesystem': {
    title: 'Create Chart',
    description:
      'Draw what is already laid along this coordinate system\'s axis as a new chart: its arrays as traces, its tables as series',
    icon: ChartSpline,
    conditions: [
      { type: 'identifier', identifier: '@mikro/coordinatesystem' },
      { type: 'nopartner' },
    ],
    collections: ['coordinatesystem'],
    execute: async ({ state, services, navigate }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/coordinatesystem',
      );

      if (!selected?.id) {
        throw new Error('No coordinate system selected for Create Chart action');
      }

      const mikro = services.mikro;
      if (!mikro) {
        throw new Error('Mikro service is not available');
      }

      // A chart is laid out along ONE metric axis, and the schema has no way
      // to ask up front whether this system is such a space: the server
      // decides, and its refusal is the message the user sees.
      const { data } = await mikro.client.mutate<
        CreateChartFromCoordinateSystemMutation,
        CreateChartFromCoordinateSystemMutationVariables
      >({
        mutation: CreateChartFromCoordinateSystemDocument,
        // `policy` is left to the server default (the nchildren cap).
        variables: { input: { coordinateSystem: selected.id } },
        refetchQueries: [GetChartsDocument],
      });

      const chart = data?.createChartFromCoordinateSystem;
      if (!chart) {
        throw new Error('Chart creation returned no chart');
      }

      navigate(linkBuilder('mikro/charts')(chart.id));
    },
  },
  // The three registration entry points. All open the same dialog; they differ
  // only in which of its two slots the entry point can already fill.
  //
  // A partner action's `state.left` is the drop target and `state.right` the
  // dragged payload, so these three read: "drop a dataset ON a system",
  // "register FROM a system's page", "register a dataset INTO something".
  'register-into-coordinatesystem': {
    title: 'Register…',
    description:
      'Author an edge placing a dataset, table or another space into this coordinate system',
    icon: Waypoints,
    pinned: true,
    conditions: [
      { type: 'identifier', identifier: '@mikro/coordinatesystem' },
      { type: 'nopartner' },
    ],
    collections: ['coordinatesystem'],
    execute: async ({ state, dialog }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/coordinatesystem',
      );
      if (!selected?.id) {
        throw new Error('No coordinate system selected for Register action');
      }
      dialog.openDialog(
        'register',
        { target: selected.id },
        // The axis-mapping table needs the width addlayer already claims.
        { className: 'max-w-3xl' },
      );
    },
  },
  'register-arrayDataset-into-coordinatesystem': {
    title: 'Register Dataset Here',
    description: 'Place this dataset into the coordinate system it was dropped on',
    icon: Waypoints,
    conditions: [
      { type: 'identifier', identifier: '@mikro/coordinatesystem' },
      { type: 'partner', partner: '@mikro/arraydataset' },
    ],
    collections: ['coordinatesystem'],
    execute: async ({ state, dialog }) => {
      const target = state.left.find(
        (item) => item.identifier === '@mikro/coordinatesystem',
      );
      const dataset = state.right?.find(
        (item) => item.identifier === '@mikro/arraydataset',
      );
      if (!target?.id || !dataset?.id) {
        throw new Error('Register needs both a coordinate system and a dataset');
      }
      dialog.openDialog(
        'register',
        {
          target: target.id,
          source: { kind: 'arrayDataset', id: dataset.id },
        },
        { className: 'max-w-3xl' },
      );
    },
  },
  'register-tabledataset-into-coordinatesystem': {
    title: 'Register Table Here',
    description: 'Place this table into the coordinate system it was dropped on',
    icon: Waypoints,
    conditions: [
      { type: 'identifier', identifier: '@mikro/coordinatesystem' },
      { type: 'partner', partner: '@mikro/tabledataset' },
    ],
    collections: ['coordinatesystem'],
    execute: async ({ state, dialog }) => {
      const target = state.left.find(
        (item) => item.identifier === '@mikro/coordinatesystem',
      );
      const table = state.right?.find(
        (item) => item.identifier === '@mikro/tabledataset',
      );
      if (!target?.id || !table?.id) {
        throw new Error('Register needs both a coordinate system and a table');
      }
      dialog.openDialog(
        'register',
        {
          target: target.id,
          source: { kind: 'tabledataset', id: table.id },
        },
        { className: 'max-w-3xl' },
      );
    },
  },
  'calibrate-arrayDataset': {
    title: 'Calibrate…',
    description:
      "Create a physical space for this dataset's pixels: a pixel size, a unit per axis",
    icon: Ruler,
    conditions: [
      { type: 'identifier', identifier: '@mikro/arraydataset' },
      { type: 'nopartner' },
    ],
    collections: ['arrayDataset'],
    execute: async ({ state, dialog }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/arraydataset',
      );
      if (!selected?.id) {
        throw new Error('No dataset selected for Calibrate action');
      }
      dialog.openDialog(
        'calibrate',
        { dataset: selected.id },
        { className: 'max-w-2xl' },
      );
    },
  },
  'register-arrayDataset-into': {
    title: 'Register Into…',
    description:
      "Place this dataset into a coordinate system: a scene's world, an atlas hub, or any other space",
    icon: Waypoints,
    conditions: [
      { type: 'identifier', identifier: '@mikro/arraydataset' },
      { type: 'nopartner' },
    ],
    collections: ['arrayDataset'],
    execute: async ({ state, dialog }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/arraydataset',
      );
      if (!selected?.id) {
        throw new Error('No dataset selected for Register Into action');
      }
      dialog.openDialog(
        'register',
        { source: { kind: 'arrayDataset', id: selected.id } },
        { className: 'max-w-3xl' },
      );
    },
  },
  'add-layer-to-scene': {
    title: 'Add Layer',
    description:
      'Add anything reachable from this scene\'s world coordinate system — images, tables, meshes or annotations — as a new layer',
    icon: Layers,
    conditions: [
      { type: 'identifier', identifier: '@mikro/scene' },
      { type: 'nopartner' },
    ],
    collections: ['scene'],
    execute: async ({ state, dialog }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/scene',
      );

      if (!selected?.id) {
        throw new Error('No scene selected for Add Layer action');
      }

      dialog.openDialog(
        'addlayer',
        { scene: selected.id },
        { className: 'max-w-3xl' },
      );
    },
  },
  // Interactive registration is its own PAGE (mikro/pages/
  // SceneRegistrationPage — the workspace in components/registration composed
  // over the viewer), not a dialog and not a mode of the scene page: aligning
  // data means looking at it, and the scene page stays a viewer. This action is
  // the way in. Layers carry no smart identifier of their own, so the entry
  // point is the scene; which layer to move is picked there, next to the reason
  // any layer cannot be.
  'register-scene-interactively': {
    title: 'Align Layers…',
    description:
      'Open the registration page for this scene: overlay a layer on the others, move it into place by hand or with landmark pairs, and save the result as its registration',
    icon: Waypoints,
    conditions: [
      { type: 'identifier', identifier: '@mikro/scene' },
      { type: 'nopartner' },
    ],
    collections: ['scene'],
    execute: async ({ state, navigate }) => {
      const selected = state.left.find(
        (item) => item.identifier === '@mikro/scene',
      );

      if (!selected?.id) {
        throw new Error('No scene selected for Align Layers action');
      }

      navigate(sceneRegistrationLink(selected.id));
    },
  },
  'update-mikro-folder': {
    title: 'Rename / Update Folder',
    description: 'Open the update dialog for this folder',
    icon: Pencil,
    conditions: [
      { type: 'identifier', identifier: '@mikro/folder' },
      { type: 'nopartner' },
    ],
    collections: ['folder'],
    execute: async ({ state, services, dialog }) => {
      const selectedFolder = state.left.find(
        (item) => item.identifier === '@mikro/folder',
      );

      if (!selectedFolder?.id) {
        throw new Error('No folder selected for Rename / Update Folder action');
      }

      const mikro = services.mikro;
      if (!mikro) {
        throw new Error('Mikro service is not available');
      }

      const { data } = await mikro.client.query<
        GetFolderQuery,
        GetFolderQueryVariables
      >({
        query: GetFolderDocument,
        variables: {
          id: selectedFolder.id,
        },
        fetchPolicy: 'network-only',
      });

      if (!data?.folder) {
        throw new Error('Unable to load folder for update dialog');
      }

      dialog.openDialog('updatefolder', { folder: data.folder });
    },
  },
  'pin-mikro-folder': {
    title: 'Pin / Unpin Folder',
    description: 'Pin this folder for quick access, or unpin it if it already is',
    icon: Pin,
    conditions: [
      { type: 'identifier', identifier: '@mikro/folder' },
      { type: 'nopartner' },
    ],
    collections: ['folder'],
    execute: async ({ state, services }) => {
      const folders = state.left.filter(
        (item) => item.identifier === '@mikro/folder',
      );

      const mikro = services.mikro;
      if (!mikro) {
        throw new Error('Mikro service is not available');
      }

      // The menu only knows the structure, not whether it is pinned.
      for (const folder of folders) {
        const { data } = await mikro.client.query<
          GetFolderQuery,
          GetFolderQueryVariables
        >({
          query: GetFolderDocument,
          variables: { id: folder.id },
          fetchPolicy: 'network-only',
        });

        await mikro.client.mutate<
          PinFolderMutation,
          PinFolderMutationVariables
        >({
          mutation: PinFolderDocument,
          variables: { id: folder.id, pin: !data.folder.pinned },
          refetchQueries: [GetFoldersDocument],
        });
      }
    },
  },
  'delete-mikro-file': buildDeleteAction<ModuleServices<"mikro">>({
    title: 'Delete File',
    identifier: '@mikro/file',
    description: 'Delete the file',
    service: 'mikro',
    typename: 'File',
    mutation: DeleteFileDocument
  }),
  // The move seen from the thing being moved, rather than from the container it
  // is dropped on: `move_files_to_dataset` below needs a folder page to drag
  // onto, so a file opened on its own had no way to be filed anywhere.
  'move-file-to-folder': {
    title: 'Move to Folder',
    description: 'File this into a folder',
    icon: FolderInput,
    conditions: [
      { type: 'identifier', identifier: '@mikro/file' },
      { type: 'nopartner' },
    ],
    collections: ['file'],
    execute: async ({ state, dialog }) => {
      const ids = state.left
        .filter((item) => item.identifier === '@mikro/file')
        .map((item) => item.id)

      if (ids.length === 0) {
        throw new Error('No files selected for Move to Folder action')
      }

      dialog.openDialog(
        'movetofolder',
        { subject: { kind: 'file', ids } },
        { className: 'max-w-lg' },
      )
    },
  },
  'move-arrayDataset-to-folder': {
    title: 'Move to Folder',
    description: 'File this dataset into a folder',
    icon: FolderInput,
    conditions: [
      { type: 'identifier', identifier: '@mikro/arraydataset' },
      { type: 'nopartner' },
    ],
    collections: ['arrayDataset'],
    execute: async ({ state, dialog }) => {
      const ids = state.left
        .filter((item) => item.identifier === '@mikro/arraydataset')
        .map((item) => item.id)

      if (ids.length === 0) {
        throw new Error('No datasets selected for Move to Folder action')
      }

      dialog.openDialog(
        'movetofolder',
        { subject: { kind: 'arrayDataset', ids } },
        { className: 'max-w-lg' },
      )
    },
  },
  move_folders_to_folder: {
    description: 'File folders into this folder',
    title: 'Move to Folder',
    icon: FolderInput,
    conditions: [
      { type: 'identifier', identifier: '@mikro/folder' },
      { type: 'partner', partner: '@mikro/folder' }
    ],
    collections: ['folder'],
    execute: async ({ state, services }) => {
      if (!state.right || state.right.length === 0) {
        throw new Error('No partner provided for Move to Folder action')
      }
      const folders = state.left.filter((item) => item.identifier === '@mikro/folder')
      if (folders.length === 0) {
        throw new Error('No folders selected for Move to Folder action')
      }

      const mikro = services.mikro
      if (!mikro) {
        throw new Error('Mikro service is not available')
      }

      const client = mikro.client

      const inside = state.left.at(0)
      if (!inside) {
        throw new Error('No inside item found for Move to Folder action')
      }
      if (inside.identifier !== '@mikro/folder') {
        throw new Error('Inside item must be a folder for Move to Folder action')
      }


      await client.mutate<PutFoldersInFolderMutation, PutFoldersInFolderMutationVariables>({
        mutation: PutFoldersInFolderDocument,
        variables: {
          selfs: folders.map((i) => i.id),
          other: inside.id
        },
        refetchQueries: getRefetchableQueriesForEntities(client, folders.map((d) => ({ typename: "Folder", id: d.id })))
      })
    }
  },
  move_arrayDatasets_to_folder: {
    description: 'File array datasets into this folder',
    title: 'Move Datasets to Folder',
    icon: Boxes,
    conditions: [
      { type: 'identifier', identifier: '@mikro/folder' },
      { type: 'partner', partner: '@mikro/arraydataset' }
    ],
    collections: ['folder'],
    execute: async ({ state, services }) => {
      if (!state.right || state.right.length === 0) {
        throw new Error('No partner provided for Move Datasets to Folder action')
      }
      const datasets = state.right.filter((item) => item.identifier === '@mikro/arraydataset')
      if (datasets.length === 0) {
        throw new Error('No datasets selected for Move Datasets to Folder action')
      }

      const mikro = services.mikro
      if (!mikro) {
        throw new Error('Mikro service is not available')
      }

      const client = mikro.client

      const inside = state.left.at(0)
      if (!inside) {
        throw new Error('No inside item found for Move Datasets to Folder action')
      }
      if (inside.identifier !== '@mikro/folder') {
        throw new Error('Inside item must be a folder for Move Datasets to Folder action')
      }

      await client.mutate<PutArrayDatasetsInFolderMutation, PutArrayDatasetsInFolderMutationVariables>({
        mutation: PutArrayDatasetsInFolderDocument,
        variables: {
          selfs: datasets.map((i) => i.id),
          other: inside.id
        },
        refetchQueries: getRefetchableQueriesForEntities(client, datasets.map((f) => ({ typename: "ArrayDataset", id: f.id })))
     })
    }
  },
  move_tabledatasets_to_folder: {
    description: 'File table datasets into this folder',
    title: 'Move Tables to Folder',
    icon: Table2,
    conditions: [
      { type: 'identifier', identifier: '@mikro/folder' },
      { type: 'partner', partner: '@mikro/tabledataset' }
    ],
    collections: ['folder'],
    execute: async ({ state, services }) => {
      if (!state.right || state.right.length === 0) {
        throw new Error('No partner provided for Move Tables to Folder action')
      }
      const tables = state.right.filter((item) => item.identifier === '@mikro/tabledataset')
      if (tables.length === 0) {
        throw new Error('No tables selected for Move Tables to Folder action')
      }

      const mikro = services.mikro
      if (!mikro) {
        throw new Error('Mikro service is not available')
      }

      const client = mikro.client

      const inside = state.left.at(0)
      if (!inside) {
        throw new Error('No inside item found for Move Tables to Folder action')
      }
      if (inside.identifier !== '@mikro/folder') {
        throw new Error('Inside item must be a folder for Move Tables to Folder action')
      }

      await client.mutate<PutTableDatasetsInFolderMutation, PutTableDatasetsInFolderMutationVariables>({
        mutation: PutTableDatasetsInFolderDocument,
        variables: {
          selfs: tables.map((i) => i.id),
          other: inside.id
        },
        refetchQueries: getRefetchableQueriesForEntities(client, tables.map((f) => ({ typename: "TableDataset", id: f.id })))
     })
    }
  },
  move_files_to_folder: {
    description: 'File files into this folder',
    title: 'Move Files to Folder',
    icon: File,
    conditions: [
      { type: 'identifier', identifier: '@mikro/folder' },
      { type: 'partner', partner: '@mikro/file' }
    ],
    collections: ['folder'],
    execute: async ({ state, services,  }) => {
      if (!state.right || state.right.length === 0) {
        throw new Error('No partner provided for Move Files to Folder action')
      }
      const files = state.right.filter((item) => item.identifier === '@mikro/file')
      if (files.length === 0) {
        throw new Error('No files selected for Move Files to Folder action')
      }

      const mikro = services.mikro
      if (!mikro) {
        throw new Error('Mikro service is not available')
      }

      const client = mikro.client

      const inside = state.left.at(0)
      if (!inside) {
        throw new Error('No inside item found for Move Files to Folder action')
      }
      if (inside.identifier !== '@mikro/folder') {
        throw new Error('Inside item must be a folder for Move Files to Folder action')
      }

      await client.mutate<PutFilesInFolderMutation, PutFilesInFolderMutationVariables>({
        mutation:   PutFilesInFolderDocument,
        variables: {
          selfs: files.map((i) => i.id),
          other: inside.id
        },
        refetchQueries: getRefetchableQueriesForEntities(client, files.map((f) => ({ typename: "File", id: f.id })))
      })
    }
  },
  'delete-mikro-scene': buildDeleteAction<ModuleServices<"mikro">>({
    title: 'Delete Scene',
    identifier: '@mikro/scene',
    description: 'Delete the scene',
    service: 'mikro',
    typename: 'Scene',
    mutation: DeleteSceneDocument
  }),
  'add-layer-to-chart': {
    title: 'Add Layer',
    description: 'Draw an array, a table column or annotations in this chart',
    icon: ChartSpline,
    conditions: [
      { type: 'identifier', identifier: '@mikro/chart' },
      { type: 'nopartner' },
    ],
    collections: ['chart'],
    execute: async ({ state, dialog }) => {
      const selected = state.left.find((item) => item.identifier === '@mikro/chart');
      if (!selected?.id) {
        throw new Error('No chart selected for Add Layer action');
      }
      dialog.openDialog('addchartlayer', { chart: selected.id }, { size: 'medium' });
    },
  },
  'add-lens-to-chart': {
    title: 'Draw as Trace',
    description: 'Draw this lens along the axis of the chart it was dropped on',
    icon: ChartSpline,
    conditions: [
      { type: 'identifier', identifier: '@mikro/chart' },
      { type: 'partner', partner: '@mikro/lens' },
    ],
    collections: ['chart'],
    execute: async ({ state, services }) => {
      const chart = state.left.find((item) => item.identifier === '@mikro/chart');
      const lenses = (state.right ?? []).filter((item) => item.identifier === '@mikro/lens');
      if (!chart?.id || lenses.length === 0) {
        throw new Error('Draw as Trace needs both a chart and a lens');
      }
      const mikro = services.mikro;
      if (!mikro) {
        throw new Error('Mikro service is not available');
      }
      // No registration is written: the lens must already be laid along the
      // chart's axis, and the server's refusal is what says when it is not.
      for (const lens of lenses) {
        await mikro.client.mutate<
          CreateTraceChartLayerMutation,
          CreateTraceChartLayerMutationVariables
        >({
          mutation: CreateTraceChartLayerDocument,
          variables: { input: { chart: chart.id, lens: lens.id } },
          refetchQueries: ['GetChart'],
        });
      }
    },
  },
  'add-arraydataset-to-chart': {
    title: 'Draw as Trace',
    description: 'Draw this dataset along the axis of the chart it was dropped on',
    icon: ChartSpline,
    conditions: [
      { type: 'identifier', identifier: '@mikro/chart' },
      { type: 'partner', partner: '@mikro/arraydataset' },
    ],
    collections: ['chart'],
    execute: async ({ state, services }) => {
      const chart = state.left.find((item) => item.identifier === '@mikro/chart');
      const datasets = (state.right ?? []).filter(
        (item) => item.identifier === '@mikro/arraydataset',
      );
      if (!chart?.id || datasets.length === 0) {
        throw new Error('Draw as Trace needs both a chart and a dataset');
      }
      const mikro = services.mikro;
      if (!mikro) {
        throw new Error('Mikro service is not available');
      }
      // Naming the dataset leaves the lens to the server: which selection of
      // the array is a trace is its call, as is refusing one that is not.
      for (const dataset of datasets) {
        await mikro.client.mutate<
          CreateTraceChartLayerMutation,
          CreateTraceChartLayerMutationVariables
        >({
          mutation: CreateTraceChartLayerDocument,
          variables: { input: { chart: chart.id, dataset: dataset.id } },
          refetchQueries: ['GetChart'],
        });
      }
    },
  },
  'add-tabledataset-to-chart': {
    title: 'Draw as Series…',
    description: 'Draw a column of this table along the axis of the chart it was dropped on',
    icon: ChartSpline,
    conditions: [
      { type: 'identifier', identifier: '@mikro/chart' },
      { type: 'partner', partner: '@mikro/tabledataset' },
    ],
    collections: ['chart'],
    execute: async ({ state, dialog }) => {
      const chart = state.left.find((item) => item.identifier === '@mikro/chart');
      const table = state.right?.find((item) => item.identifier === '@mikro/tabledataset');
      if (!chart?.id || !table?.id) {
        throw new Error('Draw as Series needs both a chart and a table');
      }
      // A series must be told which column is the value, so this opens the
      // picker on that table instead of letting the server guess one.
      dialog.openDialog('addchartlayer', { chart: chart.id, table: table.id }, { size: 'medium' });
    },
  },
  'delete-mikro-chart': buildDeleteAction<ModuleServices<"mikro">>({
    title: 'Delete Chart',
    identifier: '@mikro/chart',
    description:
      'Delete the chart and its layers. The data they drew and the space it is laid out along are untouched',
    service: 'mikro',
    typename: 'Chart',
    mutation: DeleteChartDocument
  }),
  'delete-mikro-arrayDataset': buildDeleteAction<ModuleServices<"mikro">>({
    title: 'Delete Dataset',
    identifier: '@mikro/arraydataset',
    description:
      'Delete the array dataset, its pyramid levels and the store behind them',
    service: 'mikro',
    typename: 'ArrayDataset',
    mutation: DeleteArrayDatasetDocument
  }),
  'delete-mikro-lens': buildDeleteAction<ModuleServices<"mikro">>({
    title: 'Delete Lens',
    identifier: '@mikro/lens',
    description:
      'Delete the lens and every layer drawn over it, in every scene. The dataset it selects from is untouched',
    service: 'mikro',
    typename: 'Lens',
    mutation: DeleteLensDocument
  }),
  'delete-mikro-folder': buildDeleteAction<ModuleServices<"mikro">>({
    title: 'Delete Folder',
    identifier: '@mikro/folder',
    description: 'Delete the folder',
    service: 'mikro',
    typename: 'Folder',
    mutation: DeleteFolderDocument
  })
} as const
