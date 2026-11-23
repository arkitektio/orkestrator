import {
  DetailTaskDocument,
  DetailTaskQuery,
  DetailTaskQueryVariables,
  ActionHashDocument,
  ActionHashQuery,
  ActionHashQueryVariables,
  AgentDocument,
  AgentQuery,
  AgentQueryVariables,
  BlockDocument,
  BlockMutation,
  BlockMutationVariables,
  BounceDocument,
  BounceMutation,
  BounceMutationVariables,
  CleanupActionsDocument,
  CleanupActionsMutation,
  CleanupActionsMutationVariables,
  DeleteBlokDocument,
  DeleteBlokMutation,
  GetBlokDocument,
  GetBlokQuery,
  GetBlokQueryVariables,
  DeleteBlokMutationVariables,
  DeleteDashboardDocument,
  DeleteDashboardMutation,
  DeleteDashboardMutationVariables,
  DeleteAgentDocument,
  DeleteMaterializedBlokDocument,
  MaterializedBlokDocument,
  MaterializedBlokQuery,
  MaterializedBlokQueryVariables,
  PinMaterializedBlokDocument,
  PinMaterializedBlokMutation,
  PinMaterializedBlokMutationVariables,
  PinMaterializedBlokRevisionDocument,
  PinMaterializedBlokRevisionMutation,
  PinMaterializedBlokRevisionMutationVariables,
  DeleteMaterializedBlokMutation,
  DeleteMaterializedBlokMutationVariables,
  DeleteScheduleDocument,
  DeleteShortcutDocument,
  DeleteTriggerDocument,
  DeleteWiregramDocument,
  ImplementationDocument,
  ImplementationQuery,
  ImplementationQueryVariables,
  KickDocument,
  KickMutation,
  KickMutationVariables,
  PinAgentDocument,
  PinAgentMutation,
  PinAgentMutationVariables,
  ScheduleDocument,
  ScheduleQuery,
  ScheduleQueryVariables,
  ScheduleEnabledDocument,
  ScheduleEnabledQuery,
  ScheduleEnabledQueryVariables,
  SignalDocument,
  SignalQuery,
  SignalQueryVariables,
  TaskDocument,
  TaskQuery,
  TaskQueryVariables,
  TriggerDocument,
  TriggerQuery,
  TriggerQueryVariables,
  TriggerEnabledDocument,
  TriggerEnabledQuery,
  TriggerEnabledQueryVariables,
  TriggerScheduleDocument,
  TriggerScheduleMutation,
  TriggerScheduleMutationVariables,
  UnblockDocument,
  UnblockMutation,
  UnblockMutationVariables,
  UpdateScheduleDocument,
  UpdateScheduleMutation,
  UpdateScheduleMutationVariables,
  UpdateTriggerDocument,
  UpdateTriggerMutation,
  UpdateTriggerMutationVariables,
  AllowActionDocument,
  AllowActionMutation,
  AllowActionMutationVariables,
  MyAllowancesDocument,
  MyAllowancesQuery,
  MyAllowancesQueryVariables,
  RevokeAllowanceDocument,
  RevokeAllowanceMutation,
  RevokeAllowanceMutationVariables,
  WiregramDocument,
  WiregramQuery,
  WiregramQueryVariables,
  AgentsForProtocolDocument,
  AgentsForProtocolQuery,
  AgentsForProtocolQueryVariables,
  BlokNamesStartingWithDocument,
  BlokNamesStartingWithQuery,
  BlokNamesStartingWithQueryVariables,
  ComponentContext,
  CreateBlokDocument,
  CreateBlokMutation,
  CreateBlokMutationVariables,
  MaterializeBlokDocument,
  MaterializeBlokMutation,
  MaterializeBlokMutationVariables,
} from '@/rekuest/api/graphql'
import { scaffoldAgentsBlok } from './lib/agentBlokScaffold'
import type { ModuleServices } from '@/core/connection/arkitekt/host'
import { buildDeleteAction } from '@/core/smart/localactions/builders/deleteAction'
import { Action } from '@/core/smart/localactions/LocalActionProvider'
import { AlarmClock, Ban, Unplug, Blocks, Bookmark, Code, Copy, Download, Eraser, FastForward, Hash, History, LogOut, PauseCircle, Pencil, Pin, Play, RefreshCw, RotateCcw, Share, Share2, ShieldCheck, ToggleLeft, Trash2, Upload, Zap } from 'lucide-react'
import { toast } from "@/core/notify";
import { REKUEST_ADMIN } from './roles'
import { isPausable, isResumable } from '@/rekuest/lib/taskStatus'
import { controlTask, DEFAULT_DEADMAN_SECONDS, sessionOf, setDeadman } from './session/calls'
import { initialFromSchedule, initialFromTrigger } from './components/automation/builder/initial'
import { PIN_REFETCH } from './lib/pins'

type RekuestAction = Action<ModuleServices<"rekuest">>

const ACTION_IDENTIFIER = '@rekuest/action'

const ACTION_CONDITIONS = [
  {
    type: 'identifier',
    identifier: ACTION_IDENTIFIER,
  },
  {
    type: 'nopartner',
  },
] as const

const selected = (
  state: { left: { identifier: string; id: string }[] },
  identifier: string,
) => {
  const structure = state.left.find((item) => item.identifier === identifier)
  if (!structure?.id) {
    throw new Error(`No ${identifier} selected`)
  }
  return structure.id
}

const only = (identifier: string) =>
  [
    { type: 'identifier', identifier },
    { type: 'nopartner' },
  ] as const

export const REKUEST_ACTIONS: Record<string, RekuestAction> = {
  'rekuest-update-agent': {
    title: 'Rename / Update Agent',
    description: 'Open the update dialog for this agent',
    icon: Pencil,
    conditions: [
      {
        type: 'identifier',
        identifier: '@rekuest/agent'
      },
      {
        type: 'nopartner'
      }
    ],
    execute: async ({ services, state, dialog }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }

      const selectedAgent = state.left.find(
        (item) => item.identifier === '@rekuest/agent',
      )

      if (!selectedAgent?.id) {
        throw new Error('No agent selected for Rename / Update Agent action')
      }

      const { data } = await services.rekuest.client.query<
        AgentQuery,
        AgentQueryVariables
      >({
        query: AgentDocument,
        variables: {
          id: selectedAgent.id,
        },
        fetchPolicy: 'network-only',
      })

      if (!data?.agent) {
        throw new Error('Unable to load agent for update dialog')
      }

      dialog.openDialog('updateagent', { agent: data.agent })
    },
    collections: ['io'],
  },
  'rekuest-create-blok-from-agent': {
    title: 'Create Blok from Agent',
    description: 'Make a custom blok from its states and actions, bound to this agent, and open it to change; several selected agents make one blok of them all',
    icon: Blocks,
    conditions: only('@rekuest/agent'),
    execute: async ({ services, state, navigate }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const client = services.rekuest.client
      // Every selected agent, once: several make one blok with a part for each.
      const ids = [
        ...new Set(
          state.left.filter((item) => item.identifier === '@rekuest/agent' && item.id).map((item) => String(item.id)),
        ),
      ]
      if (ids.length === 0) {
        throw new Error('No agent selected')
      }
      const { data: read } = await client.query<AgentsForProtocolQuery, AgentsForProtocolQueryVariables>({
        query: AgentsForProtocolDocument,
        variables: { ids },
        fetchPolicy: 'network-only',
      })
      // In the order they were selected: the blok's parts follow it.
      const byId = new Map(read.agents.map((agent) => [agent.id, agent]))
      const agents = ids.map((id) => byId.get(id))
      if (agents.some((agent) => !agent)) {
        throw new Error(ids.length > 1 ? 'One of these agents could not be read' : 'This agent could not be read')
      }
      const readAgents = agents.filter((agent): agent is NonNullable<typeof agent> => !!agent)
      // A blok created under a name in use would change that blok: the new one takes a free
      // name, so only the names it could collide with are asked for.
      const { data: existing } = await client.query<BlokNamesStartingWithQuery, BlokNamesStartingWithQueryVariables>({
        query: BlokNamesStartingWithDocument,
        variables: { prefix: scaffoldAgentsBlok(readAgents).name },
        fetchPolicy: 'network-only',
      })
      const scaffold = scaffoldAgentsBlok(
        readAgents,
        existing.bloks.map((blok) => blok.name),
      )
      const created = await client.mutate<CreateBlokMutation, CreateBlokMutationVariables>({
        mutation: CreateBlokDocument,
        variables: {
          input: {
            name: scaffold.name,
            description: scaffold.description,
            context: ComponentContext.Panel,
            source: scaffold.source,
            vocab: 2,
            demo: scaffold.demo,
            dependencies: scaffold.dependencies,
          },
        },
        refetchQueries: ['ListBloks'],
      })
      const blok = created.data?.createBlok
      if (!blok) {
        throw new Error('Rekuest did not create the blok')
      }
      // Bound to the agent it was made from, so the editor can show it live.
      let materialized: string | undefined
      let unbound: unknown
      try {
        const result = await client.mutate<MaterializeBlokMutation, MaterializeBlokMutationVariables>({
          mutation: MaterializeBlokDocument,
          variables: {
            input: { blok: blok.id, agentMappings: scaffold.bindings.map(({ key, agent }) => ({ key, agent })) },
          },
          refetchQueries: ['GetBlok', 'ListMaterializedBloks'],
        })
        materialized = result.data?.materializeBlok.id
      } catch (error) {
        unbound = error
      }
      // The blok exists either way: it is opened, and a failed binding said after.
      // A blok to edit live on its agents; the bare template when binding it failed.
      navigate(materialized ? `/rekuest/materialized_bloks/${materialized}/edit` : `/rekuest/bloks/${blok.id}/edit`)
      if (unbound) {
        console.warn('Materializing the new blok failed', unbound)
        throw new Error(`${blok.name} was created, but could not be bound to ${ids.length > 1 ? 'these agents' : 'this agent'}. Materialize it from its page.`)
      }
    },
    collections: ['io'],
  },
  'rekuest-export-blok': {
    title: 'Export Template…',
    description: 'Save it as a file (its BSX, demo and the agents it asks for) to install elsewhere',
    icon: Share,
    conditions: only('@rekuest/blok'),
    execute: async ({ state, dialog }) => {
      dialog.openDialog('exportblok', { id: selected(state, '@rekuest/blok') })
    },
    collections: ['io'],
  },
  'rekuest-export-materialized-blok': {
    title: 'Export…',
    description: 'Save this blok as a file to install elsewhere; which agents it runs on stays here',
    icon: Share,
    conditions: only('@rekuest/materialized_blok'),
    execute: async ({ services, state, dialog }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const { data } = await services.rekuest.client.query<MaterializedBlokQuery, MaterializedBlokQueryVariables>({
        query: MaterializedBlokDocument,
        variables: { id: selected(state, '@rekuest/materialized_blok') },
      })
      const blok = data.materializedBlok
      dialog.openDialog('exportblok', {
        id: blok.blok.id,
        name: blok.name || blok.blok.name,
        heldAt: blok.pinnedRevision?.number ?? null,
      })
    },
    collections: ['io'],
  },
  'rekuest-fork-blok': {
    title: 'Fork Template',
    description: 'Copy a template an app provides into one of your own, to edit it or run it on other agents',
    icon: Copy,
    conditions: only('@rekuest/blok'),
    execute: async ({ services, state, dialog }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const { data } = await services.rekuest.client.query<GetBlokQuery, GetBlokQueryVariables>({
        query: GetBlokDocument,
        variables: { id: selected(state, '@rekuest/blok') },
      })
      if (!data.blok.provided) {
        throw new Error(`${data.blok.name} is already yours to change; only a template an app provides is forked`)
      }
      dialog.openDialog('forkblok', { id: data.blok.id, name: data.blok.name })
    },
    collections: ['io'],
  },
  'rekuest-edit-blok': {
    title: 'Edit Template',
    description: 'Open a template as BSX, with a live preview, to change it and every blok made from it',
    icon: Code,
    conditions: only('@rekuest/blok'),
    execute: async ({ state, navigate }) => {
      navigate(`/rekuest/bloks/${selected(state, '@rekuest/blok')}/edit`)
    },
  },
  'rekuest-edit-materialized-blok': {
    title: 'Edit',
    description: 'Change this blok in BSX, running live on its agents as you type; one an app provides is made your own first',
    icon: Code,
    conditions: only('@rekuest/materialized_blok'),
    execute: async ({ state, navigate }) => {
      navigate(`/rekuest/materialized_bloks/${selected(state, '@rekuest/materialized_blok')}/edit`)
    },
  },
  'rekuest-pin-materialized-blok': {
    title: 'Pin Blok',
    description: 'Pin or unpin this blok for yourself: pinned ones come first, on Home and in ⌘K',
    icon: Pin,
    conditions: only('@rekuest/materialized_blok'),
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const id = selected(state, '@rekuest/materialized_blok')
      const { data } = await services.rekuest.client.query<MaterializedBlokQuery, MaterializedBlokQueryVariables>({
        query: MaterializedBlokDocument,
        variables: { id },
      })
      await services.rekuest.client.mutate<PinMaterializedBlokMutation, PinMaterializedBlokMutationVariables>({
        mutation: PinMaterializedBlokDocument,
        variables: { input: { id, pin: !data.materializedBlok.pinned } },
        refetchQueries: PIN_REFETCH,
      })
    },
  },
  'rekuest-choose-revision': {
    title: 'Choose Revision',
    description: "Keep a blok at one revision of its template, or let it follow the latest",
    icon: History,
    conditions: only('@rekuest/materialized_blok'),
    execute: async ({ state, dialog }) => {
      dialog.openDialog('pinrevision', { id: selected(state, '@rekuest/materialized_blok') })
    },
  },
  'rekuest-follow-latest-revision': {
    title: 'Follow Latest Revision',
    description: 'Let a blok held at one revision show its template\'s latest revision again',
    icon: RotateCcw,
    conditions: only('@rekuest/materialized_blok'),
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const id = selected(state, '@rekuest/materialized_blok')
      const { data } = await services.rekuest.client.query<MaterializedBlokQuery, MaterializedBlokQueryVariables>({
        query: MaterializedBlokDocument,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      if (!data.materializedBlok.pinnedRevision) {
        throw new Error(`${data.materializedBlok.name || data.materializedBlok.blok.name} already follows the latest revision`)
      }
      await services.rekuest.client.mutate<PinMaterializedBlokRevisionMutation, PinMaterializedBlokRevisionMutationVariables>({
        mutation: PinMaterializedBlokRevisionDocument,
        variables: { input: { id, revision: null } },
      })
    },
  },
  'rekuest-materialize-blok': {
    title: 'Install…',
    description: 'Make a blok of this template, running on your agents, and open it',
    icon: Download,
    conditions: only('@rekuest/blok'),
    execute: async ({ state, dialog }) => {
      dialog.openDialog('materializeblok', { id: selected(state, '@rekuest/blok') })
    },
  },
  'rekuest-rematerialize-blok': {
    title: 'Install Again…',
    description: 'Make another blok of the same template, on the same agents to start with; one an app provides is forked first',
    icon: RefreshCw,
    conditions: only('@rekuest/materialized_blok'),
    execute: async ({ state, dialog }) => {
      dialog.openDialog('rematerializeblok', { id: selected(state, '@rekuest/materialized_blok') })
    },
  },
  'rekuest-delete-blok': {
    title: 'Delete Template',
    description: 'Delete the template and return to the template list',
    icon: Trash2,
    conditions: [
      {
        type: 'identifier',
        identifier: '@rekuest/blok'
      },
      {
        type: 'nopartner'
      }
    ],
    execute: async ({ services, state, navigate }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }

      for (const structure of state.left) {
        if (structure.identifier !== '@rekuest/blok') {
          continue
        }

        await services.rekuest.client.mutate<DeleteBlokMutation, DeleteBlokMutationVariables>({
          mutation: DeleteBlokDocument,
          variables: {
            input: {
              id: structure.id,
            },
          },
        })

        services.rekuest.client.cache.evict({
          id: services.rekuest.client.cache.identify({
            __typename: 'Blok',
            id: structure.id,
          }),
        })
      }

      services.rekuest.client.cache.gc()
      navigate('/rekuest/bloks')
    },
    collections: ['io'],
  },
  'rekuest-delete-materialized-blok': {
    title: 'Delete Blok',
    description: 'Delete the blok and return to the list; its template stays',
    icon: Trash2,
    conditions: [
      {
        type: 'identifier',
        identifier: '@rekuest/materialized_blok'
      },
      {
        type: 'nopartner'
      }
    ],
    execute: async ({ services, state, navigate }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }

      for (const structure of state.left) {
        if (structure.identifier !== '@rekuest/materialized_blok') {
          continue
        }

        // What an agent declares is the agent's: it is forked, never deleted.
        const { data } = await services.rekuest.client.query<MaterializedBlokQuery, MaterializedBlokQueryVariables>({
          query: MaterializedBlokDocument,
          variables: { id: structure.id },
        })
        const declared = data.materializedBlok
        if (declared?.declaredBy) {
          throw new Error(
            `${declared.name || declared.blok.name} belongs to ${declared.declaredBy.name}; it cannot be deleted. Install it again to make one of your own.`,
          )
        }

        await services.rekuest.client.mutate<DeleteMaterializedBlokMutation, DeleteMaterializedBlokMutationVariables>({
          mutation: DeleteMaterializedBlokDocument,
          variables: {
            input: {
              id: structure.id,
            },
          },
        })

        services.rekuest.client.cache.evict({
          id: services.rekuest.client.cache.identify({
            __typename: 'MaterializedBlok',
            id: structure.id,
          }),
        })
      }

      services.rekuest.client.cache.gc()
      navigate('/rekuest/materialized_bloks')
    },
    collections: ['io'],
  },
  'rekuest-delete-dashboard': {
    title: 'Delete Dashboard',
    description: 'Delete the dashboard and return to the dashboard list',
    icon: Trash2,
    conditions: [
      {
        type: 'identifier',
        identifier: '@rekuest/dashboard'
      },
      {
        type: 'nopartner'
      }
    ],
    execute: async ({ services, state, navigate }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }

      for (const structure of state.left) {
        if (structure.identifier !== '@rekuest/dashboard') {
          continue
        }

        await services.rekuest.client.mutate<DeleteDashboardMutation, DeleteDashboardMutationVariables>({
          mutation: DeleteDashboardDocument,
          variables: {
            input: {
              id: structure.id,
            },
          },
        })

        services.rekuest.client.cache.evict({
          id: services.rekuest.client.cache.identify({
            __typename: 'Dashboard',
            id: structure.id,
          }),
        })
      }

      services.rekuest.client.cache.gc()
      navigate('/rekuest/dashboards')
    },
    collections: ['io'],
  },
  'rekuest-delete-agent': buildDeleteAction({
    title: 'Delete Agent',
    identifier: '@rekuest/agent',
    description: 'Delete the agent',
    service: 'rekuest',
    typename: 'Agent',
    mutation: DeleteAgentDocument
  }),
  'rekuest-delete-shortcut': buildDeleteAction({
    title: 'Delete Shortcut',
    identifier: '@rekuest/shortcut',
    description: 'Delete the shortcut',
    service: 'rekuest',
    typename: 'Shortcut',
    mutation: DeleteShortcutDocument
  }),
  'rekuest-bind-shortcut': {
    title: 'Pin for…',
    description: 'Pin this shortcut at the top of menus, for chosen members, apps, clients or devices',
    icon: Pin,
    roles: REKUEST_ADMIN,
    conditions: only('@rekuest/shortcut'),
    execute: async ({ state, dialog }) => {
      dialog.openDialog('bindshortcut', { id: selected(state, '@rekuest/shortcut') })
    },
  },
  'rekuest-pin-agent': {
    title: 'Pin Agent',
    icon: Pin,
    conditions: [
      {
        type: 'identifier',
        identifier: '@rekuest/agent'
      }
    ],
    description: 'Pin or unpin this agent',
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }

      for (const structure of state.left) {
        if (structure.identifier !== '@rekuest/agent') {
          continue
        }

        // The pin state is the agent's, not the structure's: read it from
        // rekuest (usually a cache hit from the card that was clicked).
        const { data } = await services.rekuest.client.query<AgentQuery, AgentQueryVariables>({
          query: AgentDocument,
          variables: { id: structure.id },
        })

        await services.rekuest.client.mutate<PinAgentMutation, PinAgentMutationVariables>({
          mutation: PinAgentDocument,
          variables: {
            input: {
              id: structure.id,
              pin: !data.agent.pinned,
            },
          },
          refetchQueries: ['Pinned'],
        })
      }
    },
  },

  'rekuest-bounce-agent': {
    title: 'Bounce Agent',
    icon: RotateCcw,
    conditions: [
      {
        type: 'identifier',
        identifier: '@rekuest/agent'
      }
    ],
    description: 'Restart the agent process',
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const client = services.rekuest.client

      state.left.forEach(async (structure) => {
        if (structure.identifier !== '@rekuest/agent') {
          return
        }
        await client.mutate<BounceMutation, BounceMutationVariables>({
          mutation: BounceDocument,
          variables: {
            input: { agent: structure.id }
          }
        })
      })
    }
  },
  'rekuest-kick-agent': {
    title: 'Kick Agent',
    icon: LogOut,
    conditions: [
      {
        type: 'identifier',
        identifier: '@rekuest/agent'
      }
    ],
    description: 'Restart the agent process',
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const client = services.rekuest.client

      state.left.forEach(async (structure) => {
        if (structure.identifier !== '@rekuest/agent') {
          return
        }
        await client.mutate<KickMutation, KickMutationVariables>({
          mutation: KickDocument,
          variables: {
            input: { agent: structure.id }
          }
        })
      })
    }
  },
  'rekuest-block-agent': {
    title: 'Block Agent',
    icon: Ban,
    conditions: [
      {
        type: 'identifier',
        identifier: '@rekuest/agent'
      }
    ],
    description: 'Restart the agent process',
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const client = services.rekuest.client

      state.left.forEach(async (structure) => {
        if (structure.identifier !== '@rekuest/agent') {
          return
        }
        await client.mutate<BlockMutation, BlockMutationVariables>({
          mutation: BlockDocument,
          variables: {
            input: { agent: structure.id }
          }
        })
      })
    }
  },
  'rekuest-unblock-agent': {
    title: 'Unblock Agent',
    icon: ShieldCheck,
    conditions: [
      {
        type: 'identifier',
        identifier: '@rekuest/agent'
      }
    ],
    description: 'Restart the agent process',
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const client = services.rekuest.client

      state.left.forEach(async (structure) => {
        if (structure.identifier !== '@rekuest/agent') {
          return
        }
        await client.mutate<UnblockMutation, UnblockMutationVariables>({
          mutation: UnblockDocument,
          variables: {
            input: { agent: structure.id }
          }
        })
      })
    }
  },
  'rekuest-create-shortcut-from-implementation': {
    title: 'Create Shortcut',
    description: 'Create a shortcut for this action',
    icon: Bookmark,
    conditions: [
      {
        type: 'identifier',
        identifier: '@rekuest/implementation',
      },
      {
        type: 'nopartner',
      },
    ],
    execute: async ({ services, state, dialog }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }

      const structure = state.left.find(
        (item) => item.identifier === '@rekuest/implementation',
      )

      if (!structure?.id) {
        throw new Error('No implementation selected')
      }

      const { data } = await services.rekuest.client.query<
        ImplementationQuery,
        ImplementationQueryVariables
      >({
        query: ImplementationDocument,
        variables: { id: structure.id },
        fetchPolicy: 'cache-first',
      })

      if (!data?.implementation?.action?.id) {
        throw new Error('Could not load action for this implementation')
      }

      dialog.openDialog('createshortcut', { id: data.implementation.action.id, implementation: structure.id })
    },
    collections: ['io'],
  },
  'rekuest-assign-action': {
    title: 'Run Action',
    description: 'Fill in the arguments and assign this action',
    icon: Play,
    pinned: true,
    conditions: ACTION_CONDITIONS,
    execute: async ({ state, dialog }) => {
      const structure = state.left.find(
        (item) => item.identifier === ACTION_IDENTIFIER,
      )

      if (!structure?.id) {
        throw new Error('No action selected')
      }

      dialog.openDialog('assign', { target: { action: structure.id } })
    },
    collections: ['io'],
  },
  'rekuest-create-shortcut-from-action': {
    title: 'Create Shortcut',
    description: 'Create a shortcut for this action',
    icon: Bookmark,
    conditions: ACTION_CONDITIONS,
    execute: async ({ state, dialog }) => {
      const structure = state.left.find(
        (item) => item.identifier === ACTION_IDENTIFIER,
      )

      if (!structure?.id) {
        throw new Error('No action selected')
      }

      dialog.openDialog('createshortcut', { id: structure.id })
    },
    collections: ['io'],
  },
  'rekuest-schedule-action': {
    title: 'Schedule…',
    description: 'Run this action on a clock: every few minutes, or on a calendar',
    icon: AlarmClock,
    conditions: ACTION_CONDITIONS,
    execute: async ({ state, dialog }) => {
      dialog.openDialog('createautomation', { kind: 'clock', action: selected(state, ACTION_IDENTIFIER) })
    },
    collections: ['io'],
  },
  'rekuest-trigger-action': {
    title: 'Run on Signal…',
    description: 'Run this action whenever a service signals a matching object',
    icon: Zap,
    conditions: ACTION_CONDITIONS,
    execute: async ({ state, dialog }) => {
      dialog.openDialog('createautomation', { kind: 'signal', action: selected(state, ACTION_IDENTIFIER) })
    },
    collections: ['io'],
  },
  'rekuest-auto-list-action': {
    title: 'Run Without Asking',
    description: 'Put this action on your auto list, or take it off: under your runs an agent that asks for it gets it without a hold',
    icon: Zap,
    conditions: ACTION_CONDITIONS,
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const client = services.rekuest.client
      const action = selected(state, ACTION_IDENTIFIER)
      const { data } = await client.query<MyAllowancesQuery, MyAllowancesQueryVariables>({
        query: MyAllowancesDocument,
        variables: { action },
        fetchPolicy: 'network-only',
      })
      const rules = data.myAllowances
      // Allowed for whoever asks: this takes it off, with the narrower rules for it.
      if (rules.some((rule) => !rule.askerKey)) {
        for (const rule of rules) {
          await client.mutate<RevokeAllowanceMutation, RevokeAllowanceMutationVariables>({
            mutation: RevokeAllowanceDocument,
            variables: { input: { id: rule.id } },
          })
        }
        await client.refetchQueries({ include: ['MyAllowances'] })
        toast.success('You are asked again before it runs')
        return
      }
      await client.mutate<AllowActionMutation, AllowActionMutationVariables>({
        mutation: AllowActionDocument,
        variables: { input: { action } },
        refetchQueries: ['MyAllowances'],
      })
      toast.success('It now runs without asking you')
    },
    collections: ['io'],
  },
  'rekuest-run-schedule-now': {
    title: 'Run Now',
    description: 'Start the next run of this schedule right away',
    icon: FastForward,
    pinned: true,
    conditions: only('@rekuest/schedule'),
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      await services.rekuest.client.mutate<TriggerScheduleMutation, TriggerScheduleMutationVariables>({
        mutation: TriggerScheduleDocument,
        variables: { id: selected(state, '@rekuest/schedule') },
        refetchQueries: ['Schedule'],
      })
      toast.success('Schedule started')
    },
    collections: ['io'],
  },
  'rekuest-toggle-schedule': {
    title: 'Pause / Resume',
    description: 'A paused schedule creates no runs',
    icon: ToggleLeft,
    conditions: only('@rekuest/schedule'),
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const id = selected(state, '@rekuest/schedule')
      const { data } = await services.rekuest.client.query<ScheduleEnabledQuery, ScheduleEnabledQueryVariables>({
        query: ScheduleEnabledDocument,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      const enabled = !data.schedule.enabled
      await services.rekuest.client.mutate<UpdateScheduleMutation, UpdateScheduleMutationVariables>({
        mutation: UpdateScheduleDocument,
        variables: { input: { id, enabled } },
      })
      toast.success(enabled ? 'Schedule resumed' : 'Schedule paused')
    },
    collections: ['io'],
  },
  'rekuest-edit-schedule': {
    title: 'Edit Schedule',
    description: 'Change when it runs and with what',
    icon: Pencil,
    conditions: only('@rekuest/schedule'),
    execute: async ({ state, dialog }) => {
      dialog.openDialog('editschedule', { id: selected(state, '@rekuest/schedule') })
    },
    collections: ['io'],
  },
  'rekuest-duplicate-schedule': {
    title: 'Duplicate Schedule',
    description: 'Start a new automation from a copy of this one',
    icon: Copy,
    conditions: only('@rekuest/schedule'),
    execute: async ({ services, state, dialog }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const { data } = await services.rekuest.client.query<ScheduleQuery, ScheduleQueryVariables>({
        query: ScheduleDocument,
        variables: { id: selected(state, '@rekuest/schedule') },
      })
      dialog.openDialog('createautomation', {
        initial: { ...initialFromSchedule(data.schedule), name: `${data.schedule.name} copy` },
      })
    },
    collections: ['io'],
  },
  'rekuest-delete-schedule': buildDeleteAction({
    title: 'Delete Schedule',
    identifier: '@rekuest/schedule',
    description: 'Delete the schedule; its waiting run is cancelled, past runs are kept',
    service: 'rekuest',
    typename: 'Schedule',
    mutation: DeleteScheduleDocument
  }),
  'rekuest-deadman-task': {
    title: 'Stop When I Leave',
    description:
      "Tie this run to this window: it is cancelled once the window has been gone a while (the dead man switch). Run again on a tied run to untie it, so it keeps running when you leave",
    icon: Unplug,
    conditions: only('@rekuest/task'),
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const id = selected(state, '@rekuest/task')
      const { data } = await services.rekuest.client.query<DetailTaskQuery, DetailTaskQueryVariables>({
        query: DetailTaskDocument,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      if (data.task.isDone) {
        toast.info('This task has ended: there is nothing to keep or stop')
        return
      }
      const session = sessionOf(services.rekuest)
      if (data.task.deadmanArmed) {
        await setDeadman(session, id, null)
        toast.success('It keeps running when you leave')
      } else {
        await setDeadman(session, id, DEFAULT_DEADMAN_SECONDS)
        toast.success(`Tied to this window: it stops ${DEFAULT_DEADMAN_SECONDS} s after the window goes`)
      }
      await services.rekuest.client.refetchQueries({ include: [DetailTaskDocument] })
    },
    collections: ['io'],
  },
  'rekuest-share-workflow': {
    title: 'Share workflow',
    description:
      'Put everything this workflow made, on every service, in a collaboration: see what it would share first',
    icon: Share2,
    conditions: only('@rekuest/task'),
    execute: async ({ state, dialog }) => {
      dialog.openDialog('shareworkflow', { task: selected(state, '@rekuest/task') })
    },
  },
  'rekuest-pause-resume-task': {
    title: 'Pause / Resume',
    description:
      'Pause a running task, or resume a paused one — including a workflow that held itself for a decision',
    icon: PauseCircle,
    conditions: only('@rekuest/task'),
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const id = selected(state, '@rekuest/task')
      const { data } = await services.rekuest.client.query<TaskQuery, TaskQueryVariables>({
        query: TaskDocument,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      const session = sessionOf(services.rekuest)
      if (isResumable(data.task)) {
        await controlTask(session, 'RESUME', id)
        toast.success('Resuming task')
      } else if (isPausable(data.task)) {
        await controlTask(session, 'PAUSE', id)
        toast.success('Pausing task')
      } else {
        toast.info('This task is not running, so it cannot be paused')
      }
    },
    collections: ['io'],
  },
  'rekuest-toggle-trigger': {
    title: 'Enable / Disable',
    description: 'A disabled trigger fires nothing',
    icon: ToggleLeft,
    conditions: only('@rekuest/trigger'),
    execute: async ({ services, state }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const id = selected(state, '@rekuest/trigger')
      const { data } = await services.rekuest.client.query<TriggerEnabledQuery, TriggerEnabledQueryVariables>({
        query: TriggerEnabledDocument,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      const enabled = !data.trigger.enabled
      await services.rekuest.client.mutate<UpdateTriggerMutation, UpdateTriggerMutationVariables>({
        mutation: UpdateTriggerDocument,
        variables: { input: { id, enabled } },
      })
      toast.success(enabled ? 'Trigger enabled' : 'Trigger disabled')
    },
    collections: ['io'],
  },
  'rekuest-edit-trigger': {
    title: 'Edit Trigger',
    description: 'Change its conditions and arguments',
    icon: Pencil,
    conditions: only('@rekuest/trigger'),
    execute: async ({ state, dialog }) => {
      dialog.openDialog('edittrigger', { id: selected(state, '@rekuest/trigger') })
    },
    collections: ['io'],
  },
  'rekuest-duplicate-trigger': {
    title: 'Duplicate Trigger',
    description: 'Start a new automation from a copy of this one',
    icon: Copy,
    conditions: only('@rekuest/trigger'),
    execute: async ({ services, state, dialog }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const { data } = await services.rekuest.client.query<TriggerQuery, TriggerQueryVariables>({
        query: TriggerDocument,
        variables: { id: selected(state, '@rekuest/trigger') },
      })
      dialog.openDialog('createautomation', {
        initial: { ...initialFromTrigger(data.trigger), name: `${data.trigger.name} copy` },
      })
    },
    collections: ['io'],
  },
  'rekuest-delete-trigger': buildDeleteAction({
    title: 'Delete Trigger',
    identifier: '@rekuest/trigger',
    description: 'Delete the trigger; its runs are kept',
    service: 'rekuest',
    typename: 'Trigger',
    mutation: DeleteTriggerDocument
  }),
  'rekuest-automate-signal': {
    title: 'Run Something on This…',
    description: 'Make an automation for signals like this one; its values are offered as conditions',
    icon: Zap,
    conditions: only('@rekuest/signal'),
    execute: async ({ services, state, dialog }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const { data } = await services.rekuest.client.query<SignalQuery, SignalQueryVariables>({
        query: SignalDocument,
        variables: { id: selected(state, '@rekuest/signal') },
      })
      const { identifier, kind, descriptors } = data.signal
      dialog.openDialog('createautomation', {
        kind: 'signal',
        identifier,
        signalKind: kind,
        sample: descriptors && typeof descriptors === 'object' ? descriptors : undefined,
      })
    },
    collections: ['io'],
  },
  'rekuest-fire-trigger-on-signal': {
    title: 'Fire a Trigger…',
    description: 'Run one of the triggers listening for this signal on it now',
    icon: RotateCcw,
    conditions: only('@rekuest/signal'),
    execute: async ({ state, dialog }) => {
      dialog.openDialog('firetrigger', { signal: selected(state, '@rekuest/signal') })
    },
    collections: ['io'],
  },
  'rekuest-fire-trigger-with-signal': {
    title: 'Fire on This Signal',
    description: 'Run the trigger on the signal now, whether or not the signal satisfies it',
    icon: RotateCcw,
    conditions: [
      { type: 'identifier', identifier: '@rekuest/signal' },
      { type: 'pidentifier', identifier: '@rekuest/trigger' },
    ],
    execute: async ({ state, dialog }) => {
      const trigger = state.right?.[0]
      if (!trigger?.id) {
        throw new Error('Drop the signal onto a trigger')
      }
      dialog.openDialog('firetrigger', { signal: selected(state, '@rekuest/signal'), trigger: trigger.id })
    },
    collections: ['io'],
  },
  'rekuest-export-automations': {
    title: 'Export as Wiregram…',
    description: 'Write the selected schedules and triggers down as a document to import elsewhere',
    icon: Share,
    conditions: [
      { type: 'mixture', identifiers: ['@rekuest/schedule', '@rekuest/trigger'] },
      { type: 'nopartner' },
    ],
    execute: async ({ state, dialog }) => {
      const ids = (identifier: string) =>
        state.left.filter((item) => item.identifier === identifier).map((item) => item.id)
      dialog.openDialog('exportwiregram', {
        schedules: ids('@rekuest/schedule'),
        triggers: ids('@rekuest/trigger'),
      })
    },
    collections: ['io'],
  },
  'rekuest-reimport-wiregram': {
    title: 'Import Again…',
    description: 'Import its document again, edited or as it is, to bring its rules in line',
    icon: Upload,
    conditions: only('@rekuest/wiregram'),
    execute: async ({ services, state, dialog }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }
      const { data } = await services.rekuest.client.query<WiregramQuery, WiregramQueryVariables>({
        query: WiregramDocument,
        variables: { id: selected(state, '@rekuest/wiregram') },
      })
      dialog.openDialog('importwiregram', { document: data.wiregram.document })
    },
    collections: ['io'],
  },
  'rekuest-delete-wiregram': buildDeleteAction({
    title: 'Delete Wiregram',
    identifier: '@rekuest/wiregram',
    description: 'Delete the wiregram and the schedules and triggers it owns; their past runs are kept',
    service: 'rekuest',
    typename: 'Wiregram',
    mutation: DeleteWiregramDocument
  }),
  'rekuest-copy-action-hash': {
    title: 'Copy Hash',
    description: 'Copy the hash that identifies this action definition',
    icon: Hash,
    conditions: ACTION_CONDITIONS,
    execute: async ({ services, state }) => {
      const structure = state.left.find(
        (item) => item.identifier === ACTION_IDENTIFIER,
      )

      if (!structure?.id) {
        throw new Error('No action selected')
      }

      // A structure carries only its id; the hash is rekuest's to answer
      // (cache-first, so a card that already showed it costs nothing).
      let hash: string | undefined

      if (!hash) {
        if (!services.rekuest) {
          throw new Error('Rekuest service not available')
        }

        const { data } = await services.rekuest.client.query<
          ActionHashQuery,
          ActionHashQueryVariables
        >({
          query: ActionHashDocument,
          variables: { id: structure.id },
          fetchPolicy: 'cache-first',
        })

        hash = data?.action?.hash
      }

      if (!hash) {
        throw new Error('Could not load the hash for this action')
      }

      await navigator.clipboard.writeText(hash)
      toast.success('Action hash copied')
    },
    collections: ['io'],
  },
  'rekuest-cleanup-action': {
    title: 'Clean Up Action',
    description: 'Remove this action if nothing references it anymore',
    icon: Eraser,
    conditions: ACTION_CONDITIONS,
    execute: async ({ services, state, confirm, modifiers }) => {
      if (!services.rekuest) {
        throw new Error('Rekuest service not available')
      }

      // The identifier condition matches when ANY selected item matches, so a
      // mixed selection can include other types — never pass those on.
      const actionIds = state.left
        .filter((item) => item.identifier === ACTION_IDENTIFIER)
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id))

      if (actionIds.length === 0) {
        return
      }

      if (!modifiers.ctrlKey) {
        const confirmed = await confirm({
          title:
            actionIds.length > 1
              ? `Clean up ${actionIds.length} actions?`
              : 'Clean up this action?',
          description:
            'Only unreferenced actions are removed; ones still in use are left alone. This action cannot be undone. To skip this dialog, hold Ctrl when doing it.',
          confirmLabel: 'Clean up',
          cancelLabel: 'Keep',
          destructive: true,
        })

        if (!confirmed) {
          return
        }
      }

      const client = services.rekuest.client
      const { data } = await client.mutate<
        CleanupActionsMutation,
        CleanupActionsMutationVariables
      >({
        mutation: CleanupActionsDocument,
        variables: { actionIds },
      })

      const removed = data?.cleanupActions ?? 0

      if (removed > 0) {
        // The mutation only reports a count, so drop the cached lists rather
        // than guessing which of the selected actions went away.
        client.cache.evict({ id: 'ROOT_QUERY', fieldName: 'actions' })
        client.cache.gc()
        toast.success(`Cleaned up ${removed} action${removed === 1 ? '' : 's'}`)
      } else {
        toast.info('Nothing to clean up — the action is still referenced')
      }
    },
    collections: ['io'],
  },
} as const
