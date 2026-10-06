import type { SandboxedPlugin } from 'emdash/plugin'
import { PROPERTIES_COLLECTION } from '../lib/listings/native-source.js'
import { withNewListingDefaults } from '../lib/listings/new-listing-defaults.js'

export default {
  hooks: {
    'content:beforeSave': {
      // New entries only: an update may carry just the fields being changed,
      // and filling the rest would overwrite stored values.
      handler: async (event: { content: Record<string, unknown>; collection: string; isNew: boolean }) => {
        if (event.collection !== PROPERTIES_COLLECTION || !event.isNew) return
        return withNewListingDefaults(event.content)
      },
    },
  },
} satisfies SandboxedPlugin
