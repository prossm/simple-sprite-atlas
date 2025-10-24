import { AtlasGenerator } from './generator.js';
import type { AtlasOptions, AtlasResult } from './types.js';

/**
 * Generate a sprite atlas from input images
 *
 * @param options - Configuration options for atlas generation
 * @returns Promise resolving to atlas generation result
 *
 * @example
 * ```typescript
 * import { generateAtlas } from 'simple-sprite-atlas';
 *
 * const result = await generateAtlas({
 *   input: 'assets/sprites',
 *   output: 'dist/atlas',
 *   format: 'phaser3-hash',
 *   maxSize: 2048,
 *   padding: 2,
 *   trim: true
 * });
 *
 * console.log(`Generated atlas with ${result.spriteCount} sprites`);
 * console.log(`Atlas size: ${result.size.width}x${result.size.height}`);
 * console.log(`Files: ${result.imagePath}, ${result.jsonPath}`);
 * ```
 */
export async function generateAtlas(
  options: AtlasOptions
): Promise<AtlasResult> {
  const generator = new AtlasGenerator(options);
  return await generator.generate();
}

// Export types
export type {
  AtlasOptions,
  AtlasResult,
  AtlasFormat,
  SpriteInfo,
  SpritePlacement,
  PhaserFrame,
  PhaserHashAtlas,
  PhaserArrayAtlas,
} from './types.js';

// Export classes for advanced usage
export { AtlasGenerator } from './generator.js';
export { GridPacker } from './packer.js';
