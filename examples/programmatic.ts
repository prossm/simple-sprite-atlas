import { generateAtlas } from '../src/index.js';

/**
 * Example: Generate sprite atlas programmatically
 */
async function main() {
  try {
    // Example 1: Basic usage
    const result = await generateAtlas({
      input: 'assets/sprites',
      output: 'dist/characters',
      format: 'phaser3-hash',
      maxSize: 2048,
      padding: 2,
      trim: true,
    });

    console.log('Atlas generated successfully!');
    console.log(`Sprites: ${result.spriteCount}`);
    console.log(`Atlas size: ${result.size.width}x${result.size.height}`);
    console.log(`Image: ${result.imagePath}`);
    console.log(`JSON: ${result.jsonPath}`);

    // Example 2: Using glob pattern
    await generateAtlas({
      input: 'assets/sprites/**/*.png',
      output: 'dist/all-sprites',
    });

    // Example 3: Array format with trimming
    await generateAtlas({
      input: 'assets/ui',
      output: 'dist/ui-atlas',
      format: 'phaser3-array',
      trim: true,
      padding: 4,
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
