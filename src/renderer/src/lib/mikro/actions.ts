import { buildDeleteAction } from "@/lib/localactions/builders/deleteAction";
import type { Arkitekt } from "@/app/Arkitekt";
import {
  CreateSceneFromCoordinateSystemDocument,
  CreateSceneFromCoordinateSystemMutation,
  CreateSceneFromCoordinateSystemMutationVariables,
  DeleteArrayDatasetDocument,
  DeleteFolderDocument,
  DeleteFileDocument,
  DeleteSceneDocument,
  GetArrayDatasetIntrinsicSystemDocument,
  GetArrayDatasetIntrinsicSystemQuery,
  GetArrayDatasetIntrinsicSystemQueryVariables,
  GetCoordinateSystemDocument,
  GetFolderDocument,
  GetScenesDocument,
  GetFolderQuery,
  GetFolderQueryVariables,
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
import { linkBuilder } from "@/providers/smart/builder";
import { sceneRegistrationLink } from "@/mikro/components/registration/entry";
import {
  Boxes,
  Clapperboard,
  File,
  FolderInput,
  Table2,
  Layers,
  Pencil,
  Ruler,
  Waypoints,
} from "lucide-react";
import { Action } from "../localactions/LocalActionProvider";
import { getRefetchableQueriesForEntities } from "../localactions/helpers/refetch";

type MikroAction = Action<typeof Arkitekt>;

export const MIKRO_ACTIONS: Record<string, MikroAction> = {
  'create-scene-from-arrayDataset': {
    title: 'Create Scene',
    description:
      "Bootstrap a renderable scene over this array dataset's own pixel grid: a full lens and a default image layer",
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

      if (!selected?.object?.id) {
        throw new Error('No array dataset selected for Create Scene action');
      }

      const mikro = services.mikro;
      if (!mikro) {
        throw new Error('Mikro service is not available');
      }

      // A scene is built over a coordinate SYSTEM — `createSceneFromDataset` is
      // gone, and a dataset's own grid is simply one of those systems ("the
      // container's own data becomes the layer"). The action holds only an id,
      // so it asks which grid that is before it can stage anything. To render
      // at physical scale instead, build over a space the dataset is registered
      // into; the dataset page offers those.
      const { data: datasetData } = await mikro.client.query<
        GetArrayDatasetIntrinsicSystemQuery,
        GetArrayDatasetIntrinsicSystemQueryVariables
      >({
        query: GetArrayDatasetIntrinsicSystemDocument,
        variables: { id: selected.object.id },
      });

      const system = datasetData?.arrayDataset.intrinsicSystem;
      if (!system) {
        throw new Error(
          'This dataset has no intrinsic coordinate system yet, so there is no space to build a scene over',
        );
      }

      const { data } = await mikro.client.mutate<
        CreateSceneFromCoordinateSystemMutation,
        CreateSceneFromCoordinateSystemMutationVariables
      >({
        mutation: CreateSceneFromCoordinateSystemDocument,
        // `policy` is left to the server default; its `kind` (the layer recipe)
        // is inferred from the dataset's axes, and only LABEL needs asking for.
        variables: { input: { coordinateSystem: system.id } },
        refetchQueries: [GetScenesDocument],
      });

      const scene = data?.createSceneFromCoordinateSystem;
      if (!scene) {
        throw new Error('Scene creation returned no scene');
      }

      navigate(linkBuilder('mikro/scenes')(scene.id));
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

      if (!selected?.object?.id) {
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
        variables: { input: { coordinateSystem: selected.object.id } },
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
      if (!selected?.object?.id) {
        throw new Error('No coordinate system selected for Register action');
      }
      dialog.openDialog(
        'register',
        { target: selected.object.id },
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
      if (!target?.object?.id || !dataset?.object?.id) {
        throw new Error('Register needs both a coordinate system and a dataset');
      }
      dialog.openDialog(
        'register',
        {
          target: target.object.id,
          source: { kind: 'arrayDataset', id: dataset.object.id },
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
      if (!target?.object?.id || !table?.object?.id) {
        throw new Error('Register needs both a coordinate system and a table');
      }
      dialog.openDialog(
        'register',
        {
          target: target.object.id,
          source: { kind: 'tabledataset', id: table.object.id },
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
      if (!selected?.object?.id) {
        throw new Error('No dataset selected for Calibrate action');
      }
      dialog.openDialog(
        'calibrate',
        { dataset: selected.object.id },
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
      if (!selected?.object?.id) {
        throw new Error('No dataset selected for Register Into action');
      }
      dialog.openDialog(
        'register',
        { source: { kind: 'arrayDataset', id: selected.object.id } },
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

      if (!selected?.object?.id) {
        throw new Error('No scene selected for Add Layer action');
      }

      dialog.openDialog(
        'addlayer',
        { scene: selected.object.id },
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

      if (!selected?.object?.id) {
        throw new Error('No scene selected for Align Layers action');
      }

      navigate(sceneRegistrationLink(selected.object.id));
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

      if (!selectedFolder?.object?.id) {
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
          id: selectedFolder.object.id,
        },
        fetchPolicy: 'network-only',
      });

      if (!data?.folder) {
        throw new Error('Unable to load folder for update dialog');
      }

      dialog.openDialog('updatefolder', { folder: data.folder });
    },
  },
  'delete-mikro-file': buildDeleteAction<typeof Arkitekt>({
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
        .map((item) => item.object.id)

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
        .map((item) => item.object.id)

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
          selfs: folders.map((i) => i.object.id),
          other: inside.object.id
        },
        refetchQueries: getRefetchableQueriesForEntities(client, folders.map((d) => ({ typename: "Folder", id: d.object.id })))
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
          selfs: datasets.map((i) => i.object.id),
          other: inside.object.id
        },
        refetchQueries: getRefetchableQueriesForEntities(client, datasets.map((f) => ({ typename: "ArrayDataset", id: f.object.id })))
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
          selfs: tables.map((i) => i.object.id),
          other: inside.object.id
        },
        refetchQueries: getRefetchableQueriesForEntities(client, tables.map((f) => ({ typename: "TableDataset", id: f.object.id })))
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
          selfs: files.map((i) => i.object.id),
          other: inside.object.id
        },
        refetchQueries: getRefetchableQueriesForEntities(client, files.map((f) => ({ typename: "File", id: f.object.id })))
      })
    }
  },
  'delete-mikro-scene': buildDeleteAction<typeof Arkitekt>({
    title: 'Delete Scene',
    identifier: '@mikro/scene',
    description: 'Delete the scene',
    service: 'mikro',
    typename: 'Scene',
    mutation: DeleteSceneDocument
  }),
  'delete-mikro-arrayDataset': buildDeleteAction<typeof Arkitekt>({
    title: 'Delete Dataset',
    identifier: '@mikro/arraydataset',
    description:
      'Delete the array dataset, its pyramid levels and the store behind them',
    service: 'mikro',
    typename: 'ArrayDataset',
    mutation: DeleteArrayDatasetDocument
  }),
  'delete-mikro-folder': buildDeleteAction<typeof Arkitekt>({
    title: 'Delete Folder',
    identifier: '@mikro/folder',
    description: 'Delete the folder',
    service: 'mikro',
    typename: 'Folder',
    mutation: DeleteFolderDocument
  })
} as const
