## 🛠️ 2️⃣ `esbuild.config.mjs`

```js
// esbuild.config.mjs
import * as esbuild from "esbuild";
import { exec } from "child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/* ------------------------------------------------------------------
   1️⃣ Load .env – only keys prefixed with ACODE_ will be defined in
   the bundle (the rest stay on the device).                     */
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ------------------------------------------------------------------
   2️⃣ Turn every ACODE_ environment variable into an esbuild
   `define` entry (stringified so the value is inlined at build time). */
const envDefines = Object.entries(process.env).reduce((defs, [k, v]) => {
  if (k.startsWith("ACODE_")) {
    defs[`process.env.${k}`] = JSON.stringify(v);
  }
  return defs;
}, {});

/* ------------------------------------------------------------------
   3️⃣ Existing zip‑packing plugin (unchanged). */
function packZip() {
  exec("node ./pack-zip.js", (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Error packing zip:", err);
      return;
    }
    console.log(stdout.trim());
  });
}
const zipPlugin = {
  name: "zip-plugin",
  setup(build) {
    build.onEnd(() => packZip());
  },
};

/* ------------------------------------------------------------------
   4️⃣ Copy static assets (HTML, CSS, icons) into dist/.   */
const copyStaticPlugin = {
  name: "copy-static",
  setup(build) {
    build.onEnd(() => {
      const src = resolve(__dirname, "static");
      const dst = resolve(__dirname, "dist");
      exec(`cp -r "${src}/"* "${dst}/"`, (err) => {
        if (err) console.error("❌ static copy failed:", err);
      });
    });
  },
};

/* ------------------------------------------------------------------
   5️⃣ Live‑reload for dev server – inject a tiny EventSource that
   triggers a page refresh after each rebuild.               */
const liveReloadPlugin = {
  name: "live-reload",
  setup(build) {
    build.onEnd(() => {
      // No extra code needed – the dev server already serves `/esbuild`
      // which the browser side script (see static/chat.html) listens to.
    });
  },
};

/* ------------------------------------------------------------------
   6️⃣ Optional: ship a **tiny fallback catalog** (first 100 models)
   so the plugin works offline. If you prefer pure remote‑only mode,
   simply remove this plugin.                               */
const copyCatalogPlugin = {
  name: "copy-catalog",
  setup(build) {
    build.onEnd(() => {
      const src = resolve(__dirname, "catalog-mini.json"); // a small subset you create manually
      const dst = resolve(__dirname, "dist", "catalog-mini.json");
      exec(`cp "${src}" "${dst}"`, (err) => {
        if (err) console.error("❌ catalog copy failed:", err);
      });
    });
  },
};

/* ------------------------------------------------------------------
   7️⃣ Build configuration (dev vs prod)                    */
const isServe = process.argv.includes("--serve");

let buildConfig = {
  entryPoints: ["src/main.js"],
  bundle: true,
  minify: !isServe,
  sourcemap: isServe,
  logLevel: "info",
  color: true,
  outdir: "dist",
  define: envDefines,
  plugins: [
    zipPlugin,
    copyStaticPlugin,
    liveReloadPlugin,
    copyCatalogPlugin, // keep it – it just adds a few KB
  ],
  loader: {
    ".css": "text",
    ".svg": "dataurl",
    ".png": "file",
    ".jpg": "file",
  },
};

/* ------------------------------------------------------------------
   8️⃣ Run either a persistent dev server or a one‑off build */
(async function () {
  if (isServe) {
    console.log("🚀 Starting development server...");
    const ctx = await esbuild.context(buildConfig);
    await ctx.watch();
    const { host, port } = await ctx.serve({
      servedir: "dist",
      port: 3000,
    });
    console.log(`🌐 dev server listening at http://${host}:${port}`);
  } else {
    console.log("🔧 Building for production...");
    await esbuild.build(buildConfig);
    console.log("✅ Production build complete.");
  }
})();
