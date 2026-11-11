import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import { workersCacheCdnAdapter } from "@vinext/cloudflare/cache/workers-cache-cdn-adapter";
import { defineConfig } from "vite";
import vinext from "vinext";

export default defineConfig({
  // jSquash loads adjacent WebAssembly binaries relative to its ESM modules.
  // Vite dependency pre-bundling can rewrite those module URLs and break
  // codec initialization. Keep the codec packages native ESM in every Vite
  // environment so their explicitly imported .wasm modules remain intact.
  optimizeDeps: {
    exclude: ["@jsquash/jpeg", "@jsquash/png", "@jsquash/webp"],
  },
  plugins: [
    vinext({
      cache: {
        cdn: workersCacheCdnAdapter(),
        data: kvDataAdapter(),
      },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
