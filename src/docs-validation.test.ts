/**
 * Doc validation tests — ensure documentation stays in sync with the project.
 *
 * These tests catch the class of bug where a doc is written with a command
 * that doesn't match the actual package.json scripts, or references the wrong
 * Cloudflare deployment type (Pages vs Workers).
 *
 * If a test here fails, update the docs to match the code — not the other way around.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../')
const DOCS_DIR = join(ROOT, 'docs')

// pnpm built-in subcommands that are not package.json scripts.
// NOTE: in a pnpm workspace, `pnpm deploy` is a reserved built-in (deploys a
// package to a directory) — it does NOT run the "deploy" script. Always use
// `pnpm run deploy` to invoke the script.
const PNPM_BUILTINS = new Set([
  'install', 'i', 'add', 'remove', 'uninstall', 'update', 'upgrade',
  'run', 'exec', 'dlx', 'create', 'init', 'publish', 'pack',
  'audit', 'list', 'ls', 'outdated', 'link', 'unlink', 'store',
  'prune', 'fetch', 'patch', 'patch-commit', 'patch-remove',
  // workspace built-ins that shadow script names:
  'deploy',
])

function readPackageJson(): Record<string, string> {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
  return pkg.scripts ?? {}
}

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectMarkdownFiles(full))
    } else if (entry.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

/**
 * Extract bash code blocks from markdown and return all `pnpm <command>` lines.
 * Returns objects with { command, file, line } for clear failure messages.
 */
function extractPnpmCommands(content: string, filePath: string) {
  const results: Array<{ script: string; command: string; file: string; lineNum: number }> = []
  const codeBlockRe = /```(?:bash|sh|shell)?\n([\s\S]*?)```/g
  const lines = content.split('\n')

  let match: RegExpExecArray | null
  while ((match = codeBlockRe.exec(content)) !== null) {
    const blockContent = match[1]
    const blockStart = content.slice(0, match.index).split('\n').length

    for (const [i, raw] of blockContent.split('\n').entries()) {
      const line = raw.trim().replace(/^#.*/, '').trim() // strip inline comments
      const pnpmMatch = line.match(/^pnpm\s+([a-z][a-z0-9:_-]*)/)
      if (!pnpmMatch) continue

      const script = pnpmMatch[1]
      if (PNPM_BUILTINS.has(script)) continue

      results.push({
        script,
        command: raw.trim(),
        file: filePath.replace(ROOT + '/', ''),
        lineNum: blockStart + i,
      })
    }
  }
  return results
}

/**
 * Find any `wrangler pages` commands in docs (wrong deployment type for this project).
 */
function extractWranglerPagesCommands(content: string, filePath: string) {
  const results: Array<{ command: string; file: string; lineNum: number }> = []
  const lines = content.split('\n')
  for (const [i, line] of lines.entries()) {
    if (/wrangler\s+pages/.test(line) && !line.trim().startsWith('#')) {
      results.push({
        command: line.trim(),
        file: filePath.replace(ROOT + '/', ''),
        lineNum: i + 1,
      })
    }
  }
  return results
}

describe('docs validation', () => {
  const scripts = readPackageJson()
  const mdFiles = collectMarkdownFiles(DOCS_DIR)

  it('finds markdown files to validate', () => {
    expect(mdFiles.length).toBeGreaterThan(0)
  })

  it('all pnpm <script> commands in docs exist in package.json', () => {
    const unknown: string[] = []

    for (const file of mdFiles) {
      const content = readFileSync(file, 'utf-8')
      for (const ref of extractPnpmCommands(content, file)) {
        if (!(ref.script in scripts)) {
          unknown.push(
            `  "${ref.command}" in ${ref.file}:${ref.lineNum} — "pnpm ${ref.script}" is not a package.json script`
          )
        }
      }
    }

    expect(unknown, `\nDocs reference pnpm scripts that don't exist in package.json:\n${unknown.join('\n')}\n\nFix: update the docs to use a real script, or add the script to package.json.`).toHaveLength(0)
  })

  it('docs do not use "wrangler pages" (this is a Workers project, not Pages)', () => {
    const hits: string[] = []

    for (const file of mdFiles) {
      const content = readFileSync(file, 'utf-8')
      for (const ref of extractWranglerPagesCommands(content, file)) {
        hits.push(`  "${ref.command}" in ${ref.file}:${ref.lineNum}`)
      }
    }

    expect(hits, `\nDocs contain "wrangler pages" commands, but this project deploys as a Worker (wrangler deploy):\n${hits.join('\n')}\n\nFix: use "pnpm run deploy" (which runs wrangler deploy --provision).`).toHaveLength(0)
  })

  it('deploy script in docs matches package.json deploy script', () => {
    const deployScript = scripts['deploy']
    expect(deployScript, 'package.json must have a "deploy" script').toBeDefined()

    const guideContent = readFileSync(join(DOCS_DIR, 'development-guide.md'), 'utf-8')
    // The guide must use `pnpm run deploy` (not bare `pnpm deploy`, which is a
    // pnpm workspace built-in unrelated to the deploy script).
    expect(guideContent).toMatch(/pnpm run deploy/)
  })
})
