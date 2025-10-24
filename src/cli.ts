#!/usr/bin/env node

import { Command } from 'commander';
import { generateAtlas } from './index.js';
import type { AtlasFormat } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Read package.json for version (works with both ESM and CJS)
let packageJson: { version: string };

try {
  // For ESM builds
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageJsonPath = path.join(__dirname, '../package.json');
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
} catch {
  // Fallback: use require for CJS or if file not found
  try {
    const require = createRequire(import.meta.url);
    packageJson = require('../package.json');
  } catch {
    // Ultimate fallback
    packageJson = { version: '1.0.0' };
  }
}

const program = new Command();

program
  .name('simple-sprite-atlas')
  .description('Lightweight sprite atlas generator for Phaser games')
  .version(packageJson.version)
  .requiredOption('-i, --input <path>', 'Input directory or glob pattern (e.g., "sprites/**/*.png")')
  .requiredOption('-o, --output <path>', 'Output path without extension (e.g., "dist/atlas")')
  .option('-f, --format <format>', 'Output format: phaser3-hash or phaser3-array', 'phaser3-hash')
  .option('-m, --max-size <size>', 'Maximum atlas size (must be power of 2)', '2048')
  .option('-p, --padding <pixels>', 'Padding between sprites', '2')
  .option('-s, --spacing <pixels>', 'Spacing around each sprite', '0')
  .option('-t, --trim', 'Trim transparent pixels', false)
  .option('--scale <scale>', 'Scale factor for the atlas', '1')
  .action(async (options) => {
    try {
      console.log('🎨 Simple Sprite Atlas Generator');
      console.log('================================\n');

      // Validate format
      const format = options.format as AtlasFormat;
      if (format !== 'phaser3-hash' && format !== 'phaser3-array') {
        console.error(`❌ Invalid format: ${format}`);
        console.error('   Valid formats: phaser3-hash, phaser3-array');
        process.exit(1);
      }

      // Parse numeric options
      const maxSize = parseInt(options.maxSize, 10);
      const padding = parseInt(options.padding, 10);
      const spacing = parseInt(options.spacing, 10);
      const scale = parseFloat(options.scale);

      // Validate max size is power of 2
      if ((maxSize & (maxSize - 1)) !== 0) {
        console.error(`❌ Max size must be a power of 2 (e.g., 512, 1024, 2048, 4096)`);
        process.exit(1);
      }

      // Ensure output directory exists
      const outputDir = path.dirname(options.output);
      if (outputDir && outputDir !== '.') {
        await fs.promises.mkdir(outputDir, { recursive: true });
      }

      console.log(`📁 Input:      ${options.input}`);
      console.log(`📦 Output:     ${options.output}.{png,json}`);
      console.log(`🎯 Format:     ${format}`);
      console.log(`📏 Max Size:   ${maxSize}x${maxSize}`);
      console.log(`🔲 Padding:    ${padding}px`);
      console.log(`🔳 Spacing:    ${spacing}px`);
      console.log(`✂️  Trim:       ${options.trim ? 'Yes' : 'No'}`);
      console.log(`🔍 Scale:      ${scale}`);
      console.log('');

      // Generate atlas
      console.log('⏳ Generating atlas...\n');

      const startTime = Date.now();

      const result = await generateAtlas({
        input: options.input,
        output: options.output,
        format,
        maxSize,
        padding,
        spacing,
        trim: options.trim,
        scale,
      });

      const duration = Date.now() - startTime;

      console.log('✅ Atlas generated successfully!\n');
      console.log(`📊 Stats:`);
      console.log(`   Sprites:    ${result.spriteCount}`);
      console.log(`   Atlas size: ${result.size.width}x${result.size.height}`);
      console.log(`   Duration:   ${duration}ms`);
      console.log('');
      console.log(`📄 Output files:`);
      console.log(`   ${result.imagePath}`);
      console.log(`   ${result.jsonPath}`);
      console.log('');
      console.log('🎮 Ready to use with Phaser 3!');

    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
