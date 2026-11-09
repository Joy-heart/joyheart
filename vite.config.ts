import { cloudflare } from "@cloudflare/vite-plugin";
import {
  kvDataAdapter,
  workersCacheCdnAdapter,
} from "@vinext/cloudflare/cache";
import { defineConfig } from "vite";
import vinext from "vinext";

export default defineConfig({
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
