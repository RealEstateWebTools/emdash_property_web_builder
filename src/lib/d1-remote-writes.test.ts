import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyRemoteWrites, buildResetAndImportSql, parseTimeTravelBookmark, restoreCommand } from '../../scripts/lib/d1-remote-writes.mjs'

type Call = { command: string; args: string[] }

/** Fake `npx wrangler …` runner: records calls, answers time-travel info, can fail a step. */
function fakeRun({ bookmark = 'bm-before', failOn }: { bookmark?: string | null; failOn?: (args: string[]) => Error | undefined } = {}) {
  const calls: Call[] = []
  const run = vi.fn(async (command: string, args: string[]) => {
    calls.push({ command, args })
    if (args.includes('time-travel')) {
      if (bookmark === null) throw new Error('time travel unavailable')
      return { stdout: `${JSON.stringify({ bookmark, timestamp: '2026-11-12T10:00:00Z' }, null, 2)}\n`, stderr: '' }
    }
    const failure = failOn?.(args)
    if (failure) throw failure
    return { stdout: '', stderr: '' }
  })
  return { run, calls }
}

const plan = (steps: Array<{ label: string; path: string }>) => ({
  dbName: 'prod-db',
  configPath: '/site/wrangler.prod.jsonc',
  cwd: '/site',
  backupPath: '/site/.tmp/d1-backup.sql',
  steps,
})

const quiet = { log: vi.fn(), error: vi.fn() }
let tempDir: string | undefined
afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
  tempDir = undefined
  vi.clearAllMocks()
})

describe('buildResetAndImportSql', () => {
  // The reset and the import used to be two separate remote executions, so a
  // failure between them left production empty.
  it('puts the deletes before the inserts in one file', () => {
    const sql = buildResetAndImportSql('DELETE FROM "ec_posts";\n', "INSERT INTO ec_posts VALUES('p1');\n")
    expect(sql.indexOf('DELETE FROM "ec_posts";')).toBeLessThan(sql.indexOf("INSERT INTO ec_posts VALUES('p1');"))
  })
})

describe('parseTimeTravelBookmark', () => {
  it('reads the bookmark from `wrangler d1 time-travel info --json`', () => {
    expect(parseTimeTravelBookmark('{\n  "bookmark": "00000085-0000024c",\n  "timestamp": "x"\n}\n')).toBe('00000085-0000024c')
  })

  it('returns null for anything else', () => {
    expect(parseTimeTravelBookmark('')).toBeNull()
    expect(parseTimeTravelBookmark('✘ [ERROR] not authenticated')).toBeNull()
    expect(parseTimeTravelBookmark('{"other": 1}')).toBeNull()
  })
})

describe('applyRemoteWrites', () => {
  it('records the bookmark before the first write, then runs each step as one file import', async () => {
    const { run, calls } = fakeRun()
    const result = await applyRemoteWrites(
      plan([{ label: 'schema sync', path: '/t/schema.sql' }, { label: 'reset and import', path: '/t/reset-and-import.sql' }]),
      { run, ...quiet },
    )

    expect(result.bookmark).toBe('bm-before')
    expect(calls.map((c) => c.args.slice(0, 3).join(' '))).toEqual([
      'wrangler d1 time-travel',
      'wrangler d1 execute',
      'wrangler d1 execute',
    ])
    expect(calls[0].args).toEqual(['wrangler', 'd1', 'time-travel', 'info', 'prod-db', '--json', '--config', '/site/wrangler.prod.jsonc'])
    expect(calls[2].args).toEqual([
      'wrangler', 'd1', 'execute', 'prod-db', '--file', '/t/reset-and-import.sql', '--remote', '--config', '/site/wrangler.prod.jsonc', '--yes',
    ])
  })

  it('prints the exact restore command when a step fails, and stops', async () => {
    const { run, calls } = fakeRun({ failOn: (args) => (args.includes('/t/reset-and-import.sql') ? new Error('UNIQUE constraint failed') : undefined) })

    await expect(
      applyRemoteWrites(plan([{ label: 'reset and import', path: '/t/reset-and-import.sql' }, { label: 'later', path: '/t/later.sql' }]), {
        run,
        ...quiet,
      }),
    ).rejects.toThrow('UNIQUE constraint failed')

    const printed = quiet.error.mock.calls.map((c) => String(c[0])).join('\n')
    expect(printed).toContain(`  ${restoreCommand('prod-db', 'bm-before', '/site/wrangler.prod.jsonc')}`)
    expect(printed).toContain('npx wrangler d1 time-travel restore prod-db --bookmark=bm-before --config /site/wrangler.prod.jsonc')
    expect(printed).toContain('/site/.tmp/d1-backup.sql')
    expect(calls.some((c) => c.args.includes('/t/later.sql'))).toBe(false)
  })

  it('still writes, with a warning, when no bookmark can be read', async () => {
    const { run, calls } = fakeRun({ bookmark: null })
    const result = await applyRemoteWrites(plan([{ label: 'import', path: '/t/import.sql' }]), { run, ...quiet })

    expect(result.bookmark).toBeNull()
    expect(String(quiet.error.mock.calls[0][0])).toMatch(/could not read a Time Travel bookmark/)
    expect(calls.filter((c) => c.args.includes('execute'))).toHaveLength(1)
  })

  it('falls back to batched commands when the token cannot use the import API', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'd1-writes-'))
    const file = join(tempDir, 'import.sql')
    writeFileSync(file, "INSERT INTO a VALUES(1);\nINSERT INTO a VALUES(2);\n")
    const authError = Object.assign(new Error('POST /import failed'), { stderr: 'Authentication error [code: 10000]' })
    const { run, calls } = fakeRun({ failOn: (args) => (args.includes('--file') ? authError : undefined) })

    await applyRemoteWrites(plan([{ label: 'import', path: file }]), { run, ...quiet })

    const commands = calls.filter((c) => c.args.includes('--command'))
    expect(commands.length).toBeGreaterThan(0)
    expect(commands.map((c) => c.args[c.args.indexOf('--command') + 1]).join('\n')).toContain('INSERT INTO a VALUES(2);')
  })
})
