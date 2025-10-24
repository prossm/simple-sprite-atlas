#!/usr/bin/env node
import {
  generateAtlas
} from "./chunk-FPHVE77L.mjs";

// src/cli.ts
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
var packageJson;
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageJsonPath = path.join(__dirname, "../package.json");
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
} catch {
  try {
    const require2 = createRequire(import.meta.url);
    packageJson = require2("../package.json");
  } catch {
    packageJson = { version: "1.0.0" };
  }
}
var program = new Command();
program.name("simple-sprite-atlas").description("Lightweight sprite atlas generator for Phaser games").version(packageJson.version).requiredOption("-i, --input <path>", 'Input directory or glob pattern (e.g., "sprites/**/*.png")').requiredOption("-o, --output <path>", 'Output path without extension (e.g., "dist/atlas")').option("-f, --format <format>", "Output format: phaser3-hash or phaser3-array", "phaser3-hash").option("-m, --max-size <size>", "Maximum atlas size (must be power of 2)", "2048").option("-p, --padding <pixels>", "Padding between sprites", "2").option("-s, --spacing <pixels>", "Spacing around each sprite", "0").option("-t, --trim", "Trim transparent pixels", false).option("--scale <scale>", "Scale factor for the atlas", "1").action(async (options) => {
  try {
    console.log("\u{1F3A8} Simple Sprite Atlas Generator");
    console.log("================================\n");
    const format = options.format;
    if (format !== "phaser3-hash" && format !== "phaser3-array") {
      console.error(`\u274C Invalid format: ${format}`);
      console.error("   Valid formats: phaser3-hash, phaser3-array");
      process.exit(1);
    }
    const maxSize = parseInt(options.maxSize, 10);
    const padding = parseInt(options.padding, 10);
    const spacing = parseInt(options.spacing, 10);
    const scale = parseFloat(options.scale);
    if ((maxSize & maxSize - 1) !== 0) {
      console.error(`\u274C Max size must be a power of 2 (e.g., 512, 1024, 2048, 4096)`);
      process.exit(1);
    }
    const outputDir = path.dirname(options.output);
    if (outputDir && outputDir !== ".") {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }
    console.log(`\u{1F4C1} Input:      ${options.input}`);
    console.log(`\u{1F4E6} Output:     ${options.output}.{png,json}`);
    console.log(`\u{1F3AF} Format:     ${format}`);
    console.log(`\u{1F4CF} Max Size:   ${maxSize}x${maxSize}`);
    console.log(`\u{1F532} Padding:    ${padding}px`);
    console.log(`\u{1F533} Spacing:    ${spacing}px`);
    console.log(`\u2702\uFE0F  Trim:       ${options.trim ? "Yes" : "No"}`);
    console.log(`\u{1F50D} Scale:      ${scale}`);
    console.log("");
    console.log("\u23F3 Generating atlas...\n");
    const startTime = Date.now();
    const result = await generateAtlas({
      input: options.input,
      output: options.output,
      format,
      maxSize,
      padding,
      spacing,
      trim: options.trim,
      scale
    });
    const duration = Date.now() - startTime;
    console.log("\u2705 Atlas generated successfully!\n");
    console.log(`\u{1F4CA} Stats:`);
    console.log(`   Sprites:    ${result.spriteCount}`);
    console.log(`   Atlas size: ${result.size.width}x${result.size.height}`);
    console.log(`   Duration:   ${duration}ms`);
    console.log("");
    console.log(`\u{1F4C4} Output files:`);
    console.log(`   ${result.imagePath}`);
    console.log(`   ${result.jsonPath}`);
    console.log("");
    console.log("\u{1F3AE} Ready to use with Phaser 3!");
  } catch (error) {
    console.error("\n\u274C Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
});
program.parse();
