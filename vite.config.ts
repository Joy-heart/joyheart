import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import { workersCacheCdnAdapter } from "@vinext/cloudflare/cache/workers-cache-cdn-adapter";
import { defineConfig } from "vite";
import vinext from "vinext";

const jsquashWorkerImportMetaCompat = {
  name: "joyheart-jsquash-worker-import-meta-compat",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    const normalizedId = id.replace(/\\/g, "/");
    if (!normalizedId.includes("/node_modules/@jsquash/")
        || !normalizedId.includes("/codec/") || !normalizedId.endsWith(".js")) return null;

    // jSquash's Emscripten glue derives a script directory from import.meta.url.
    // The Cloudflare/Vite SSR transform rewrites this expression incorrectly
    // in Worker mode. WASM is explicitly imported and passed to init(), so
    // runtime URL discovery is unnecessary for these codec modules.
    const patched = code.replace(
      /(var\s+_scriptDir\s*=\s*)import\.meta\.url\s*;/g,
      '$1"";',
    );
    return patched === code ? null : { code: patched, map: null };
  },
};

export default defineConfig({
  // jSquash loads adjacent WebAssembly binaries relative to its ESM modules.
  // Vite dependency pre-bundling can rewrite those module URLs and break
  // codec initialization. Keep the codec packages native ESM in every Vite
  // environment so their explicitly imported .wasm modules remain intact.
  optimizeDeps: {
    exclude: ["@jsquash/jpeg", "@jsquash/png", "@jsquash/webp"],
  },
  plugins: [
    jsquashWorkerImportMetaCompat,
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
