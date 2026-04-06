#!/usr/bin/env node
/**
 * Seed profile runner.
 *
 * Selects a seed file by profile name and runs `emdash seed` against it.
 *
 * Usage:
 *   pnpm seed                        # uses SEED_PROFILE env var, defaults to "full"
 *   pnpm seed full                   # 7 demo posts, full content (default)
 *   pnpm seed minimal                # schema + placeholder pages only
 *   pnpm seed pre-launch             # coming-soon homepage, valuation CTA
 *   SEED_PROFILE=minimal pnpm seed   # via env var
 *
 * Profiles live in seed/profiles/:
 *   full.json       → symlink to seed/seed.json (canonical demo content)
 *   minimal.json    → schema + stubs, no demo posts
 *   pre-launch.json → coming-soon configuration
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const PROFILES = {
  full: 'seed/profiles/full.json',
  minimal: 'seed/profiles/minimal.json',
  'pre-launch': 'seed/profiles/pre-launch.json',
}

const profileName = process.argv[2] ?? process.env.SEED_PROFILE ?? 'full'

if (!PROFILES[profileName]) {
  console.error(`Unknown profile: "${profileName}"`)
  console.error(`Available profiles: ${Object.keys(PROFILES).join(', ')}`)
  process.exit(1)
}

const seedFile = resolve(projectRoot, PROFILES[profileName])

if (!existsSync(seedFile)) {
  console.error(`Seed file not found: ${seedFile}`)
  process.exit(1)
}

console.log(`Seeding with profile: ${profileName} (${PROFILES[profileName]})`)

const proc = spawn('npx', ['emdash', 'seed', seedFile], {
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
