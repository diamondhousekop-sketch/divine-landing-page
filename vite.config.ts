// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Default = Hostinger/VPS Node server (`node .output/server/index.mjs`).
  // For Cloudflare Workers set the build variable NITRO_PRESET=cloudflare-module:
  // Nitro then generates .output/server/wrangler.json (nodejs_compat on) and
  // `npx wrangler deploy` ships it. Inside a Lovable build, LOVABLE_NITRO_PRESET
  // still pins Cloudflare.
  nitro: {
    preset: process.env.NITRO_PRESET || "node-server",
  },
});
