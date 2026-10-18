# Runtime and dependency warnings

Verified on 2026-10-18 against the installed Node 24.22.0 and npm 11.19.1.

## Runtime alignment

Vercel currently offers Node 24 and 22, with 24 as its default. A bounded
`engines.node: "24.x"` prevents an automatic future major upgrade while allowing
security patches. Use Node 24 locally and in both GitHub workflows, with matching
Node 24 type definitions.

Source: [Vercel supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Install-script review

npm supports version-pinned `allowScripts` entries in `package.json`.
`npm install-scripts approve <name>` writes approvals for the currently installed
versions by default. New versions require another review; no blanket or
name-only approval is needed.

The installed lifecycle scripts and the helpers they invoke were inspected:

| Package versions                 | Lifecycle behavior                                                                                                                                                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| esbuild 0.18.20, 0.25.12, 0.28.2 | `postinstall` selects the platform binary, links it into the package, and verifies its version. Missing optional binaries trigger an exact-version npm install or registry download. The 0.28.2 fallback additionally checks the binary hash. Both installed 0.28.2 script copies are identical.                    |
| sharp 0.34.5                     | `install` checks for global libvips or an explicit source-build request, then invokes node-gyp only when required. Normal supported platforms use optional native packages. Inspected `install/check.js`, `install/build.js`, and `lib/libvips.js`.                                                                 |
| unrs-resolver 1.12.2             | `postinstall` calls napi-postinstall 0.3.4 to locate its optional native binding. If missing, it installs or downloads the matching package version. Inspected the entry point and helper implementation.                                                                                                           |
| fsevents 2.3.3                   | Registry metadata declares `install: node-gyp rebuild`, but the installed tarball has neither an install script nor binding.gyp and includes its compiled macOS binary. npm's refreshed metadata still flags the package. Its exact version is reviewed to cover this macOS-only marker; Linux deployments omit it. |

These exact versions are approved. The policy preserves npm warnings for future
unreviewed versions. fsevents appeared only after npm refreshed its metadata
during the Node type-definition update, so its registry and installed manifest
were checked separately before approval.

Source: [npm install-scripts](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/).

## Upstream warnings retained

- ESLint 9.39.5 is deprecated/EOL. ESLint 10.13.0 is current, but the latest
  `eslint-plugin-react` 7.37.5, `eslint-plugin-import` 2.32.0, and
  `eslint-plugin-jsx-a11y` 6.10.2 still declare peer support only through ESLint 9.
  They are dependencies of the pinned Next 16.1.6 lint configuration. Retain the
  compatible ESLint major until upstream supports 10; do not bypass peer checks.
- The latest stable drizzle-kit 0.31.11 still depends on deprecated
  `@esbuild-kit/esm-loader` and its `@esbuild-kit/core-utils` dependency. Removing
  or overriding these transitives would alter the upstream tool's dependency
  contract. Retain the migration tooling and wait for a compatible stable fix.

The above package versions, dependency ownership, and peer ranges were verified
with registry metadata (`npm view`) and installed manifests.

## External npm configuration warning

No `cache-dir` key exists in repository configuration, the current process's npm
configuration environment, or the inspected local user npm configuration. The
Vercel warning therefore cannot be fixed from a demonstrated repository source.
Its build environment or platform tooling may inject the obsolete key; that
origin remains unverified. npm's supported cache setting is `cache`; inspect only
that specific key in the deployment configuration, without printing private npm
configuration or tokens. No log suppression or private configuration edits were
made.

Source: [npm cache configuration](https://docs.npmjs.com/cli/v11/using-npm/config/#cache).

## Verification

- A clean `npm ci` in an isolated temporary directory passed on Node 24.22.0 /
  npm 11.19.1, installing 748 packages. Its remaining warnings were the three
  documented upstream deprecations; there were no unreviewed-script warnings.
- `npm install-scripts ls --json` returned an empty list for both the workspace
  and clean install; dry-run pruning found no stale approval pins.
- All four installed esbuild copies transformed TypeScript successfully. sharp
  generated a PNG; unrs-resolver and macOS fsevents loaded their native bindings.
- Manifest/lockfile consistency, exact approval keys, Node 24 engine alignment,
  focused Prettier checks, and `git diff --check` passed.

Full application checks and the production build are owned by the coordinating
agent. This clean install verifies macOS; CI and Vercel validate Linux separately.
