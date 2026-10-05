#!/usr/bin/env node
/**
 * Dev server for the visual regression suite (playwright.visual.config.ts).
 *
 * Screenshots must not depend on live PWB listings or on whatever is in the
 * developer's data.db, so this:
 *   1. Seeds a fresh database from seed/seed.json into .visual/
 *   2. Starts the fixture-backed mock PWB API (scripts/mock-pwb-server.mjs)
 *   3. Runs `astro dev` pointed at both
 *
 * Usage: node scripts/visual-test-server.mjs   (normally started by Playwright)
 * Ports: VISUAL_PORT (default 4330), MOCK_PWB_PORT (default 3011)
 */

import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockPwbServer } from './mock-pwb-server.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(projectRoot)

const VISUAL_PORT = String(process.env.VISUAL_PORT ?? 4330)
const MOCK_PWB_PORT = Number(process.env.MOCK_PWB_PORT ?? 3011)
const WORK_DIR = resolve(projectRoot, '.visual')
const DB_FILE = resolve(WORK_DIR, 'data.db')
const UPLOADS_DIR = resolve(WORK_DIR, 'uploads')

function run(cmd, args, env) {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', env })
    proc.on('error', reject)
    proc.on('exit', (code) => (code === 0 ? resolvePromise() : reject(new Error(`${cmd} exited with ${code}`))))
  })
}

// 1. Fresh, deterministic content every run.
rmSync(WORK_DIR, { recursive: true, force: true })
mkdirSync(UPLOADS_DIR, { recursive: true })
await run('npx', ['emdash', 'seed', 'seed/seed.json', '--database', DB_FILE, '--uploads-dir', UPLOADS_DIR], process.env)

// 2. Mock PWB API.
const mock = createMockPwbServer()
await new Promise((resolvePromise) => mock.listen(MOCK_PWB_PORT, resolvePromise))
console.log(`Mock PWB API on http://localhost:${MOCK_PWB_PORT}`)

// 3. Dev server. --ignore-lock keeps it in the foreground (Astro otherwise
// auto-backgrounds under coding agents) and lets it run alongside a normal
// `pnpm dev` for this project.
const astro = spawn('npx', ['astro', 'dev', '--port', VISUAL_PORT, '--ignore-lock'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PWB_API_URL: `http://localhost:${MOCK_PWB_PORT}`,
    LOCAL_DB_FILE: DB_FILE,
    LOCAL_UPLOADS_DIR: UPLOADS_DIR,
    // Screenshots choose palettes via ?palette=; ignore any local default.
    PUBLIC_PALETTE: 'default',
  },
})

function shutdown(signal) {
  astro.kill(signal)
  mock.close()
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
astro.on('exit', (code) => {
  mock.close()
  process.exit(code ?? 0)
})
