#!/usr/bin/env node
/**
 * Dev server launcher.
 *
 * Starts `emdash dev` and, once the server is accepting connections,
 * opens the dev-bypass URL in the default browser so the EmDash admin
 * session is established automatically. No manual visit required.
 *
 * Usage: pnpm dev  (wired up in package.json)
 */

import { spawn, exec } from 'child_process'
import http from 'http'

const PORT = process.env.PORT ?? 4444
const BYPASS_URL = `http://localhost:${PORT}/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin`

// Start the dev server, inheriting stdio so its output appears normally.
const server = spawn('npx', ['emdash', 'dev', '--port', String(PORT)], {
  stdio: 'inherit',
  shell: false,
})

server.on('error', (err) => {
  console.error('Failed to start dev server:', err.message)
  process.exit(1)
})

// Poll until the server responds, then open the bypass URL once.
function openWhenReady() {
  http
    .get(`http://localhost:${PORT}`, (res) => {
      res.resume() // drain the response
      exec(`open "${BYPASS_URL}"`, (err) => {
        if (err) {
          // open(1) not available (non-macOS CI etc.) — print the URL instead.
          console.log(`\n  Admin bypass: ${BYPASS_URL}\n`)
        }
      })
    })
    .on('error', () => {
      // Server not ready yet — try again shortly.
      setTimeout(openWhenReady, 400)
    })
}

openWhenReady()

// Forward Ctrl-C to the child process cleanly.
process.on('SIGINT', () => {
  server.kill('SIGINT')
})
process.on('SIGTERM', () => {
  server.kill('SIGTERM')
})
