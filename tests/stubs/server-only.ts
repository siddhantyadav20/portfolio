/**
 * Stands in for the `server-only` package under the test runner.
 *
 * That package ships two builds and picks between them on an export
 * condition. Node's own resolver takes the client one, whose entire job is to
 * throw — so a module that guards itself with `import "server-only"` cannot be
 * imported by a test at all, and `lib/upstashDev.ts` (the store development
 * actually runs against) would be the one file with no test.
 *
 * Aliased in `vitest.config.ts` rather than fixed with resolve conditions,
 * which Vite applies to its own graph and not to a dependency Node externalises
 * anyway. Empty on purpose: the real module exports nothing either, and the
 * guard it provides is a build-time one that the tests are not the audience
 * for.
 */
export {};
