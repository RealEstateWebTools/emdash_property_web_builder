#!/usr/bin/env node
/**
 * Schema-only seed: bring an existing database's collection and field
 * definitions in line with a seed profile, without touching content.
 *
 * `pnpm seed` skips collections and fields that already exist, so a changed
 * field definition (e.g. a repeater's sub-fields) never reaches an existing
 * database. This applies just the profile's `collections` with
 * `--on-conflict update`: EmDash resets collection settings and field
 * definitions to the seed's and adds missing fields; entries, media, menus,
 * widgets and site settings are left alone. Fields added in the admin but
 * absent from the seed are kept (seed apply never removes fields).
 *
 * Usage:
 *   pnpm seed:schema                 # full profile, ./data.db
 *   pnpm seed:schema minimal         # another profile
 *   pnpm seed:schema full --database path/to/data.db
 *
 * Production follows with `pnpm sync:prod-db`, which pushes the field
 * definitions along with everything else.
 */

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const PROFILES = {
  full: 'seed/profiles/full.json',
  minimal: 'seed/profiles/minimal.json',
  'pre-launch': 'seed/profiles/pre-launch.json',
}

const args = process.argv.slice(2)
const profileName = args[0] && !args[0].startsWith('--') ? args.shift() : (process.env.SEED_PROFILE ?? 'full')

if (!PROFILES[profileName]) {
  console.error(`Unknown profile: "${profileName}"`)
  console.error(`Available profiles: ${Object.keys(PROFILES).join(', ')}`)
  process.exit(1)
}

const seed = JSON.parse(readFileSync(resolve(projectRoot, PROFILES[profileName]), 'utf8'))
const schemaSeed = { $schema: seed.$schema, version: seed.version, collections: seed.collections ?? [] }

const tmpDir = resolve(projectRoot, '.tmp')
mkdirSync(tmpDir, { recursive: true })
const schemaFile = resolve(tmpDir, `schema-${profileName}.json`)
writeFileSync(schemaFile, JSON.stringify(schemaSeed, null, '\t'))

console.log(`Updating collections and fields from profile: ${profileName} (${PROFILES[profileName]})`)

const proc = spawn('npx', ['emdash', 'seed', schemaFile, '--on-conflict', 'update', ...args], {
  stdio: 'inherit',
  shell: false,
  cwd: projectRoot,
})

proc.on('error', (err) => {
  console.error('Failed to run emdash seed:', err.message)
  process.exit(1)
})

proc.on('exit', (code) => {
  process.exit(code ?? 0)
})
