import {
  AddModelsToWorkspaceDocument,
  AddModelsToWorkspaceMutation,
  AddModelsToWorkspaceMutationVariables,
  CreateModelWorkspaceDocument,
  CreateModelWorkspaceMutation,
  CreateModelWorkspaceMutationVariables,
  DeleteExperimentDocument,
  GetArrayDatasetDocument,
  GetArrayDatasetQuery,
  GetArrayDatasetQueryVariables,
  DeleteModelWorkspaceDocument,
  DeleteNeuronModelDocument,
} from '@/elektro/api/graphql'
import { useActiveWorkspaceStore } from '@/elektro/lib/activeWorkspaceStore'
import { findOrCreateExperimentForWorld } from '@/elektro/lib/openOnTimeline'
import { ElektroExperiment, ElektroModelWorkspace } from '@/core/linkers'
import { ApolloClient, NormalizedCache } from '@apollo/client'
import { AudioLines, LayoutDashboard, Layers } from 'lucide-react'
import { Action } from '@/core/lib/localactions/LocalActionProvider'
import { buildDeleteAction } from '@/core/lib/localactions/builders/deleteAction'

/**
 * Spin up a fresh workspace seeded with the selected neuron model, make it the
 * active workspace (so subsequently-saved models join it), and open it. No
 * dialog — the workspace is auto-named after the model.
 */
const createWorkspaceFromModel: Action = {
  title: 'Create Workspace from Model',
  description: 'Start a model workspace seeded with this neuron model',
  icon: LayoutDashboard,
  collections: ['io'],
  conditions: [
    { type: 'identifier', identifier: '@elektro/neuronmodel' },
    { type: 'nopartner' },
  ],
  execute: async ({ state, services, navigate }) => {
    const model = state.left[0]
    if (!model) {
      throw new Error('No neuron model provided for Create Workspace action')
    }

    const client = services.elektro.client as ApolloClient<NormalizedCache>
    if (!client) {
      throw new Error('Elektro service not available')
    }

    const name =
      model.label
        ? `${model.label} Workspace`
        : 'New Workspace'

    const created = await client.mutate<
      CreateModelWorkspaceMutation,
      CreateModelWorkspaceMutationVariables
    >({
      mutation: CreateModelWorkspaceDocument,
      variables: { input: { name } },
    })

    const workspaceId = created.data?.createModelWorkspace?.id
    if (!workspaceId) {
      throw new Error('Failed to create workspace')
    }

    await client.mutate<
      AddModelsToWorkspaceMutation,
      AddModelsToWorkspaceMutationVariables
    >({
      mutation: AddModelsToWorkspaceDocument,
      variables: { input: { workspace: workspaceId, models: [model.id] } },
    })

    const store = useActiveWorkspaceStore.getState()
    store.setActiveWorkspace(workspaceId)
    store.setActiveModel(model.id)

    navigate(ElektroModelWorkspace.linkBuilder(workspaceId))
  },
}

/**
 * Open a dataset on a timeline: the first experiment already drawing it, else
 * the experiment composed over its own grid (found, or staged — the server adds
 * a layer for everything placeable there). Same answer as the dataset page's
 * backdrop, reachable from any card or menu the dataset appears in.
 */
const openArrayDatasetOnTimeline: Action = {
  title: 'Open on Timeline',
  description: 'Open the experiment drawing this dataset, or stage one over its own grid',
  icon: AudioLines,
  collections: ['io'],
  conditions: [
    { type: 'identifier', identifier: '@elektro/arraydataset' },
    { type: 'nopartner' },
  ],
  execute: async ({ state, services, navigate }) => {
    const dataset = state.left[0]
    if (!dataset) {
      throw new Error('No dataset provided for Open on Timeline action')
    }
    const client = services.elektro.client as ApolloClient<NormalizedCache>
    if (!client) {
      throw new Error('Elektro service not available')
    }

    const result = await client.query<GetArrayDatasetQuery, GetArrayDatasetQueryVariables>({
      query: GetArrayDatasetDocument,
      variables: { id: dataset.id },
      fetchPolicy: 'network-only',
    })
    const detail = result.data?.arrayDataset
    const drawnIn = detail?.experimentLayers.at(0)?.experiment.id
    if (drawnIn) {
      navigate(ElektroExperiment.linkBuilder(drawnIn))
      return
    }
    const grid = detail?.intrinsicSystem?.id
    if (!grid) {
      throw new Error('This dataset has no coordinate system of its own, so there is no timeline to lay it out on')
    }
    const experimentId = await findOrCreateExperimentForWorld(client, grid, detail.name)
    navigate(ElektroExperiment.linkBuilder(experimentId))
  },
}

/**
 * Add a layer to an experiment — a trace, a spike raster, an event table or an
 * annotation collection — through the `addexperimentlayer` dialog. The same
 * dialog the "+" in the experiment's Layers tab opens.
 */
const addExperimentLayer: Action = {
  title: 'Add Layer',
  description: 'Add a trace, spikes, events or annotations to this experiment',
  icon: Layers,
  collections: ['io'],
  conditions: [
    { type: 'identifier', identifier: '@elektro/experiment' },
    { type: 'nopartner' },
  ],
  execute: async ({ state, dialog }) => {
    const experiment = state.left[0]
    if (!experiment) {
      throw new Error('No experiment provided for Add Layer action')
    }
    dialog.openDialog('addexperimentlayer', { experiment: experiment.id }, { size: 'medium' })
  },
}

export const ELEKTRO_ACTIONS: Record<string, Action> = {
  addElektroExperimentLayer: addExperimentLayer,
  openElektroArrayDatasetOnTimeline: openArrayDatasetOnTimeline,
  deleteElektroExperiment: buildDeleteAction({
    title: 'Delete Experiment',
    identifier: '@elektro/experiment',
    description: 'Delete the Experiment. Its recordings, runs and timeline clock are kept.',
    service: 'elektro',
    typename: 'Experiment',
    mutation: DeleteExperimentDocument
  }),
  createElektroWorkspaceFromModel: createWorkspaceFromModel,
  deleteElektroNeuronModel: buildDeleteAction({
    title: 'Delete Neuron Model',
    identifier: '@elektro/neuronmodel',
    description: 'Delete the Neuron Model',
    service: 'elektro',
    typename: 'NeuronModel',
    mutation: DeleteNeuronModelDocument
  }),
  deleteElektroModelWorkspace: buildDeleteAction({
    title: 'Delete Model Workspace',
    identifier: '@elektro/modelworkspace',
    description: 'Delete the Model Workspace',
    service: 'elektro',
    typename: 'ModelWorkspace',
    mutation: DeleteModelWorkspaceDocument
  })
}
