import {
  DeleteBackendDocument,
  DeletePodDocument,
  ScanRepoDocument,
  ScanRepoMutation,
  ScanRepoMutationVariables,
} from '@/kabinet/api/graphql'
import { ApolloClient, NormalizedCache } from '@apollo/client'
import { RefreshCw } from 'lucide-react'
import type { Service } from '../arkitekt/types'
import { buildDeleteAction } from '../localactions/builders/deleteAction'
import { Action } from '../localactions/LocalActionProvider'

const REPO_IDENTIFIER = '@kabinet/repo'

export const KABINET_ACTIONS: Record<string, Action> = {
  'delete-pod': buildDeleteAction({
    title: 'Delete Agent',
    identifier: '@kabinet/pod',
    description: 'Delete the pod',
    service: 'kabinet',
    typename: 'Pod',
    mutation: DeletePodDocument
  }),
  'delete-backend': buildDeleteAction({
    title: 'Delete Backend',
    identifier: '@kabinet/backend',
    description: 'Delete the backend',
    service: 'kabinet',
    typename: 'Backend',
    mutation: DeleteBackendDocument
  }),
  'rescan-repo': {
    title: 'Rescan Repository',
    description: 'Read the manifest again and pick up new flavours',
    icon: RefreshCw,
    conditions: [
      { type: 'identifier', identifier: REPO_IDENTIFIER },
      { type: 'nopartner' }
    ],
    execute: async ({ services, state, onProgress }) => {
      // Same cast as `buildDeleteAction`: the deferred service type does not
      // resolve here, but every concrete service carries a `.client`.
      const client = (services.kabinet as unknown as Service | undefined)
        ?.client as ApolloClient<NormalizedCache> | undefined
      if (!client) {
        throw new Error('Kabinet service not available')
      }
      // Only the repos in a mixed selection; the condition matches on any.
      const repos = state.left.filter(
        (structure) => structure.identifier === REPO_IDENTIFIER && structure.object?.id
      )
      if (repos.length === 0) {
        throw new Error('No repository selected')
      }
      // `ScanRepo` selects the full Repo, so open pages update from the cache.
      for (const [index, repo] of repos.entries()) {
        await client.mutate<ScanRepoMutation, ScanRepoMutationVariables>({
          mutation: ScanRepoDocument,
          variables: { id: String(repo.object.id) }
        })
        onProgress?.(((index + 1) / repos.length) * 100)
      }
    }
  }
} as const
