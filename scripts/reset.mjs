#!/usr/bin/env node
/**
 * Local dev reset: wipe the SQLite database and re-seed with fresh data.
 *
 * Steps:
 *   1. Delete data.db (if it exists)
 *   2. Run `emdash seed` with the chosen profile (default: full)
 *   3. Run `emdash types` to regenerate TypeScript types
 *
 * Usage:
 *   pnpm reset             # seed with the "full" profile
 *   pnpm reset minimal     # seed with the "minimal" profile
 *   SEED_PROFILE=pre-launch pnpm reset
 *
 * Safe to run against a dev database only. Never run against production.
 */

import { spawn } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const DB_PATH = resolve(projectRoot, 'data.db')
const PROFILES = ['full', 'minimal', 'pre-launch']

const profileName = process.argv[2] ?? process.env.SEED_PROFILE ?? 'full'

if (!PROFILES.includes(profileName)) {
  console.error(`Unknown seed profile: "${profileName}"`)
  console.error(`Available profiles: ${PROFILES.join(', ')}`)
  process.exit(1)
}

// Step 1: Remove existing database
if (existsSync(DB_PATH)) {
  console.log('Removing data.db…')
  rmSync(DB_PATH)
} else {
  console.log('No data.db found — starting fresh.')
}

// Helper: run a command and return a promise
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n$ npx ${[cmd, ...args].join(' ')}`)
    const proc = spawn('npx', [cmd, ...args], {
      stdio: 'inherit',
      shell: false,
      cwd: projectRoot,
    })
    proc.on('error', reject)
    proc.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited with code ${code}`))
    })
  })
}

// Step 2: Seed
const seedProfileMap = {
  full: 'seed/profiles/full.json',
  minimal: 'seed/profiles/minimal.json',
  'pre-launch': 'seed/profiles/pre-launch.json',
}
const seedFile = resolve(projectRoot, seedProfileMap[profileName])

console.log(`\nSeeding with profile: ${profileName}`)
try {
  await run('emdash', ['seed', seedFile])
  // Step 3: Regenerate types
  console.log('\nRegenerating TypeScript types…')
  await run('emdash', ['types'])
  console.log('\n✓ Reset complete. Run `pnpm dev` to start the dev server.')
} catch (err) {
  console.error('\nReset failed:', err.message)
  process.exit(1)
}
