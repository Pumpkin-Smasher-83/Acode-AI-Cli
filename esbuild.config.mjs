// esbuild.config.mjs
import * as esbuild from "esbuild";
import { exec } from "child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// ---------------------------------------------------------------------
// 1️⃣ Load .env and turn every variable into an esbuild “define” entry
// ---------------------------------------------------------------------
dotenv.config();                     // reads .env in the project root
const envDefines = Object.entries(process.env).reduce((defs, [k, v]) => {
  // Only expose variables that start with ACODE_ (or whatever prefix you prefer)
  if (/^ACODE_/.test(k)) {
    defs[`process.env.${k}`] = JSON.stringify(v);
  }
  return defs;
}, {});

// ---------------------------------------------------------------------
// 2️⃣ Helper: copy static assets (html, css, images) to the output folder
// ---------------------------------------------------------------------
const copyStaticPlugin = {
  name: "copy-static",
  setup(build) {
    build.onEnd(() => {
      const staticDir = resolve(__dirname, "static");
      const outDir = resolve(__dirname, "dist");
      exec(`cp -r "${staticDir}/"* "${outDir}/"`, (err, stdout, stderr) => {
        if (err) console.error("❌ static copy failed:", err);
      });
    });
  },
};

// ---------------------------------------------------------------------
// 3️⃣ Helper: inject a tiny “live‑reload” script into HTML (dev mode only)
// ---------------------------------------------------------------------
const liveReloadPlugin = {
  name: "live-reload",
  setup(build) {
    // Trigger after the bundle is written
    build.onEnd(async (result) => {
      if (!isServe) return; // only for dev server
      const htmlPath = resolve(__dirname, "dist", "index.html");
      try {
        let html = readFileSync(htmlPath, "utf8");
        const reloadSnippet = `
          <script>
            const es = new EventSource("/esbuild");
            es.onmessage = () => location.reload();
          </script>
        `;
        if (!html.includes(reloadSnippet)) {
          html = html.replace("</body>", `${reloadSnippet}</body>`);
          exec(`printf %s "${html.replace(/"/g, '\\"')}" > "${htmlPath}"`);
        }
      } catch (_) {
        // ignore – maybe there is no HTML yet (first build)
      }
    });
  },
};

// ---------------------------------------------------------------------
// 4️⃣ Existing ZIP‑packing logic (unchanged)
// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
// 5️⃣ Base build configuration – now enriched with the plugins above
// ---------------------------------------------------------------------
const isServe = process.argv.includes("--serve");

let buildConfig = {
  entryPoints: ["src/main.js"],
  bundle: true,
  minify: !isServe,                 // keep code readable in dev mode
  sourcemap: isServe,               // useful when serving
  logLevel: "info",
  color: true,
  outdir: "dist",
  define: envDefines,                // inject allowed env vars
  plugins: [zipPlugin, copyStaticPlugin, liveReloadPlugin],
  loader: {
    // Allow importing non‑JS assets directly from the code (e.g., CSS or SVG)
    ".css": "text",
    ".svg": "dataurl",
    ".png": "file",
    ".jpg": "file",
  },
};

// ---------------------------------------------------------------------
// 6️⃣ Serve vs. production flow (unchanged except we expose the
//    built‑in esbuild dev server which already handles HMR via the
//    liveReloadPlugin above)
// ---------------------------------------------------------------------
(async function () {
  if (isServe) {
    console.log("🚀 Starting development server…");
    const ctx = await esbuild.context(buildConfig);
    await ctx.watch();
    const { host, port } = await ctx.serve({
      servedir: "dist",
      port: 3000,
    });
    console.log(`🌐 dev server listening at http://${host}:${port}`);
  } else {
    console.log("🔧 Building for production…");
    await esbuild.build(buildConfig);
    console.log("✅ Production build complete.");
  }
})();

// Main function to handle both serve and production builds
(async function () {
  if (isServe) {
    console.log("Starting development server...");

    // Watch and Serve Mode
    const ctx = await esbuild.context(buildConfig);

    await ctx.watch();
    const { host, port } = await ctx.serve({
      servedir: ".",
      port: 3000,
    });

  } else {
    console.log("Building for production...");
    await esbuild.build(buildConfig);
    console.log("Production build complete.");
  }
})();
