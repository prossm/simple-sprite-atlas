import sharp from 'sharp';
import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs/promises';
import { GridPacker } from './packer.js';
import type {
  AtlasOptions,
  AtlasResult,
  SpriteInfo,
  SpritePlacement,
  PhaserHashAtlas,
  PhaserArrayAtlas,
  TiledTileset,
  SpriteManifest,
} from './types.js';

/**
 * Main atlas generator class
 */
export class AtlasGenerator {
  private options: Required<Omit<AtlasOptions, 'resizeTo' | 'gridSize'>> &
    Pick<AtlasOptions, 'resizeTo' | 'gridSize'>;

  constructor(options: AtlasOptions) {
    this.options = {
      format: 'phaser3-hash',
      maxSize: 2048,
      padding: 2,
      spacing: 0,
      trim: false,
      scale: 1,
      resizeMode: 'contain',
      resizeFilter: 'lanczos',
      gridMetadata: false,
      stableOrder: false,
      preserveIds: true,
      ...options,
    };
  }

  /**
   * Generate the sprite atlas
   */
  async generate(): Promise<AtlasResult> {
    // Find all input images
    let sprites = await this.loadSprites();

    if (sprites.length === 0) {
      throw new Error(`No images found matching pattern: ${this.options.input}`);
    }

    // If stable order is enabled, load existing manifest and reorder sprites
    if (this.options.stableOrder && this.options.preserveIds) {
      sprites = await this.reorderSpritesFromManifest(sprites);
    }

    // Pack sprites
    const packer = new GridPacker(
      this.options.padding + this.options.spacing,
      this.options.maxSize,
      this.options.gridSize,
      false  // Don't sort in packer, we've already ordered the sprites
    );

    if (!packer.canFit(sprites)) {
      throw new Error(
        `Sprites cannot fit in ${this.options.maxSize}x${this.options.maxSize} atlas. ` +
        `Try increasing maxSize or reducing sprite count.`
      );
    }

    const { placements, width, height } = packer.pack(sprites);

    // Generate atlas image
    const imagePath = `${this.options.output}.png`;
    await this.generateImage(placements, width, height, imagePath);

    // Generate JSON metadata
    const jsonPath = `${this.options.output}.json`;
    await this.generateJSON(placements, width, height, jsonPath);

    // Save manifest for stable ordering if enabled
    if (this.options.stableOrder && this.options.preserveIds) {
      await this.saveManifest(placements);
    }

    return {
      imagePath,
      jsonPath,
      spriteCount: sprites.length,
      size: { width, height },
    };
  }

  /**
   * Load all sprite images from input pattern
   */
  private async loadSprites(): Promise<SpriteInfo[]> {
    const inputPath = this.options.input;
    let files: string[] = [];

    // Check if input is a directory or glob pattern
    try {
      const stat = await fs.stat(inputPath);
      if (stat.isDirectory()) {
        // Search for images in directory
        files = await glob(`${inputPath}/**/*.{png,jpg,jpeg}`, {
          nodir: true,
        });
      }
    } catch {
      // Not a valid path, treat as glob pattern
      files = await glob(inputPath, { nodir: true });
    }

    if (files.length === 0) {
      return [];
    }

    // Determine base path for generating frame keys
    const basePath = this.getBasePath(inputPath);

    // Load each sprite
    const sprites: SpriteInfo[] = [];

    for (const file of files) {
      try {
        const buffer = await fs.readFile(file);
        const image = sharp(buffer);
        const metadata = await image.metadata();

        if (!metadata.width || !metadata.height) {
          console.warn(`Skipping ${file}: unable to read dimensions`);
          continue;
        }

        // Generate frame key preserving directory structure
        const frameKey = this.generateFrameKey(file, basePath);

        let spriteInfo: SpriteInfo = {
          path: file,
          key: frameKey,
          width: metadata.width,
          height: metadata.height,
          buffer,
        };

        // Handle resizing if enabled (before trimming)
        if (this.options.resizeTo) {
          spriteInfo = await this.resizeSprite(spriteInfo, this.options.resizeTo);
        }

        // Handle trimming if enabled
        if (this.options.trim) {
          const trimmed = await this.trimSprite(spriteInfo);
          sprites.push(trimmed);
        } else {
          sprites.push(spriteInfo);
        }
      } catch (error) {
        console.warn(`Skipping ${file}: ${error}`);
      }
    }

    return sprites;
  }

  /**
   * Resize sprite to fit within target dimensions
   */
  private async resizeSprite(sprite: SpriteInfo, targetSize: number): Promise<SpriteInfo> {
    try {
      const image = sharp(sprite.buffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        return sprite;
      }

      // Map resize mode to sharp's fit options
      const fitMap: Record<string, any> = {
        contain: 'contain',
        cover: 'cover',
        stretch: 'fill',
      };

      // Map filter to sharp's kernel
      const kernelMap: Record<string, any> = {
        lanczos: 'lanczos3',
        nearest: 'nearest',
        linear: 'cubic',
      };

      const resizeOptions: any = {
        width: targetSize,
        height: targetSize,
        fit: fitMap[this.options.resizeMode],
        position: 'center',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: kernelMap[this.options.resizeFilter],
      };

      const resized = await image
        .resize(resizeOptions)
        .png()
        .toBuffer({ resolveWithObject: true });

      return {
        ...sprite,
        width: resized.info.width,
        height: resized.info.height,
        buffer: resized.data,
      };
    } catch (error) {
      console.warn(`Failed to resize ${sprite.path}: ${error}`);
      return sprite;
    }
  }

  /**
   * Trim transparent pixels from sprite
   */
  private async trimSprite(sprite: SpriteInfo): Promise<SpriteInfo> {
    try {
      const image = sharp(sprite.buffer);
      const trimmed = await image.trim().toBuffer({ resolveWithObject: true });

      const { data, info } = trimmed;
      const width = info.width;
      const height = info.height;

      // If image was trimmed, update sprite info
      if (width !== sprite.width || height !== sprite.height) {
        return {
          ...sprite,
          width,
          height,
          buffer: data,
          originalSize: { w: sprite.width, h: sprite.height },
          trimOffset: {
            x: info.trimOffsetLeft || 0,
            y: info.trimOffsetTop || 0,
          },
        };
      }
    } catch {
      // If trim fails, return original
    }

    return sprite;
  }

  /**
   * Generate the atlas PNG image
   */
  private async generateImage(
    placements: SpritePlacement[],
    width: number,
    height: number,
    outputPath: string
  ): Promise<void> {
    // Create base canvas
    const canvas = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    // Prepare composite operations
    const composites = placements.map((placement) => ({
      input: placement.buffer,
      left: placement.x,
      top: placement.y,
    }));

    // Composite all sprites onto canvas
    await canvas.composite(composites).png().toFile(outputPath);
  }

  /**
   * Generate the JSON metadata file
   */
  private async generateJSON(
    placements: SpritePlacement[],
    width: number,
    height: number,
    outputPath: string
  ): Promise<void> {
    const imageName = path.basename(outputPath).replace('.json', '.png').replace('.tsj', '.png');

    let jsonData: PhaserHashAtlas | PhaserArrayAtlas | TiledTileset;
    let finalOutputPath = outputPath;

    if (this.options.format === 'phaser3-hash') {
      jsonData = this.generatePhaserHashFormat(
        placements,
        width,
        height,
        imageName
      );
    } else if (this.options.format === 'phaser3-array') {
      jsonData = this.generatePhaserArrayFormat(
        placements,
        width,
        height,
        imageName
      );
    } else {
      // Tiled format uses .tsj extension
      finalOutputPath = outputPath.replace('.json', '.tsj');
      jsonData = this.generateTiledFormat(
        placements,
        width,
        height,
        imageName
      );
    }

    await fs.writeFile(finalOutputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  }

  /**
   * Generate Phaser 3 Hash format JSON
   */
  private generatePhaserHashFormat(
    placements: SpritePlacement[],
    width: number,
    height: number,
    imageName: string
  ): PhaserHashAtlas {
    const frames: Record<string, any> = {};

    for (const placement of placements) {
      const trimmed = !!placement.originalSize;
      const sourceSize = placement.originalSize || {
        w: placement.width,
        h: placement.height,
      };
      const trimOffset = placement.trimOffset || { x: 0, y: 0 };

      const frameData: any = {
        frame: {
          x: placement.x,
          y: placement.y,
          w: placement.width,
          h: placement.height,
        },
        rotated: false,
        trimmed,
        spriteSourceSize: {
          x: trimOffset.x,
          y: trimOffset.y,
          w: placement.width,
          h: placement.height,
        },
        sourceSize,
      };

      // Add grid metadata if using grid layout and metadata is enabled
      if (
        this.options.gridMetadata &&
        placement.gridX !== undefined &&
        placement.gridY !== undefined
      ) {
        frameData.grid = {
          x: placement.gridX,
          y: placement.gridY,
          cellWidth: placement.gridCellsWide || 1,
          cellHeight: placement.gridCellsHigh || 1,
        };
      }

      frames[placement.key] = frameData;
    }

    return {
      frames,
      meta: {
        image: imageName,
        format: 'RGBA8888',
        size: { w: width, h: height },
        scale: this.options.scale,
      },
    };
  }

  /**
   * Generate Phaser 3 Array format JSON
   */
  private generatePhaserArrayFormat(
    placements: SpritePlacement[],
    width: number,
    height: number,
    imageName: string
  ): PhaserArrayAtlas {
    const frames = placements.map((placement) => {
      const trimmed = !!placement.originalSize;
      const sourceSize = placement.originalSize || {
        w: placement.width,
        h: placement.height,
      };
      const trimOffset = placement.trimOffset || { x: 0, y: 0 };

      const frameData: any = {
        filename: placement.key,
        frame: {
          x: placement.x,
          y: placement.y,
          w: placement.width,
          h: placement.height,
        },
        rotated: false,
        trimmed,
        spriteSourceSize: {
          x: trimOffset.x,
          y: trimOffset.y,
          w: placement.width,
          h: placement.height,
        },
        sourceSize,
      };

      // Add grid metadata if using grid layout and metadata is enabled
      if (
        this.options.gridMetadata &&
        placement.gridX !== undefined &&
        placement.gridY !== undefined
      ) {
        frameData.grid = {
          x: placement.gridX,
          y: placement.gridY,
          cellWidth: placement.gridCellsWide || 1,
          cellHeight: placement.gridCellsHigh || 1,
        };
      }

      return frameData;
    });

    return {
      frames,
      meta: {
        image: imageName,
        format: 'RGBA8888',
        size: { w: width, h: height },
        scale: this.options.scale,
      },
    };
  }

  /**
   * Generate Tiled tileset format JSON (.tsj)
   */
  private generateTiledFormat(
    placements: SpritePlacement[],
    width: number,
    height: number,
    imageName: string
  ): TiledTileset {
    // Calculate grid dimensions based on gridSize if available, otherwise use max sprite dimensions
    let tileWidth: number;
    let tileHeight: number;
    let columns: number;

    if (this.options.gridSize) {
      // Use grid size as tile dimensions
      tileWidth = this.options.gridSize;
      tileHeight = this.options.gridSize;
      columns = Math.floor(width / this.options.gridSize);
    } else {
      // Find the most common or maximum sprite dimensions
      // For simplicity, use the first sprite's dimensions
      // In a real implementation, you might want to find the max or most common size
      const firstSprite = placements[0];
      tileWidth = firstSprite.width;
      tileHeight = firstSprite.height;

      // Calculate columns based on actual placements
      // We'll scan the placements to determine the grid structure
      columns = this.calculateTiledColumns(placements);
    }

    // Create tiles with properties mapping to original filenames
    const tiles = placements.map((placement, index) => ({
      id: index,
      type: placement.key,
      properties: [
        {
          name: 'filename',
          type: 'string',
          value: placement.key,
        },
        {
          name: 'originalPath',
          type: 'string',
          value: placement.path,
        },
      ],
    }));

    return {
      version: '1.10',
      tiledversion: '1.10.0',
      name: path.basename(imageName, '.png'),
      tilewidth: tileWidth,
      tileheight: tileHeight,
      tilecount: placements.length,
      columns,
      image: imageName,
      imagewidth: width,
      imageheight: height,
      margin: 0,
      spacing: this.options.padding + this.options.spacing,
      tiles,
    };
  }

  /**
   * Calculate the number of columns for Tiled tileset based on placements
   */
  private calculateTiledColumns(placements: SpritePlacement[]): number {
    if (placements.length === 0) return 0;

    // Find sprites on the first row (y position close to padding)
    const firstRowY = placements[0].y;
    const threshold = 5; // pixels tolerance
    const firstRowSprites = placements.filter(
      (p) => Math.abs(p.y - firstRowY) <= threshold
    );

    return Math.max(1, firstRowSprites.length);
  }

  /**
   * Get base path for frame key generation
   * Extracts the base directory from a glob pattern by finding
   * the path before any wildcard characters
   */
  private getBasePath(inputPath: string): string {
    // Find the first wildcard character (*, ?, {, [)
    const wildcardMatch = inputPath.match(/[*?{\[]/);

    if (!wildcardMatch || wildcardMatch.index === undefined) {
      // No wildcards, treat as a regular path
      // If it's a directory, return it; otherwise return its dirname
      return inputPath;
    }

    // Get everything before the first wildcard
    const beforeWildcard = inputPath.substring(0, wildcardMatch.index);

    // Find the last directory separator (works for both Unix and Windows)
    const lastSeparator = Math.max(
      beforeWildcard.lastIndexOf('/'),
      beforeWildcard.lastIndexOf('\\')
    );

    if (lastSeparator === -1) {
      // No separator found, use current directory
      return process.cwd();
    }

    // Return the base directory path (resolve to absolute path)
    return path.resolve(beforeWildcard.substring(0, lastSeparator));
  }

  /**
   * Generate frame key from file path, preserving directory structure
   */
  private generateFrameKey(filePath: string, basePath: string): string {
    // Get relative path from base
    let relativePath = path.relative(basePath, filePath);

    // If relative path goes up directories, just use filename
    if (relativePath.startsWith('..')) {
      relativePath = path.basename(filePath);
    }

    // Normalize path separators to forward slashes
    return relativePath.replace(/\\/g, '/');
  }

  /**
   * Load existing sprite manifest to preserve tile IDs
   */
  private async loadManifest(): Promise<SpriteManifest | null> {
    const manifestPath = `${this.options.output}.manifest.json`;

    try {
      const data = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(data) as SpriteManifest;
    } catch {
      // Manifest doesn't exist or is invalid, that's okay
      return null;
    }
  }

  /**
   * Save sprite manifest for future builds
   */
  private async saveManifest(placements: SpritePlacement[]): Promise<void> {
    const manifestPath = `${this.options.output}.manifest.json`;

    const manifest: SpriteManifest = {
      version: '1.0',
      spriteOrder: placements.map(p => p.key),
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    };

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  /**
   * Reorder sprites based on existing manifest to preserve tile IDs
   * Existing sprites keep their order, new sprites are appended alphabetically at the end
   */
  private async reorderSpritesFromManifest(sprites: SpriteInfo[]): Promise<SpriteInfo[]> {
    const manifest = await this.loadManifest();

    if (!manifest || manifest.spriteOrder.length === 0) {
      // No manifest exists, sort alphabetically for initial generation
      return [...sprites].sort((a, b) => a.key.localeCompare(b.key));
    }

    // Create a map of existing sprites by key
    const spriteMap = new Map<string, SpriteInfo>();
    for (const sprite of sprites) {
      spriteMap.set(sprite.key, sprite);
    }

    // Separate sprites into existing (from manifest) and new
    const orderedSprites: SpriteInfo[] = [];
    const newSpriteKeys = new Set(spriteMap.keys());

    // First, add all sprites that exist in the manifest, in manifest order
    for (const key of manifest.spriteOrder) {
      const sprite = spriteMap.get(key);
      if (sprite) {
        orderedSprites.push(sprite);
        newSpriteKeys.delete(key);
      }
      // If sprite is in manifest but not in current sprites, it was deleted - skip it
    }

    // Then, add any new sprites alphabetically at the end
    const newSprites = Array.from(newSpriteKeys)
      .map(key => spriteMap.get(key)!)
      .sort((a, b) => a.key.localeCompare(b.key));

    orderedSprites.push(...newSprites);

    // Log changes for user feedback
    if (newSprites.length > 0) {
      console.log(`ℹ️  Added ${newSprites.length} new sprite(s) to end of atlas:`);
      newSprites.forEach((s, i) => {
        const tileId = manifest.spriteOrder.length + i;
        console.log(`   [${tileId}] ${s.key}`);
      });
    }

    const removedCount = manifest.spriteOrder.length - (orderedSprites.length - newSprites.length);
    if (removedCount > 0) {
      console.log(`ℹ️  Removed ${removedCount} sprite(s) from atlas`);
    }

    return orderedSprites;
  }
}
