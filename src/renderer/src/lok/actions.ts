import { Action } from '@/core/smart/localactions/LocalActionProvider'
import { BellRing, Building2, CheckCircle2, Link2, Pencil, ShieldOff, Trash2 } from 'lucide-react'
import { ADMIN_ROLE } from '@/core/connection/roles'

/** The collaboration a local action runs on: the first selected, by its key. */
const pickedCollaboration = (items: readonly { identifier: string; id: string }[]): string => {
  const collaboration = items.find((item) => item.identifier === '@lok/collaboration')
  if (!collaboration) throw new Error('Which collaboration?')
  return String(collaboration.id)
}

export const LOK_ACTIONS = {
  share_collaboration: {
    title: 'Share',
    description: 'Make a link that grants this collaboration to whoever accepts it',
    icon: Link2,
    conditions: [{ type: 'identifier', identifier: '@lok/collaboration' }, { type: 'nopartner' }],
    execute: async ({ state, dialog }) => {
      dialog.openDialog('sharecollaboration', { collaboration: pickedCollaboration(state.left) }, { size: 'medium' })
    }
  },
  rename_collaboration: {
    title: 'Rename',
    description: 'Change the collaboration\'s name or description',
    icon: Pencil,
    conditions: [{ type: 'identifier', identifier: '@lok/collaboration' }, { type: 'nopartner' }],
    execute: async ({ state, dialog }) => {
      dialog.openDialog('updatecollaboration', { collaboration: pickedCollaboration(state.left) }, { size: 'small' })
    }
  },
  delete_collaboration: {
    title: 'Delete Collaboration',
    description: 'Take the collaboration from everyone it was shared with',
    icon: Trash2,
    conditions: [{ type: 'identifier', identifier: '@lok/collaboration' }, { type: 'nopartner' }],
    execute: async ({ state, dialog }) => {
      dialog.openDialog('deletecollaboration', { collaboration: pickedCollaboration(state.left) }, { size: 'small' })
    }
  },
  notify_user: {
    description: "Push a message to the user's registered phones",
    title: 'Notify + send message',
    icon: BellRing,
    conditions: [{ type: 'identifier', identifier: '@lok/user' }, { type: 'nopartner' }],
    collections: ['notify'],
    execute: async ({ state, dialog }) => {
      const users = state.left
        .filter((item) => item.identifier === '@lok/user')
        .map((item) => item.id)

      dialog.openDialog('notifyusers', { users }, { size: 'medium' })
    }
  },
  add_user_to_organization: {
    title: 'Add to organization',
    description: 'Add the user to the organization this profile acts in',
    icon: Building2,
    conditions: [{ type: 'identifier', identifier: '@lok/user' }, { type: 'nopartner' }],
    roles: ADMIN_ROLE,
    collections: ['notify'],
    execute: async ({ state, dialog }) => {
      const users = state.left
        .filter((item) => item.identifier === '@lok/user')
        .map((item) => item.id)

      dialog.openSheet('addusertoorganization', { users }, { size: 'large' })
    }
  },
  resolve_bug_report: {
    title: 'Resolve report',
    description: 'Close this bug report, with a note',
    icon: CheckCircle2,
    conditions: [{ type: 'identifier', identifier: '@lok/bugreport' }, { type: 'nopartner' }],
    roles: ADMIN_ROLE,
    execute: async ({ state, dialog }) => {
      const report = state.left.find((item) => item.identifier === '@lok/bugreport')
      if (!report) return

      dialog.openDialog('resolvebugreport', { id: String(report.id) }, { size: 'small' })
    }
  },
  revoke_mandate: {
    title: 'Revoke mandate',
    description: 'Sign out every app started under it and stop new ones',
    icon: ShieldOff,
    conditions: [{ type: 'identifier', identifier: '@lok/mandate' }, { type: 'nopartner' }],
    execute: async ({ state, dialog }) => {
      const ids = state.left
        .filter((item) => item.identifier === '@lok/mandate')
        .map((item) => String(item.id))

      dialog.openDialog('revokemandate', { ids }, { size: 'small' })
    }
  }
} as const satisfies Record<string, Action>
