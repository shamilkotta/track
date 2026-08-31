import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "nlite/adapters";
import { defineConfig } from "nlite/config";

export default defineConfig({
  plugins: [tailwindcss(), cloudflare()],
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(process.cwd()),
      },
    },
  },
});
