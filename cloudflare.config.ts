import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";

const cache = await createWorkersCacheConfig();

export default defineConfig({
  worker: defineWorker({
    ...cache,
    name: "joyheart",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-08",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ...cache.env,
      ASSETS: bindings.assets(),
      VINEXT_KV_CACHE: bindings.kv(),
      SUPABASE_URL: bindings.text("https://quiyoobztyzebocqttoa.supabase.co"),
      SUPABASE_ANON_KEY: bindings.text("sb_publishable_nE5yis-UPI-F-w_1ctfVpQ_uVQuAe_p"),
    },
    exports: {
      ...cache.exports,
    },
  }),
});
