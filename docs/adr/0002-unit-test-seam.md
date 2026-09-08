# 0002 Unit tests target the pure-utils and IndexedDB seams

There are no tests in this repo, though Vitest, `@vue/test-utils` and
`happy-dom` were scaffolded as devDependencies and a `test:unit` task was
commented out of `mise.toml` awaiting one. This ADR fixes the unit-test seam so
the first tests land somewhere stable and the task is enabled again.

## Decision

Vitest runs as a **standalone runner** (`test/vitest.config.ts`, environment
`happy-dom`) rather than through the Nuxt test environment. A `test/setup.ts`
installs `fake-indexeddb` as `globalThis.indexedDB` so the existing
`app/stores/db.ts` Dexie singleton works unchanged. The `#shared` and `~/` path
aliases are mapped into `./shared` and `./app`. Tests are co-located as
`<name>.test.ts` next to the module under test.

Initially the suite covers two layers:

- **Pure utils** in `app/utils/` — `detectionNumbering`, `detectionSpans`,
  `replacementText`, `pageMarkdown`, `documentSegments`, `redactionStyles`.
  These import nothing Nuxt-global, so they run in plain `happy-dom` and are the
  cheapest place to pin down behaviour.
- **`entityService`** — the IndexedDB persistence layer — run against the *real*
  `db` singleton (cleared between tests), so the code under test is the code
  that ships.

`mise run test:unit` runs the suite once via
`bunx vitest run --config test/vitest.config.ts` with `APP_MODE=ci`;
`test:watch` keeps its interactive mode on the same config.

## Why the standalone runner

`@nuxt/test-utils` offers Nuxt-aware aliasing and globals, but it brings the
whole build in and couples every test to Nuxt's boot. The pure-utils seam needs
none of it, and `#shared` is the only alias in play — a one-line mapping. The
runner is kept explicit rather than left to defaults so the environment and
setup are committed and stable.

## Why fake-indexeddb

`entityService` is a module that closes over the `db` singleton imported from
`app/stores/db.ts`; the singleton constructs a Dexie over IndexedDB at module
load. `fake-indexeddb` provides that API in `happy-dom`, so the service is
tested against the real store and its versioned upgrades — the persistence is
exercised rather than swapped for an injected map. This keeps production code
untouched; no constructor refactor is needed.
