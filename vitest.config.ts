import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The test runner.
 *
 * Deliberately unambitious. There is no jsdom, no React Testing Library and no
 * component test here, because the things worth testing on this site are not
 * components — they are the handful of pure functions everything else is built
 * on, and those run in plain Node.
 *
 * `lib/spring.ts` is the clearest case. It claims to be the *exact* discrete
 * solution to a damped harmonic oscillator rather than a stepped integration,
 * and the whole reason that matters is a property no screenshot can show: the
 * same motion at 60Hz and at 120Hz. That is a two-line assertion and it is the
 * only way anyone will ever notice if it stops being true.
 *
 * The `@` alias mirrors `tsconfig.json`'s `paths`, which is how every import in
 * the app is written.
 *
 * `server-only` is aliased to a stub for the reason that file gives: without
 * it, any module carrying that guard throws on import here, and the store the
 * engagement feature runs on in development would be untestable.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
