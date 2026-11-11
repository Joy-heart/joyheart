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
      // Preserve the existing production KV namespace. Omitting its ID
      // makes strict deployment detect a remote/local configuration conflict.
      VINEXT_KV_CACHE: bindings.kv({ id: "ed6eb7d66d2e45689abc73e710c107cc" }),

      // The application browser and server Supabase clients read these
      // NEXT_PUBLIC_* names. Keep the existing Worker aliases as well so
      // any Worker-side integrations using them remain compatible.
      NEXT_PUBLIC_SUPABASE_URL: bindings.text("https://quiyoobztyzebocqttoa.supabase.co"),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: bindings.text("sb_publishable_nE5yis-UPI-F-w_1ctfVpQ_uVQuAe_p"),
      SUPABASE_URL: bindings.text("https://quiyoobztyzebocqttoa.supabase.co"),
      SUPABASE_ANON_KEY: bindings.text("sb_publishable_nE5yis-UPI-F-w_1ctfVpQ_uVQuAe_p"),

      // Required encrypted Worker secret. Configure its value in the
      // Cloudflare dashboard; never place it in this source file.
      SUPABASE_SERVICE_ROLE_KEY: bindings.secret(),

      // Internal photo processor: URL is not sensitive; shared key is a
      // Cloudflare-encrypted secret and is never exposed to the browser.
      PHOTO_PROCESSOR_URL: bindings.text("https://joyheart-photo-processor.onrender.com"),
      PHOTO_PROCESSOR_SHARED_SECRET: bindings.secret(),
    },
    exports: {
      ...cache.exports,
    },
  }),
});
