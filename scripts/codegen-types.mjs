// Codegen: turn the shared wire-contract JSON Schemas into TypeScript types.
//
// Reads the repo-root DeliberateInput.json / DeliberationResult.json (the
// controller<->bridge wire contract) and emits a single combined declaration
// file at mcp-server/src/types/deliberation.d.ts using json-schema-to-typescript.
//
// Run via: npm run codegen:types
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Resolve json-schema-to-typescript regardless of whether npm hoisted it to the
// repo-root node_modules or left it under the mcp-server workspace.
const require = createRequire(resolve(root, "mcp-server/package.json"));
const modPath = require.resolve("json-schema-to-typescript");
const mod = await import(pathToFileURL(modPath).href);
const compileFromFile = mod.compileFromFile ?? mod.default?.compileFromFile;

const outFile = resolve(root, "mcp-server/src/types/deliberation.d.ts");
mkdirSync(dirname(outFile), { recursive: true });

const opts = { bannerComment: "", additionalProperties: false };
const inputTs = await compileFromFile(resolve(root, "DeliberateInput.json"), opts);
const resultTs = await compileFromFile(resolve(root, "DeliberationResult.json"), opts);

const banner = [
  "/* eslint-disable */",
  "/**",
  " * AUTO-GENERATED — DO NOT EDIT BY HAND.",
  " * Source: DeliberateInput.json & DeliberationResult.json (wire contract).",
  " * Regenerate with: npm run codegen:types",
  " */",
  "",
  "",
].join("\n");

writeFileSync(outFile, banner + inputTs.trimEnd() + "\n\n" + resultTs.trimEnd() + "\n");
console.error(`codegen:types -> ${outFile}`);
