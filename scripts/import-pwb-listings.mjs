#!/usr/bin/env node
/**
 * Import listings from a PWB site into the EmDash `properties` collection.
 *
 *   pnpm import:pwb-listings                      # uses PWB_API_URL from the environment / .env
 *   pnpm import:pwb-listings --url https://agency.example
 *   pnpm import:pwb-listings --dry-run            # write the seed file only
 *   pnpm import:pwb-listings --update             # also refresh listings imported before
 *   pnpm import:pwb-listings --database ./other.db
 *
 * Fetches every sale and rental listing (list + detail endpoints, default
 * locale), writes seed/imports/pwb-listings.json, then applies it to the local
 * database with `emdash seed`, which downloads the photos into EmDash media.
 *
 * Re-running adds new listings and leaves existing ones (and any edits made in
 * the admin) alone. --update overwrites existing listings from PWB; it also
 * re-downloads their photos, so the old copies remain in the media library.
 *
 * Production (D1): run against the local database, then push it with
 * `pnpm run sync:prod-db` (see docs/pwb-optional.md).
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildImportSeed, IMPORT_SEED_PATH, pwbPropertyToSeedEntry } from '../src/lib/listings/pwb-import.ts'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(projectRoot)

const args = process.argv.slice(2)
function option(name) {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}
const dryRun = args.includes('--dry-run')
const update = args.includes('--update')
const database = option('database')

if (existsSync('.env')) process.loadEnvFile('.env')
const base = (option('url') ?? process.env.PWB_API_URL ?? '').trim().replace(/\/+$/, '')
if (!base) {
  console.error('No PWB site to import from. Pass --url https://agency.example or set PWB_API_URL.')
  process.exit(1)
}

const LOCALE = 'en'
const api = `${base}/api_public/v1/${LOCALE}`

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

async function listSlugs(mode) {
  const slugs = []
  for (let page = 1; page <= 100; page++) {
    const body = await getJson(`${api}/properties?sale_or_rental=${mode}&per_page=100&page=${page}`)
    for (const item of body.data ?? []) if (item?.slug) slugs.push(item.slug)
    if (page >= (body.meta?.total_pages ?? 1)) break
  }
  return slugs
}

async function mapLimit(items, limit, fn) {
  const results = []
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++
        results[index] = await fn(items[index], index)
      }
    }),
  )
  return results
}

console.log(`Importing listings from ${base}`)
const slugs = [...new Set([...(await listSlugs('sale')), ...(await listSlugs('rental'))])]
console.log(`Found ${slugs.length} listings`)

const failures = []
const properties = await mapLimit(slugs, 4, async (slug) => {
  try {
    return await getJson(`${api}/properties/${encodeURIComponent(slug)}`)
  } catch (err) {
    failures.push(`${slug}: ${err.message}`)
    return null
  }
})

const entries = properties.filter(Boolean).map((property) => pwbPropertyToSeedEntry(property, LOCALE))
const photoCount = entries.reduce((sum, entry) => sum + (entry.data.photos?.length ?? 0), 0)
mkdirSync(dirname(IMPORT_SEED_PATH), { recursive: true })
// Carry the collection definition so the file applies to any database.
const propertiesCollection = JSON.parse(readFileSync('seed/seed.json', 'utf8')).collections.find(
  (collection) => collection.slug === 'properties',
)
writeFileSync(IMPORT_SEED_PATH, `${JSON.stringify(buildImportSeed(entries, base, propertiesCollection), null, '\t')}\n`)
console.log(`Wrote ${entries.length} listings (${photoCount} photos) to ${IMPORT_SEED_PATH}`)
if (failures.length) console.warn(`Skipped ${failures.length} listings:\n  ${failures.join('\n  ')}`)

if (dryRun) {
  console.log(`Dry run: apply later with  npx emdash seed ${IMPORT_SEED_PATH} --on-conflict ${update ? 'update' : 'skip'}`)
  process.exit(0)
}

const seedArgs = [
  'emdash',
  'seed',
  IMPORT_SEED_PATH,
  '--on-conflict',
  update ? 'update' : 'skip',
  ...(database ? ['--database', database] : []),
]
console.log(`\n$ npx ${seedArgs.join(' ')}`)
const child = spawn('npx', seedArgs, { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 1))
