import {
  DeleteBackendDocument,
  GetReleaseApprovalDocument,
  GetReleaseApprovalQuery,
  GetReleaseApprovalQueryVariables,
  DeletePodDocument,
  ScanRepoDocument,
  ScanRepoMutation,
  ScanRepoMutationVariables,
} from '@/kabinet/api/graphql'
import { ApolloClient, NormalizedCache } from '@apollo/client'
import { Download, RefreshCw, Rocket, ShieldOff } from 'lucide-react'
import type { Service } from '@/core/connection/arkitekt/types'
import { buildDeleteAction } from '@/core/smart/localactions/builders/deleteAction'
import { Action } from '@/core/smart/localactions/LocalActionProvider'

const REPO_IDENTIFIER = '@kabinet/repo'
const RELEASE_IDENTIFIER = '@kabinet/release'
const APPROVAL_IDENTIFIER = '@kabinet/approval'

export const KABINET_ACTIONS: Record<string, Action> = {
  'install-release': {
    title: 'Install…',
    description: 'Authorize a deployer to run the release as you (deploy it afterwards)',
    icon: Download,
    conditions: [
      { type: 'identifier', identifier: RELEASE_IDENTIFIER },
      { type: 'nopartner' }
    ],
    execute: async ({ state, dialog }) => {
      const release = state.left.find((structure) => structure.identifier === RELEASE_IDENTIFIER)
      if (!release) {
        throw new Error('No release selected')
      }
      dialog.openDialog('installrelease', { release: String(release.id) }, { className: 'max-w-xl' })
    }
  },
  'deploy-release': {
    title: 'Deploy…',
    description: 'Start an installed release on a backend',
    icon: Rocket,
    conditions: [
      { type: 'identifier', identifier: RELEASE_IDENTIFIER },
      { type: 'nopartner' }
    ],
    execute: async ({ state, dialog }) => {
      const release = state.left.find((structure) => structure.identifier === RELEASE_IDENTIFIER)
      if (!release) {
        throw new Error('No release selected')
      }
      dialog.openDialog('deployrelease', { release: String(release.id) }, { className: 'max-w-xl' })
    }
  },
  'deploy-approval': {
    title: 'Deploy…',
    description: 'Start the approved release on a backend',
    icon: Rocket,
    conditions: [
      { type: 'identifier', identifier: APPROVAL_IDENTIFIER },
      { type: 'nopartner' }
    ],
    execute: async ({ state, dialog, services }) => {
      const approval = state.left.find((structure) => structure.identifier === APPROVAL_IDENTIFIER)
      if (!approval) {
        throw new Error('No approval selected')
      }
      const client = (services.kabinet as unknown as Service | undefined)
        ?.client as ApolloClient<NormalizedCache> | undefined
      if (!client) {
        throw new Error('Kabinet service not available')
      }
      // A structure carries only the approval's id; the dialog is per release.
      const { data } = await client.query<GetReleaseApprovalQuery, GetReleaseApprovalQueryVariables>({
        query: GetReleaseApprovalDocument,
        variables: { id: String(approval.id) },
        fetchPolicy: 'cache-first',
      })
      dialog.openDialog(
        'deployrelease',
        { release: data.releaseApproval.release.id, approval: String(approval.id) },
        { className: 'max-w-xl' },
      )
    }
  },
  'revoke-approval': {
    title: 'Revoke approval',
    description: 'Stop installs under it and sign its pods out',
    icon: ShieldOff,
    conditions: [
      { type: 'identifier', identifier: APPROVAL_IDENTIFIER },
      { type: 'nopartner' }
    ],
    execute: async ({ state, dialog }) => {
      const ids = state.left
        .filter((structure) => structure.identifier === APPROVAL_IDENTIFIER)
        .map((structure) => String(structure.id))
      dialog.openDialog('revokeapproval', { ids }, { size: 'small' })
    }
  },
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
        (structure) => structure.identifier === REPO_IDENTIFIER && structure.id
      )
      if (repos.length === 0) {
        throw new Error('No repository selected')
      }
      // `ScanRepo` selects the full Repo, so open pages update from the cache.
      for (const [index, repo] of repos.entries()) {
        await client.mutate<ScanRepoMutation, ScanRepoMutationVariables>({
          mutation: ScanRepoDocument,
          variables: { id: String(repo.id) }
        })
        onProgress?.(((index + 1) / repos.length) * 100)
      }
    }
  }
} as const
