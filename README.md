# Simple Sprite Atlas

Lightweight, secure sprite atlas generator for Phaser games with zero vulnerabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-prossm%2Fsimple--sprite--atlas-blue)](https://github.com/prossm/simple-sprite-atlas)

## Why Simple Sprite Atlas?

Most sprite atlas generators are either:
- Heavy desktop applications (TexturePacker)
- Abandoned or unmaintained (free-tex-packer)
- Have complex dependencies with security vulnerabilities
- Overkill for simple use cases

**Simple Sprite Atlas** provides:
- ✅ **Zero vulnerabilities** - Only secure, well-maintained dependencies
- ✅ **Lightweight** - Minimal footprint with just `sharp`, `glob`, and `commander`
- ✅ **TypeScript** - Full type safety and excellent DX
- ✅ **Dual API** - Use as CLI tool or programmatically
- ✅ **Phaser 3 compatible** - Direct integration with Phaser games
- ✅ **Open source** - MIT licensed, free forever

## Installation

Install directly from GitHub:

```bash
npm install --save-dev github:prossm/simple-sprite-atlas
```

Or install globally to use as a CLI tool:

```bash
npm install -g github:prossm/simple-sprite-atlas
```

> **Note:** This package is not yet published to npm. Once published, you'll be able to use `npm install simple-sprite-atlas`.

## Quick Start

### CLI Usage

After installing, add to your `package.json` scripts:

```json
{
  "scripts": {
    "build:atlas": "simple-sprite-atlas --input assets/sprites --output dist/atlas"
  }
}
```

Then run:

```bash
npm run build:atlas
```

Or if installed globally:

```bash
# Basic usage
simple-sprite-atlas --input assets/sprites --output dist/atlas

# With options
simple-sprite-atlas \
  --input "assets/sprites/**/*.png" \
  --output dist/characters \
  --format phaser3-hash \
  --max-size 2048 \
  --padding 2 \
  --trim
```

### Programmatic Usage

```typescript
import { generateAtlas } from 'simple-sprite-atlas';

const result = await generateAtlas({
  input: 'assets/sprites',
  output: 'dist/atlas',
  format: 'phaser3-hash',
  maxSize: 2048,
  padding: 2,
  trim: true,
});

console.log(`Generated atlas with ${result.spriteCount} sprites`);
console.log(`Size: ${result.size.width}x${result.size.height}`);
```

## CLI Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--input <path>` | `-i` | Input directory or glob pattern | **required** |
| `--output <path>` | `-o` | Output path (without extension) | **required** |
| `--format <format>` | `-f` | Output format: `phaser3-hash` or `phaser3-array` | `phaser3-hash` |
| `--max-size <size>` | `-m` | Maximum atlas size (power of 2) | `2048` |
| `--padding <pixels>` | `-p` | Padding between sprites | `2` |
| `--spacing <pixels>` | `-s` | Spacing around each sprite | `0` |
| `--trim` | `-t` | Trim transparent pixels | `false` |
| `--scale <scale>` | | Scale factor for atlas | `1` |
| `--resize-to <size>` | | Resize all sprites to fit within size (maintains aspect ratio) | none |
| `--resize-mode <mode>` | | Resize mode: `contain`, `cover`, or `stretch` | `contain` |
| `--resize-filter <filter>` | | Resize filter: `lanczos`, `nearest`, or `linear` | `lanczos` |
| `--grid-size <size>` | | Layout sprites on fixed grid of size pixels | none |
| `--grid-metadata` | | Include grid position data in JSON output | `false` |

## API Reference

### `generateAtlas(options: AtlasOptions): Promise<AtlasResult>`

Generate a sprite atlas from input images.

#### Options

```typescript
interface AtlasOptions {
  input: string;           // Directory path or glob pattern
  output: string;          // Output path without extension
  format?: 'phaser3-hash' | 'phaser3-array';
  maxSize?: number;        // Default: 2048
  padding?: number;        // Default: 2
  spacing?: number;        // Default: 0
  trim?: boolean;          // Default: false
  scale?: number;          // Default: 1
  resizeTo?: number;       // Resize sprites to fit within this size
  resizeMode?: 'contain' | 'cover' | 'stretch';  // Default: 'contain'
  resizeFilter?: 'lanczos' | 'nearest' | 'linear';  // Default: 'lanczos'
  gridSize?: number;       // Layout sprites on fixed grid
  gridMetadata?: boolean;  // Include grid position data (default: false)
}
```

#### Result

```typescript
interface AtlasResult {
  imagePath: string;       // Path to generated PNG
  jsonPath: string;        // Path to generated JSON
  spriteCount: number;     // Number of sprites packed
  size: {
    width: number;
    height: number;
  };
}
```

## Output Format

### Phaser 3 JSON Hash (default)

```json
{
  "frames": {
    "hero/walk_01.png": {
      "frame": { "x": 0, "y": 0, "w": 64, "h": 64 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 },
      "sourceSize": { "w": 64, "h": 64 }
    }
  },
  "meta": {
    "image": "atlas.png",
    "format": "RGBA8888",
    "size": { "w": 2048, "h": 2048 },
    "scale": 1
  }
}
```

## Integration with Phaser 3

```javascript
// In your Phaser game
class GameScene extends Phaser.Scene {
  preload() {
    // Load the generated atlas
    this.load.atlas(
      'characters',
      'assets/characters.png',
      'assets/characters.json'
    );
  }

  create() {
    // Use sprites from the atlas
    this.add.sprite(100, 100, 'characters', 'hero/walk_01.png');

    // Or create animations
    this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNames('characters', {
        prefix: 'hero/walk_',
        suffix: '.png',
        start: 1,
        end: 8,
        zeroPad: 2
      }),
      frameRate: 10,
      repeat: -1
    });
  }
}
```

## Features

### Sprite Resizing

Automatically resize sprites to create uniform texture atlases:

```bash
# Resize all sprites to fit within 32x32 pixels (maintains aspect ratio)
simple-sprite-atlas --input sprites --output atlas --resize-to 32

# Use different resize modes
simple-sprite-atlas --input sprites --output atlas --resize-to 32 --resize-mode cover

# Use nearest-neighbor filtering for pixel art
simple-sprite-atlas --input sprites --output atlas --resize-to 32 --resize-filter nearest
```

**Resize Modes:**
- `contain` (default): Fit sprite within bounds, maintain aspect ratio, add padding
- `cover`: Fill bounds completely, maintain aspect ratio, may crop
- `stretch`: Distort sprite to exactly fill bounds

**Resize Filters:**
- `lanczos` (default): High-quality smooth scaling
- `linear`: Fast smooth scaling
- `nearest`: Pixel-perfect scaling for pixel art

### Grid-Based Layout

Layout sprites on a fixed grid for GPU-friendly texture atlases:

```bash
# Layout sprites on a 32x32 pixel grid
simple-sprite-atlas --input sprites --output atlas --grid-size 32

# Include grid metadata in JSON output
simple-sprite-atlas --input sprites --output atlas --grid-size 32 --grid-metadata
```

With grid layout:
- All sprite positions are aligned to grid boundaries (multiples of grid size)
- Atlas dimensions are multiples of grid size
- Improves GPU cache utilization
- Perfect for tile-based games

**Grid Metadata Output:**

When `--grid-metadata` is enabled, each frame includes grid position data:

```json
{
  "frame": { "x": 64, "y": 128, "w": 32, "h": 32 },
  "grid": {
    "x": 2,          // Grid column (64 / 32)
    "y": 4,          // Grid row (128 / 32)
    "cellWidth": 1,  // Number of grid cells wide
    "cellHeight": 1  // Number of grid cells high
  }
}
```

### Combined Usage

Combine resizing and grid layout for optimal results:

```bash
# Resize all sprites to 32x32 and pack on 32x32 grid
simple-sprite-atlas \
  --input "assets/sprites/**/*.png" \
  --output dist/atlas \
  --resize-to 32 \
  --grid-size 32 \
  --grid-metadata
```

This creates uniform, grid-aligned atlases perfect for:
- Tile-based games
- Pixel art games
- Performance-critical applications
- Consistent visual scaling

### Directory Structure Preservation

Frame keys preserve the directory structure of input files:

```
assets/sprites/
  ├── hero/
  │   ├── walk_01.png
  │   └── walk_02.png
  └── enemy/
      └── idle.png

→ Frame keys: "hero/walk_01.png", "hero/walk_02.png", "enemy/idle.png"
```

### Trim Support

Automatically trim transparent pixels to save atlas space:

```bash
npx simple-sprite-atlas --input sprites --output atlas --trim
```

### Power-of-2 Atlas Dimensions

Atlas dimensions are automatically rounded to the nearest power of 2 for optimal GPU performance:

- Input sprites: 800x600
- Output atlas: 1024x1024 (next power of 2)

### Glob Pattern Support

Use glob patterns to select specific images:

```bash
# All PNGs in any subdirectory
npx simple-sprite-atlas --input "assets/**/*.png" --output atlas

# Only character sprites
npx simple-sprite-atlas --input "assets/characters/**/*.png" --output characters

# Multiple file types
npx simple-sprite-atlas --input "assets/**/*.{png,jpg}" --output atlas
```

## Comparison with Other Tools

| Feature | Simple Sprite Atlas | TexturePacker | free-tex-packer |
|---------|-------------------|---------------|-----------------|
| **Free & Open Source** | ✅ MIT | ❌ Paid | ✅ |
| **Zero Vulnerabilities** | ✅ | N/A | ❌ Unmaintained |
| **Lightweight** | ✅ 3 deps | ❌ Desktop app | ⚠️ Many deps |
| **TypeScript** | ✅ | N/A | ❌ |
| **CLI + API** | ✅ | ❌ GUI only | ⚠️ CLI only |
| **Phaser 3 Support** | ✅ | ✅ | ✅ |
| **Maintained** | ✅ Active | ✅ | ❌ Abandoned |
| **Complex Packing** | ❌ Grid only | ✅ | ✅ |

## Examples

### Build Script Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "build:atlas": "simple-sprite-atlas -i assets/sprites -o dist/atlas",
    "dev": "npm run build:atlas && vite",
    "build": "npm run build:atlas && vite build"
  }
}
```

### Watch Mode (with nodemon)

```json
{
  "scripts": {
    "watch:atlas": "nodemon --watch assets/sprites --ext png,jpg --exec 'npm run build:atlas'"
  }
}
```

### Multiple Atlases

```javascript
// build-atlases.js
import { generateAtlas } from 'simple-sprite-atlas';

async function buildAtlases() {
  await generateAtlas({
    input: 'assets/characters',
    output: 'dist/characters'
  });

  await generateAtlas({
    input: 'assets/ui',
    output: 'dist/ui'
  });

  await generateAtlas({
    input: 'assets/enemies',
    output: 'dist/enemies'
  });
}

buildAtlases();
```

## Requirements

- Node.js >= 18.0.0

## Dependencies

- **sharp** - High-performance image processing
- **glob** - File pattern matching
- **commander** - CLI framework

All dependencies are actively maintained and security-audited.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run locally
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/prossm/simple-sprite-atlas/issues)
- [Documentation](https://github.com/prossm/simple-sprite-atlas#readme)

## Credits

Created as a lightweight, secure alternative for game developers who need a simple, reliable sprite atlas generator.

Perfect for:
- Phaser 3 games
- Indie game development
- Rapid prototyping
- CI/CD pipelines
- Educational projects

---

Made with ❤️ for the game dev community
