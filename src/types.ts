/**
 * Output format for the atlas
 */
export type AtlasFormat = 'phaser3-hash' | 'phaser3-array' | 'tiled';

/**
 * Resize mode for sprite resizing
 */
export type ResizeMode = 'contain' | 'cover' | 'stretch';

/**
 * Resize filter for image resampling
 */
export type ResizeFilter = 'nearest' | 'linear' | 'lanczos';

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

  /**
   * Resize all sprites to fit within this dimension (maintains aspect ratio)
   */
  resizeTo?: number;

  /**
   * Resize mode: how to handle aspect ratio when resizing
   * @default 'contain'
   */
  resizeMode?: ResizeMode;

  /**
   * Resize filter: image resampling algorithm
   * @default 'lanczos'
   */
  resizeFilter?: ResizeFilter;

  /**
   * Grid cell size: layout sprites on a fixed grid of this size
   */
  gridSize?: number;

  /**
   * Include grid position metadata in JSON output
   * @default false
   */
  gridMetadata?: boolean;

  /**
   * Sort sprites alphabetically for stable, predictable tile IDs
   * Recommended for use with Tiled to prevent tile ID changes when sprites are added
   * When enabled, also creates a .manifest.json file to track sprite IDs across rebuilds
   * @default false
   */
  stableOrder?: boolean;

  /**
   * Preserve existing sprite IDs from previous atlas generation
   * Reads the existing output JSON to maintain tile ID stability
   * Only works when stableOrder is enabled
   * @default true (when stableOrder is true)
   */
  preserveIds?: boolean;
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

  /**
   * Grid position (if using grid layout)
   */
  gridX?: number;
  gridY?: number;
  gridCellsWide?: number;
  gridCellsHigh?: number;
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
  grid?: {
    x: number;
    y: number;
    cellWidth: number;
    cellHeight: number;
  };
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
 * Sprite manifest for preserving tile IDs across rebuilds
 */
export interface SpriteManifest {
  version: string;
  spriteOrder: string[];  // Array of sprite keys in order
  metadata?: {
    created: string;
    modified: string;
  };
}

/**
 * Tiled tileset tile definition
 */
export interface TiledTile {
  id: number;
  type?: string;
  properties?: Array<{
    name: string;
    type: string;
    value: string | number | boolean;
  }>;
}

/**
 * Tiled tileset JSON format (.tsj)
 */
export interface TiledTileset {
  version?: string;
  tiledversion?: string;
  name: string;
  tilewidth: number;
  tileheight: number;
  tilecount: number;
  columns: number;
  image: string;
  imagewidth: number;
  imageheight: number;
  margin?: number;
  spacing?: number;
  tiles?: TiledTile[];
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
