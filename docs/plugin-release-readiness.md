# Plugin release readiness

Assessment date: 2026-10-07. Scope: the EmDash plugin directory/registry and npm
distribution of the plugins in this repository. Publication and deployment are
not authorized by this work; preparation, documentation, and local verification are.

## Decision

The repository is an estate-agency site, not a single directory plugin. Release
individual packages. Start with `packages/plugins/pwb-properties`: its admin-only
Block Kit UI and capability-gated HTTP calls are suitable for sandboxed execution.
No package is currently demonstrated ready for registry installation.

Current upstream documentation replaces the older marketplace workflow described
in the local creating-plugins skill. Follow the current manifest and CLI references
below, rather than the skill's obsolete publishing commands or capability names.

## Distribution by package

| Package | Distribution | Remaining work |
| --- | --- | --- |
| `pwb-properties` | Sandboxed registry plugin; existing trusted descriptor remains available to this site | Manifest, publisher/profile decisions, CLI build/bundle, runtime tests, clean-host sandbox installation |
| `pwb-valuation` | Sandboxed backend plus a separately installed native/npm frontend companion | Manifest/tooling, explicit frontend split, input validation, spam controls, cursor pagination, request status and deletion workflows |
| `pwb-page-parts` | Native npm package | License/metadata, package preparation, clean-host renderer and editor verification |
| `pwb-property-embeds` | Native npm package | Explicit listing-source contract, license/metadata, package preparation, clean-host rendering/editor verification |

The local plugins under `src/plugins/` (theme, site profile, Resend email, lead
reports, and listing defaults) are additional extraction candidates. They are not
standalone workspace release packages today. Extraction needs its own dependency
and runtime review; this assessment does not certify them for publication.

## Requirements checked

- Registry plugins use `emdash-plugin.jsonc` and a sandbox runtime entrypoint.
- Required profile fields include a publisher handle/DID, SPDX license expression,
  author information, and public security contact. Do not fabricate these values.
- Keep the npm package version as the version source when a package exists.
- Declare capabilities, allowed hosts, plugin-owned storage, admin pages, and
  supported host versions. An admin page needs an `admin` runtime route.
- `network:request:unrestricted` is supported when the operator chooses the API
  host at runtime. It requires an empty `allowedHosts` list. This is a broad
  public-network permission that must be explained to installers.
- Native Astro rendering components cannot be installed through the registry.
  A registry backend may have an explicitly separate npm frontend companion.
- Pin the plugin CLI exactly: the registry is experimental.
- Validate and inspect the exact bundle, then install it into a disposable,
  unpatched supported EmDash site and test every admin surface.

Icons and screenshots improve a listing, but are separate from functional
eligibility. No approval or security-audit outcome has been obtained.

## Findings from source

### Release metadata and workflow

At assessment time all four workspace packages were version `0.1.0`, with raw
JavaScript exports and no publishing manifest, license, author, repository
metadata, or package build scripts. No tracked repository license or security
policy was found. The root package is private and should remain a site package.
Existing CI checks the site; it does not validate registry release artifacts.

### Standalone integration

`pwb-property-embeds` imports `pwb-host-listing-source`, an alias supplied by this
site's Astro config. A generic EmDash host cannot resolve it automatically.
Its README must explain or replace that integration contract.

`pwb-valuation/integration` injects an Astro route and defaults to this site's
layout and PWB client paths. The page imports `createPwbClient()` and calls
`getSiteDetails()`. Installing a registry backend cannot install that integration.

The properties admin runtime reads `settings:pwbApiUrl` from its own KV. It does
not fall back to `PWB_API_URL`. The public site's listing source independently
selects PWB from its environment configuration. Earlier descriptions implying
that the admin setting configures public inventory were incorrect.

### Editor patch: correction to the initial review

The tracked patch is `patches/emdash@1.1.0.patch`. Upstream 1.1 already stores
custom plugin-block attributes and the identity field. The patch preserves
`_key` during inline-editor saves and also fixes recent-post locale links.
Do not claim that upstream 1.1 necessarily loses all rich block attributes.
Native plugins still need unpatched editor save/reload tests before release;
the current roundtrip tests exercise patched code in this site.

### Valuation behavior

The public submission handler trims strings and checks that name, email, and
address are nonempty. It does not validate email format, field lengths, or
enumerated values, and contains no plugin-level spam/rate controls. Submission
logs include email addresses. The list route reads at most 100 records and
returns `hasMore` without a cursor; the admin table shows at most 50 records.
Status-change and deletion/retention workflows are not implemented. These are
release-quality findings, not a claim that an exploit was demonstrated.

### Documentation

The initial README used Node 18+ while package engines specify Node 22+, referred
to a 0.10 patch although the package is 1.1, and invoked the deployment script
with a reserved pnpm built-in. These references have been corrected. Some plugin
READMEs describe outdated formats or omit host integration requirements; update
each when preparing its release.

## Node decision

The installed runtime at assessment was Node `22.16.0`, with pnpm `10.28.0`.
Astro and the CLI's Rolldown dependency require Node 22.12.0 or newer; the root
engine and README now reflect that minimum. Node 22.16.0 successfully ran the
CLI build, site typecheck, unit tests, and production build. A newer maintained Node patch is useful
maintenance, but changing Node alone does not fix directory eligibility. Any
major runtime upgrade must include native dependency rebuilds and site checks.
This work does not change the user's global Node installation.

## Preparation sequence and completion criteria

1. Document the findings and correct operator-facing instructions.
2. Prepare `pwb-properties` locally: current CLI tooling, runtime entrypoint,
   manifest template with undecided profile fields, explicit package contents,
   accurate permissions/install instructions, and runtime regression tests.
3. Verify configuration, filters, pagination, detail navigation, and API errors.
   Reject credential-bearing API URLs and avoid logging full user-entered URLs.
4. Supply owner-approved license, author, security contact, and publisher identity.
   Replace the template with an actual manifest and pass offline validation.
5. Build and bundle the plugin, inspect the artifact, and test installation in a
   disposable unpatched host using a sandbox runner. Local handler tests alone
   do not establish isolated execution or admin authentication correctness.
6. Add reproducible release checks to CI once the real manifest is configured.
   Publication remains a separate user instruction.

## Verification evidence

Initial baseline: `pnpm run test:run` passed 481 tests across 52 files, including
documentation validation. Targeted package tests passed 60 tests across seven
files; targeted PWB/embed/email tests passed 137 tests across eleven files.
These are overlapping subsets, not additional totals.

At the initial assessment no registry bundle, clean-site install, sandbox
execution, production build, or remote security review was verified. Record
preparation results below as they are obtained, including remaining limitations.

### Preparation results

- Pinned `@emdash-cms/plugin-cli@0.13.3` and added root commands for offline
  verification, real manifest validation, build, and bundle. None publishes.
- Added `src/plugin.ts` sharing the existing trusted runtime, an intentionally
  incomplete `.jsonc.example` manifest, npm metadata and a package file allowlist.
  The current trusted factory keeps its API and admin paths. The registry template
  uses `/properties` because CLI 0.13.3 rejects a bare `/` admin-page path.
- Corrected the admin UI/README to describe the API setting's actual scope.
  Rejected credentials, query strings, and fragments in API base URLs; invalid
  saved values no longer trigger fetches. Removed base URLs from runtime logs.
- Added 17 runtime regression cases for setup, URL handling, filters, pagination,
  detail/back navigation, empty inventory, and backend failures.
- The offline verification command produced a valid test tarball (~6 KB), checked
  archive contents and the generated descriptor, extracted its `backend.js`, and
  exercised its unconfigured admin response. An npm pack dry run also confirmed
  both trusted source entries and built runtime/declaration entries are included,
  while tests, profile manifests, and nested registry tarballs are excluded.
  Temporary artifacts were deleted.
  This uses fictitious test profile data, not an owner-approved release profile.
- The CLI warns about the requested unrestricted network capability. This is
  expected for the runtime-configured PWB host; verification rejects additional
  warnings. The emitted wire manifest includes both unrestricted and base
  network-request capabilities, as normalized by the CLI.
- Added the offline bundle verification command to CI. CI itself has not run
  for these changes; local verification passed.
- Final site unit tests passed 499 tests across 53 files, including all 16
  documentation validation checks. Site typecheck passed with zero errors and two hints (missing
  embed-renderer declarations and a layout `onload` expression). Production build
  passed, with the existing large-client-chunk warning.
- Corrected all four package READMEs and linked the release assessment from the
  site README and earlier plugin guides. Documentation validation now checks
  explicit `pnpm run` script names, the site and package READMEs, and deployment
  invocation spelling. Git-ignored local concept notes are excluded.
- Dependency installation reported upstream Tiptap peer-version warnings and
  the CLI's TypeScript 6 / tsdown TypeScript 5 peer mismatch. Local builds passed;
  no broad dependency upgrade was attempted to silence upstream metadata.

Remaining release gates: owner-approved profile/license/security information,
actual manifest validation, real-profile bundle inspection, and a disposable
unpatched host installation with sandbox/authentication/permission checks.
No publisher account has been accessed; nothing has been published or deployed.

## Upstream references

- [Choosing a plugin format](https://docs.emdashcms.com/plugins/creating-plugins/choosing-a-format/)
- [Manifest fields and validation](https://docs.emdashcms.com/plugins/creating-plugins/manifest/)
- [Current plugin CLI](https://docs.emdashcms.com/plugins/creating-plugins/cli/)
- [Bundling and publishing](https://docs.emdashcms.com/plugins/creating-plugins/publishing/)
- [Migrating older plugins](https://docs.emdashcms.com/plugins/creating-plugins/migrating-to-the-cli/)
- [Native package distribution](https://docs.emdashcms.com/plugins/creating-native-plugins/distributing/)
- [Node release support](https://nodejs.org/en/about/previous-releases)
