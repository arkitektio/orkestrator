import {
  AddModelsToWorkspaceDocument,
  AddModelsToWorkspaceMutation,
  AddModelsToWorkspaceMutationVariables,
  CreateModelWorkspaceDocument,
  CreateModelWorkspaceMutation,
  CreateModelWorkspaceMutationVariables,
  DeleteExperimentDocument,
  SimulationClockDocument,
  SimulationClockQuery,
  SimulationClockQueryVariables,
  DeleteModelWorkspaceDocument,
  DeleteNeuronModelDocument,
} from '@/elektro/api/graphql'
import { useActiveWorkspaceStore } from '@/elektro/lib/activeWorkspaceStore'
import { openClockOnTimeline } from '@/elektro/lib/openOnTimeline'
import { ElektroExperiment, ElektroModelWorkspace } from '@/linkers'
import { ApolloClient, NormalizedCache } from '@apollo/client'
import { AudioLines, Download, LayoutDashboard, Layers } from 'lucide-react'
import { Action } from '../localactions/LocalActionProvider'
import { buildDeleteAction } from '../localactions/builders/deleteAction'

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
    const model = state.left[0]?.object
    if (!model) {
      throw new Error('No neuron model provided for Create Workspace action')
    }

    const client = services.elektro.client as ApolloClient<NormalizedCache>
    if (!client) {
      throw new Error('Elektro service not available')
    }

    const name =
      typeof model.name === 'string' && model.name
        ? `${model.name} Workspace`
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
 * Open the exporter dialog for a neuron model: pick a rekuest exporter action
 * (neuronmodel in, file out), run it, and let the task-hook runner auto-download
 * the resulting file when the (potentially long-running) task finishes.
 */
const exportNeuronModel: Action = {
  title: 'Export Model',
  description: 'Run an exporter on this neuron model and download the result',
  icon: Download,
  collections: ['io'],
  conditions: [
    { type: 'identifier', identifier: '@elektro/neuronmodel' },
    { type: 'nopartner' },
  ],
  execute: async ({ state, dialog }) => {
    const model = state.left[0]?.object
    if (!model) {
      throw new Error('No neuron model provided for Export action')
    }
    dialog.openDialog('exportelektromodel', {
      modelId: model.id,
      modelName: typeof model.name === 'string' ? model.name : undefined,
    })
  },
}

/**
 * Lay a simulation run out on a timeline: stage an experiment over the run's
 * clock. The server adds a layer for every recording and stimulus placed on it
 * (and for any spike set, event table or annotation collection timed on it),
 * so this is one mutation, not a composition built here.
 */
const createExperimentFromSimulation: Action = {
  title: 'Open Run on Timeline',
  description: 'Stage an experiment over this run\'s clock, with a layer per recording and stimulus',
  icon: AudioLines,
  collections: ['io'],
  conditions: [
    { type: 'identifier', identifier: '@elektro/simulation' },
    { type: 'nopartner' },
  ],
  execute: async ({ state, services, navigate }) => {
    const simulation = state.left[0]?.object
    if (!simulation) {
      throw new Error('No simulation provided for Open on Timeline action')
    }
    const client = services.elektro.client as ApolloClient<NormalizedCache>
    if (!client) {
      throw new Error('Elektro service not available')
    }

    const run = await client.query<SimulationClockQuery, SimulationClockQueryVariables>({
      query: SimulationClockDocument,
      variables: { id: simulation.id },
      fetchPolicy: 'network-only',
    })
    const clock = run.data?.simulation?.clock?.id
    if (!clock) {
      throw new Error('This run has no clock, so there is no timeline to lay it out on')
    }
    const experimentId = await openClockOnTimeline(client, clock, run.data.simulation.name)
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
    const experiment = state.left[0]?.object
    if (!experiment) {
      throw new Error('No experiment provided for Add Layer action')
    }
    dialog.openDialog('addexperimentlayer', { experiment: experiment.id }, { size: 'medium' })
  },
}

export const ELEKTRO_ACTIONS: Record<string, Action> = {
  addElektroExperimentLayer: addExperimentLayer,
  createElektroExperimentFromSimulation: createExperimentFromSimulation,
  deleteElektroExperiment: buildDeleteAction({
    title: 'Delete Experiment',
    identifier: '@elektro/experiment',
    description: 'Delete the Experiment. Its recordings, runs and timeline clock are kept.',
    service: 'elektro',
    typename: 'Experiment',
    mutation: DeleteExperimentDocument
  }),
  createElektroWorkspaceFromModel: createWorkspaceFromModel,
  exportElektroNeuronModel: exportNeuronModel,
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
