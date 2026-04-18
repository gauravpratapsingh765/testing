// sanity-studio/sanity.config.js
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'

export default defineConfig({
  // ─── REPLACE THESE TWO VALUES ───────────────────────────────────────────────
  name: 'sri-sai-inter-college',
  title: 'Sri Sai Inter College — Blog CMS',
  projectId: 'vlbzjlq6',   // ← from sanity.io/manage
  dataset: 'production',          // ← usually 'production'
  // ────────────────────────────────────────────────────────────────────────────

  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
})
