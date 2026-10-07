import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { bundlePlugin } from '@emdash-cms/plugin-cli';

// Local artifact verification only. No authentication or publication APIs.
const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, 'packages/plugins/pwb-properties');
const stagingRoot = join(root, '.tmp');
await mkdir(stagingRoot, { recursive: true });
const staging = await mkdtemp(join(stagingRoot, 'pwb-properties-check-'));
try {
  for (const file of ['src', 'package.json', 'tsconfig.json', 'README.md']) {
    await cp(join(source, file), join(staging, file), { recursive: true });
  }
  const template = await readFile(join(source, 'emdash-plugin.jsonc.example'), 'utf8');
  const manifest = JSON.parse(template.replace(/^\s*\/\/.*$/gm, ''));
  // Clearly fictitious profile used solely for offline build checks. Never a release.
  Object.assign(manifest, {
    publisher: 'build-fixture.example.test',
    license: 'LicenseRef-Test-Only',
    author: { name: 'Offline build fixture' },
    security: { url: 'https://example.test/security' },
  });
  await writeFile(join(staging, 'emdash-plugin.jsonc'), JSON.stringify(manifest, null, 2));
  const result = await bundlePlugin({ dir: staging });
  assert.equal(result.warnings.length, 1, 'Only the documented network-permission warning is expected');
  assert.match(result.warnings[0], /unrestricted network access/);
  assert.ok(result.tarballPath);
  const files = execFileSync('tar', ['tzf', result.tarballPath], { encoding: 'utf8' })
    .trim().split('\n').map((file) => file.replace(/^\.\//, ''));
  for (const file of ['manifest.json', 'backend.js', 'README.md']) assert.ok(files.includes(file), file);
  assert.ok(!files.some((file) => /\.test\.|node_modules|emdash-plugin\.jsonc/.test(file)));
  const extracted = join(staging, 'extracted');
  await mkdir(extracted);
  execFileSync('tar', ['xzf', result.tarballPath, '-C', extracted]);
  const wire = JSON.parse(await readFile(join(extracted, 'manifest.json'), 'utf8'));
  assert.equal(wire.id, 'pwb-properties');
  // The CLI expands unrestricted access to include the base request capability.
  assert.deepEqual(wire.capabilities, ['network:request:unrestricted', 'network:request']);
  const descriptor = (await import(pathToFileURL(join(staging, 'dist/index.mjs')).href)).default;
  assert.equal(descriptor.id, wire.id);
  assert.equal(descriptor.version, wire.version);
  assert.equal(descriptor.entrypoint, 'pwb-properties/sandbox');
  assert.deepEqual(descriptor.adminPages.map((page) => page.path), ['/properties', '/settings']);
  const runtime = (await import(pathToFileURL(join(extracted, 'backend.js')).href)).default;
  const [npmPackage] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: staging, encoding: 'utf8',
  }));
  const npmFiles = npmPackage.files.map((file) => file.path);
  for (const file of ['src/index.js', 'src/sandbox-entry.js', 'dist/index.mjs', 'dist/index.d.mts', 'dist/plugin.mjs', 'dist/plugin.d.mts']) {
    assert.ok(npmFiles.includes(file), `npm package missing ${file}`);
  }
  assert.ok(!npmFiles.some((file) => /\.test\.|\.tar\.gz$|emdash-plugin\.jsonc/.test(file)));
  let networkCalls = 0;
  const response = await runtime.routes.admin.handler({ input: {} }, {
    kv: { get: async () => null },
    http: { fetch: async () => { networkCalls++; throw new Error('Unexpected network'); } },
    log: { info() {}, warn() {}, error() {} },
  });
  assert.equal(networkCalls, 0);
  assert.ok(response.blocks.some((block) => block.title?.includes('not configured')));
  console.log(`Offline fixture bundle passed (${result.tarballBytes} bytes).`);
  console.log('Verified registry archive, npm file list, generated descriptor, and bundled runtime smoke test.');
  console.log('Expected CLI warning: unrestricted network access for the operator-configured PWB host.');
  console.log('Fixture artifacts removed. Real profile validation and clean-host sandbox install remain pending.');
} finally {
  await rm(staging, { recursive: true, force: true });
}
