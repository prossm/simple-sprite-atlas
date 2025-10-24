/**
 * Output format for the atlas
 */
type AtlasFormat = 'phaser3-hash' | 'phaser3-array';
/**
 * Configuration options for atlas generation
 */
interface AtlasOptions {
    /**
     * Input source: directory path or glob pattern
     */
    input: string;
    /**
     * Output path (without extension). Will generate .png and .json files
     */
    output: string;
    /**
     * Atlas format
     * @default 'phaser3-hash'
     */
    format?: AtlasFormat;
    /**
     * Maximum atlas size (width and height). Must be power of 2.
     * @default 2048
     */
    maxSize?: number;
    /**
     * Padding between sprites in pixels
     * @default 2
     */
    padding?: number;
    /**
     * Spacing around each sprite
     * @default 0
     */
    spacing?: number;
    /**
     * Trim transparent pixels from sprites
     * @default false
     */
    trim?: boolean;
    /**
     * Scale factor for the atlas
     * @default 1
     */
    scale?: number;
}
/**
 * Sprite metadata from input file
 */
interface SpriteInfo {
    /**
     * Original file path
     */
    path: string;
    /**
     * Frame key (derived from file path, preserving directory structure)
     */
    key: string;
    /**
     * Original width
     */
    width: number;
    /**
     * Original height
     */
    height: number;
    /**
     * Image buffer
     */
    buffer: Buffer;
    /**
     * If trimmed, the offset from original position
     */
    trimOffset?: {
        x: number;
        y: number;
    };
    /**
     * If trimmed, the original size before trimming
     */
    originalSize?: {
        w: number;
        h: number;
    };
}
/**
 * Sprite placement in the atlas
 */
interface SpritePlacement extends SpriteInfo {
    /**
     * X position in atlas
     */
    x: number;
    /**
     * Y position in atlas
     */
    y: number;
}
/**
 * Frame data in Phaser JSON format
 */
interface PhaserFrame {
    frame: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    rotated: boolean;
    trimmed: boolean;
    spriteSourceSize: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    sourceSize: {
        w: number;
        h: number;
    };
}
/**
 * Phaser 3 JSON Hash format
 */
interface PhaserHashAtlas {
    frames: Record<string, PhaserFrame>;
    meta: {
        image: string;
        format: string;
        size: {
            w: number;
            h: number;
        };
        scale: number;
    };
}
/**
 * Phaser 3 JSON Array format
 */
interface PhaserArrayAtlas {
    frames: Array<PhaserFrame & {
        filename: string;
    }>;
    meta: {
        image: string;
        format: string;
        size: {
            w: number;
            h: number;
        };
        scale: number;
    };
}
/**
 * Result of atlas generation
 */
interface AtlasResult {
    /**
     * Path to generated PNG file
     */
    imagePath: string;
    /**
     * Path to generated JSON file
     */
    jsonPath: string;
    /**
     * Number of sprites packed
     */
    spriteCount: number;
    /**
     * Final atlas dimensions
     */
    size: {
        width: number;
        height: number;
    };
}

/**
 * Main atlas generator class
 */
declare class AtlasGenerator {
    private options;
    constructor(options: AtlasOptions);
    /**
     * Generate the sprite atlas
     */
    generate(): Promise<AtlasResult>;
    /**
     * Load all sprite images from input pattern
     */
    private loadSprites;
    /**
     * Trim transparent pixels from sprite
     */
    private trimSprite;
    /**
     * Generate the atlas PNG image
     */
    private generateImage;
    /**
     * Generate the JSON metadata file
     */
    private generateJSON;
    /**
     * Generate Phaser 3 Hash format JSON
     */
    private generatePhaserHashFormat;
    /**
     * Generate Phaser 3 Array format JSON
     */
    private generatePhaserArrayFormat;
    /**
     * Get base path for frame key generation
     */
    private getBasePath;
    /**
     * Generate frame key from file path, preserving directory structure
     */
    private generateFrameKey;
}

/**
 * Simple grid-based packer
 * Arranges sprites in rows, creating a compact rectangular atlas
 */
declare class GridPacker {
    private padding;
    private maxSize;
    constructor(padding?: number, maxSize?: number);
    /**
     * Pack sprites into an atlas layout
     * Returns array of sprite placements and final atlas dimensions
     */
    pack(sprites: SpriteInfo[]): {
        placements: SpritePlacement[];
        width: number;
        height: number;
    };
    /**
     * Calculate total area needed (useful for validation)
     */
    calculateRequiredArea(sprites: SpriteInfo[]): number;
    /**
     * Validate that sprites can theoretically fit in maxSize
     */
    canFit(sprites: SpriteInfo[]): boolean;
}

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
declare function generateAtlas(options: AtlasOptions): Promise<AtlasResult>;

export { type AtlasFormat, AtlasGenerator, type AtlasOptions, type AtlasResult, GridPacker, type PhaserArrayAtlas, type PhaserFrame, type PhaserHashAtlas, type SpriteInfo, type SpritePlacement, generateAtlas };
