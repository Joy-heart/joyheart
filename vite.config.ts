import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import { workersCacheCdnAdapter } from "@vinext/cloudflare/cache/workers-cache-cdn-adapter";
import { defineConfig } from "vite";
import vinext from "vinext";

const jsquashWorkerImportMetaCompat = {
  name: "joyheart-jsquash-worker-import-meta-compat",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    // Vite appends cache-busting query strings (for example ?v=...) to
    // transformed module IDs. Match the filesystem path, not that suffix.
    const normalizedId = id.replace(/\\/g, "/").split(/[?#]/, 1)[0];
    if (!normalizedId.includes("/node_modules/@jsquash/")
        || !normalizedId.includes("/codec/") || !/\.m?js$/.test(normalizedId)) return null;

    // jSquash's Emscripten glue derives a script directory from import.meta.url.
    // In Worker mode import.meta.url is unavailable. Keep Emscripten's script
    // directory as an absolute, valid URL so its fallback URL resolution never
    // receives an empty/relative base. The compiled WASM module is still passed
    // explicitly to init(), so this URL is only a safe fallback, not a network
    // location from which the decoder should load its WASM binary.
    const patched = code
      .replace(
        /if\s*\(\s*import\.meta\.url\s*===\s*undefined\s*\)\s*\{\s*import\.meta\.url\s*=\s*["'][^"']*["'];?\s*\}/g,
        "",
      )
      .replace(
        /(var\s+_scriptDir\s*=\s*)import\.meta\.url\s*;/g,
        '$1"https://localhost/";',
      );
    return patched === code ? null : { code: patched, map: null };
  },
};

export default defineConfig({
  // Keep jSquash native ESM so explicitly imported WASM modules remain intact.
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
