import {
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
  DeleteBlokMutationVariables,
  DeleteDashboardDocument,
  DeleteDashboardMutation,
  DeleteDashboardMutationVariables,
  DeleteAgentDocument,
  DeleteMaterializedBlokDocument,
  DeleteMaterializedBlokMutation,
  DeleteMaterializedBlokMutationVariables,
  DeletePlacementDocument,
  DeleteShortcutDocument,
  DeleteSpaceDocument,
  ImplementationDocument,
  ImplementationQuery,
  ImplementationQueryVariables,
  KickDocument,
  KickMutation,
  KickMutationVariables,
  PinAgentDocument,
  PinAgentMutation,
  PinAgentMutationVariables,
  UnblockDocument,
  UnblockMutation,
  UnblockMutationVariables
} from '@/rekuest/api/graphql'
import type { Arkitekt } from '@/app/Arkitekt'
import { buildDeleteAction } from '@/lib/localactions/builders/deleteAction'
import { Action } from '@/lib/localactions/LocalActionProvider'
import { Ban, Bookmark, Eraser, Hash, LogOut, Pencil, Pin, Play, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type RekuestAction = Action<typeof Arkitekt>

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

      if (!selectedAgent?.object?.id) {
        throw new Error('No agent selected for Rename / Update Agent action')
      }

      const { data } = await services.rekuest.client.query<
        AgentQuery,
        AgentQueryVariables
      >({
        query: AgentDocument,
        variables: {
          id: selectedAgent.object.id,
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
  'rekuest-delete-blok': {
    title: 'Delete Blok',
    description: 'Delete the blok and return to the blok list',
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
              id: structure.object.id,
            },
          },
        })

        services.rekuest.client.cache.evict({
          id: services.rekuest.client.cache.identify({
            __typename: 'Blok',
            id: structure.object.id,
          }),
        })
      }

      services.rekuest.client.cache.gc()
      navigate('/rekuest/bloks')
    },
    collections: ['io'],
  },
  'rekuest-delete-materialized-blok': {
    title: 'Delete Materialized Blok',
    description: 'Delete the materialized blok and return to the list',
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

        await services.rekuest.client.mutate<DeleteMaterializedBlokMutation, DeleteMaterializedBlokMutationVariables>({
          mutation: DeleteMaterializedBlokDocument,
          variables: {
            input: {
              id: structure.object.id,
            },
          },
        })

        services.rekuest.client.cache.evict({
          id: services.rekuest.client.cache.identify({
            __typename: 'MaterializedBlok',
            id: structure.object.id,
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
              id: structure.object.id,
            },
          },
        })

        services.rekuest.client.cache.evict({
          id: services.rekuest.client.cache.identify({
            __typename: 'Dashboard',
            id: structure.object.id,
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
   'rekuest-delete-space': buildDeleteAction({
    title: 'Delete Space',
    identifier: '@rekuest/space',
    description: 'Delete the space',
    service: 'rekuest',
    typename: 'Space',
    mutation: DeleteSpaceDocument
  }),
  'rekuest-delete-placement': buildDeleteAction({
    title: 'Delete Placement',
    identifier: '@rekuest/placement',
    description: 'Delete the placement',
    service: 'rekuest',
    typename: 'Placement',
    mutation: DeletePlacementDocument // You would need to implement this mutation in your GraphQL API
  }),

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

        await services.rekuest.client.mutate<PinAgentMutation, PinAgentMutationVariables>({
          mutation: PinAgentDocument,
          variables: {
            input: {
              id: structure.object.id,
              pin: !structure.object.pinned,
            },
          },
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
            input: { agent: structure.object.id }
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
            input: { agent: structure.object.id }
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
            input: { agent: structure.object.id }
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
            input: { agent: structure.object.id }
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

      if (!structure?.object?.id) {
        throw new Error('No implementation selected')
      }

      const { data } = await services.rekuest.client.query<
        ImplementationQuery,
        ImplementationQueryVariables
      >({
        query: ImplementationDocument,
        variables: { id: structure.object.id },
        fetchPolicy: 'cache-first',
      })

      if (!data?.implementation?.action?.id) {
        throw new Error('Could not load action for this implementation')
      }

      dialog.openDialog('createshortcut', { id: data.implementation.action.id })
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

      if (!structure?.object?.id) {
        throw new Error('No action selected')
      }

      dialog.openDialog('actionassign', { id: structure.object.id })
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

      if (!structure?.object?.id) {
        throw new Error('No action selected')
      }

      dialog.openDialog('createshortcut', { id: structure.object.id })
    },
    collections: ['io'],
  },
  'rekuest-copy-action-hash': {
    title: 'Copy Hash',
    description: 'Copy the hash that identifies this action definition',
    icon: Hash,
    conditions: ACTION_CONDITIONS,
    execute: async ({ services, state }) => {
      const structure = state.left.find(
        (item) => item.identifier === ACTION_IDENTIFIER,
      )

      if (!structure?.object?.id) {
        throw new Error('No action selected')
      }

      // Lists and the detail page carry the hash on the object; a bare
      // `{ id }` structure (e.g. from a link) needs the lookup.
      const carried = structure.object.hash
      let hash: string | undefined =
        typeof carried === 'string' ? carried : undefined

      if (!hash) {
        if (!services.rekuest) {
          throw new Error('Rekuest service not available')
        }

        const { data } = await services.rekuest.client.query<
          ActionHashQuery,
          ActionHashQueryVariables
        >({
          query: ActionHashDocument,
          variables: { id: structure.object.id },
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
        .map((item) => item.object?.id)
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
