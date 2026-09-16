import {
  DeleteProviderDocument,
  DeleteRoomDocument,
  RefreshProviderDocument,
  RefreshProviderMutation,
  RefreshProviderMutationVariables,
} from '@/alpaka/api/graphql'
import { ApolloClient, NormalizedCache } from '@apollo/client'
import { RefreshCw } from 'lucide-react'
import { buildDeleteAction } from "../localactions/builders/deleteAction";
import { Action } from "../localactions/LocalActionProvider";

const PROVIDER_IDENTIFIER = '@alpaka/provider'

/**
 * Ask alpaka to re-scan a provider and refresh its list of available models.
 * The mutation returns the full `Provider` fragment, so the normalized cache
 * updates the provider page (and any card listing it) in place.
 */
export const RescanProviderAction: Action = {
  title: 'Rescan Provider',
  description: 'Re-scan the provider and refresh its available models',
  icon: RefreshCw,
  pinned: true,
  conditions: [
    { type: 'identifier', identifier: PROVIDER_IDENTIFIER },
    { type: 'nopartner' },
  ],
  execute: async ({ services, state, onProgress }) => {
    const client = services.alpaka.client as ApolloClient<NormalizedCache>
    if (!client) {
      throw new Error('Alpaka service not available')
    }

    // The identifier condition matches when ANY selected item is a provider,
    // so a mixed selection can contain other types — only rescan providers.
    const targets = state.left.filter(
      (structure) => structure.identifier === PROVIDER_IDENTIFIER,
    )
    if (targets.length === 0) {
      return
    }

    const failures: { id: string; error: unknown }[] = []
    let done = 0
    for (const structure of targets) {
      const id = structure.object.id
      try {
        await client.mutate<RefreshProviderMutation, RefreshProviderMutationVariables>({
          mutation: RefreshProviderDocument,
          variables: { id },
        })
      } catch (error) {
        failures.push({ id, error })
        console.error(`Failed to rescan provider ${id}`, error)
      } finally {
        done += 1
        onProgress(Math.round((done / targets.length) * 100))
      }
    }

    if (failures.length > 0) {
      const succeeded = targets.length - failures.length
      throw new Error(
        `Rescanned ${succeeded} of ${targets.length} providers — ${failures.length} failed.`,
      )
    }
  },
  collections: ['io'],
}

export const ALPAKA_ACTIONS: Record<string, Action> = {
  'alpaka-delete-room': buildDeleteAction({
    title: 'Delete Room',
    identifier: '@alpaka/room',
    description: 'Delete the Graph',
    service: 'alpaka',
    typename: 'Room',
    mutation: DeleteRoomDocument
  }),
  'alpaka-delete-provider': buildDeleteAction({
    title: 'Delete Provider',
    identifier: PROVIDER_IDENTIFIER,
    description: 'Delete the Provider',
    service: 'alpaka',
    typename: 'Provider',
    mutation: DeleteProviderDocument
  }),
  'alpaka-rescan-provider': RescanProviderAction,
}
