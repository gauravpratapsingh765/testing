import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'vlbzjlq6',   // ← same value as in sanity.config.js
    dataset: 'production'
  }
})
