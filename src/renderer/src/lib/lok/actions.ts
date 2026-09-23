import { Action } from '../localactions/LocalActionProvider'
import { BellRing, Building2 } from 'lucide-react'

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
        .map((item) => item.object.id)

      dialog.openDialog('notifyusers', { users }, { size: 'medium' })
    }
  },
  add_user_to_organization: {
    title: 'Add to organization',
    description: 'Add the user to the organization this profile acts in',
    icon: Building2,
    conditions: [{ type: 'identifier', identifier: '@lok/user' }, { type: 'nopartner' }],
    collections: ['notify'],
    execute: async ({ state, dialog }) => {
      const users = state.left
        .filter((item) => item.identifier === '@lok/user')
        .map((item) => item.object.id)

      dialog.openSheet('addusertoorganization', { users }, { className: 'max-w-4xl' })
    }
  }
} as const satisfies Record<string, Action>
