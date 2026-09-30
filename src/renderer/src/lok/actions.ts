import { Action } from '@/core/smart/localactions/LocalActionProvider'
import { BellRing, Building2, ShieldOff } from 'lucide-react'
import { ADMIN_ROLE } from '@/core/connection/roles'

export const LOK_ACTIONS = {
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

      dialog.openSheet('addusertoorganization', { users }, { className: 'max-w-4xl' })
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
