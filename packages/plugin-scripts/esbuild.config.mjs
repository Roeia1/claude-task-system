import * as esbuild from "esbuild";
import { readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Output directory: plugin/scripts/ relative to repo root
const outDir = join(__dirname, "..", "..", "plugin", "scripts");

// Ensure output directory exists
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

// Find all TypeScript entry points in src/ (excluding test files and index.ts)
const srcDir = join(__dirname, "src");
const entryPoints = readdirSync(srcDir)
  .filter(
    (file) =>
      file.endsWith(".ts") &&
      !file.endsWith(".test.ts") &&
      !file.endsWith(".d.ts") &&
      file !== "index.ts"
  )
  .map((file) => join(srcDir, file));

if (entryPoints.length === 0) {
  console.log("No entry points found to build.");
  process.exit(0);
}

console.log(`Building ${entryPoints.length} script(s)...`);
entryPoints.forEach((entry) => console.log(`  - ${entry}`));

await esbuild.build({
  entryPoints,
  outdir: outDir,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Bundle all dependencies except Node built-ins
  packages: "bundle",
  sourcemap: false,
  minify: false, // Keep readable for debugging
});

console.log(`Built to: ${outDir}`);
