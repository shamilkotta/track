import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "nlite/adapters";
import { defineConfig } from "nlite/config";

// minimal shape of the vite plugin hooks used here (vite is not a direct dependency)
type Plugin = {
  name: string;
  applyToEnvironment: (environment: { name: string }) => boolean;
  transform: (
    this: { error: (message: string) => never },
    code: string,
    id: string,
  ) => { code: string; map: null } | null;
};

// nlite's cloudflare adapter pins the worker entry to its own module, which only
// exports `fetch`. Cron triggers need a `scheduled` handler on the same default
// export, so this plugin appends one to that module at build time. Nothing else in
// the entry changes.
function trackrScheduled(): Plugin {
  const handler = path.resolve(process.cwd(), "lib/clients/scheduled.ts");
  return {
    name: "trackr:scheduled",
    // only the worker (rsc) bundle; the client and ssr graphs also reference this file
    applyToEnvironment: (environment) => environment.name === "rsc",
    transform(code, id) {
      if (id.startsWith("virtual:") || id.startsWith("\0")) return null;
      const file = id.split("?")[0].replaceAll("\\", "/");
      if (!file.endsWith("/nlite/dist/modules/entry.rsc.mjs")) return null;
      if (!code.includes("entry_rsc_default")) {
        this.error("trackr:scheduled could not find nlite's default export");
      }
      return {
        code: `${code}
import { scheduled as __trackrScheduled } from ${JSON.stringify(handler)};
entry_rsc_default.scheduled = (controller) => __trackrScheduled(controller);
`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), cloudflare(), trackrScheduled()],
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(process.cwd()),
      },
    },
  },
});
