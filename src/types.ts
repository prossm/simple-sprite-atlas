/**
 * Output format for the atlas
 */
export type AtlasFormat = 'phaser3-hash' | 'phaser3-array';

/**
 * Configuration options for atlas generation
 */
export interface AtlasOptions {
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
export interface SpriteInfo {
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
  trimOffset?: { x: number; y: number };

  /**
   * If trimmed, the original size before trimming
   */
  originalSize?: { w: number; h: number };
}

/**
 * Sprite placement in the atlas
 */
export interface SpritePlacement extends SpriteInfo {
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
export interface PhaserFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

/**
 * Phaser 3 JSON Hash format
 */
export interface PhaserHashAtlas {
  frames: Record<string, PhaserFrame>;
  meta: {
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: number;
  };
}

/**
 * Phaser 3 JSON Array format
 */
export interface PhaserArrayAtlas {
  frames: Array<PhaserFrame & { filename: string }>;
  meta: {
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: number;
  };
}

/**
 * Result of atlas generation
 */
export interface AtlasResult {
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
  size: { width: number; height: number };
}
