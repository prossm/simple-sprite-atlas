"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AtlasGenerator: () => AtlasGenerator,
  GridPacker: () => GridPacker,
  generateAtlas: () => generateAtlas
});
module.exports = __toCommonJS(index_exports);

// src/generator.ts
var import_sharp = __toESM(require("sharp"));
var import_glob = require("glob");
var path = __toESM(require("path"));
var fs = __toESM(require("fs/promises"));

// src/packer.ts
function nextPowerOf2(n) {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}
var GridPacker = class {
  padding;
  maxSize;
  gridSize;
  stableOrder;
  constructor(padding = 2, maxSize = 2048, gridSize, stableOrder = false) {
    this.padding = padding;
    this.maxSize = maxSize;
    this.gridSize = gridSize;
    this.stableOrder = stableOrder;
  }
  /**
   * Pack sprites into an atlas layout
   * Returns array of sprite placements and final atlas dimensions
   */
  pack(sprites) {
    if (sprites.length === 0) {
      return { placements: [], width: 0, height: 0 };
    }
    if (this.gridSize) {
      return this.packFixedGrid(sprites);
    }
    return this.packRowBased(sprites);
  }
  /**
   * Pack sprites using standard row-based algorithm
   */
  packRowBased(sprites) {
    const sortedSprites = [...sprites].sort((a, b) => {
      if (this.stableOrder) {
        return a.key.localeCompare(b.key);
      }
      return b.height - a.height;
    });
    const placements = [];
    let currentX = this.padding;
    let currentY = this.padding;
    let rowHeight = 0;
    let maxWidth = 0;
    let maxHeight = 0;
    for (const sprite of sortedSprites) {
      const spriteWidth = sprite.width + this.padding;
      const spriteHeight = sprite.height + this.padding;
      if (currentX + spriteWidth > this.maxSize) {
        currentX = this.padding;
        currentY += rowHeight;
        rowHeight = 0;
        if (currentY + spriteHeight > this.maxSize) {
          throw new Error(
            `Cannot fit all sprites in atlas. Maximum size: ${this.maxSize}x${this.maxSize}. Consider increasing maxSize or reducing the number of sprites.`
          );
        }
      }
      placements.push({
        ...sprite,
        x: currentX,
        y: currentY
      });
      maxWidth = Math.max(maxWidth, currentX + sprite.width + this.padding);
      maxHeight = Math.max(maxHeight, currentY + sprite.height + this.padding);
      rowHeight = Math.max(rowHeight, spriteHeight);
      currentX += spriteWidth;
    }
    const finalWidth = Math.min(nextPowerOf2(maxWidth), this.maxSize);
    const finalHeight = Math.min(nextPowerOf2(maxHeight), this.maxSize);
    return {
      placements,
      width: finalWidth,
      height: finalHeight
    };
  }
  /**
   * Pack sprites using fixed grid-based algorithm
   * All sprites are aligned to grid boundaries
   */
  packFixedGrid(sprites) {
    const gridSize = this.gridSize;
    const sortedSprites = [...sprites].sort((a, b) => {
      if (this.stableOrder) {
        return a.key.localeCompare(b.key);
      }
      return b.width * b.height - a.width * a.height;
    });
    const placements = [];
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    let maxWidth = 0;
    let maxHeight = 0;
    for (const sprite of sortedSprites) {
      const cellsWide = Math.ceil((sprite.width + this.padding) / gridSize);
      const cellsHigh = Math.ceil((sprite.height + this.padding) / gridSize);
      const cellWidth = cellsWide * gridSize;
      const cellHeight = cellsHigh * gridSize;
      if (currentX + cellWidth > this.maxSize) {
        currentX = 0;
        currentY += rowHeight;
        rowHeight = 0;
        if (currentY + cellHeight > this.maxSize) {
          throw new Error(
            `Cannot fit all sprites in atlas with grid size ${gridSize}. Maximum size: ${this.maxSize}x${this.maxSize}. Consider increasing maxSize, reducing grid size, or reducing sprite count.`
          );
        }
      }
      const offsetX = Math.floor((cellWidth - sprite.width) / 2);
      const offsetY = Math.floor((cellHeight - sprite.height) / 2);
      placements.push({
        ...sprite,
        x: currentX + offsetX,
        y: currentY + offsetY,
        gridX: currentX / gridSize,
        gridY: currentY / gridSize,
        gridCellsWide: cellsWide,
        gridCellsHigh: cellsHigh
      });
      maxWidth = Math.max(maxWidth, currentX + cellWidth);
      maxHeight = Math.max(maxHeight, currentY + cellHeight);
      rowHeight = Math.max(rowHeight, cellHeight);
      currentX += cellWidth;
    }
    const gridAlignedWidth = Math.ceil(maxWidth / gridSize) * gridSize;
    const gridAlignedHeight = Math.ceil(maxHeight / gridSize) * gridSize;
    const finalWidth = Math.min(nextPowerOf2(gridAlignedWidth), this.maxSize);
    const finalHeight = Math.min(nextPowerOf2(gridAlignedHeight), this.maxSize);
    return {
      placements,
      width: finalWidth,
      height: finalHeight
    };
  }
  /**
   * Calculate total area needed (useful for validation)
   */
  calculateRequiredArea(sprites) {
    return sprites.reduce((total, sprite) => {
      const w = sprite.width + this.padding;
      const h = sprite.height + this.padding;
      return total + w * h;
    }, 0);
  }
  /**
   * Validate that sprites can theoretically fit in maxSize
   */
  canFit(sprites) {
    const requiredArea = this.calculateRequiredArea(sprites);
    const maxArea = this.maxSize * this.maxSize;
    if (requiredArea > maxArea) {
      return false;
    }
    for (const sprite of sprites) {
      if (sprite.width > this.maxSize || sprite.height > this.maxSize) {
        return false;
      }
    }
    return true;
  }
};

// src/generator.ts
var AtlasGenerator = class {
  options;
  constructor(options) {
    this.options = {
      format: "phaser3-hash",
      maxSize: 2048,
      padding: 2,
      spacing: 0,
      trim: false,
      scale: 1,
      resizeMode: "contain",
      resizeFilter: "lanczos",
      gridMetadata: false,
      stableOrder: false,
      preserveIds: true,
      ...options
    };
  }
  /**
   * Generate the sprite atlas
   */
  async generate() {
    let sprites = await this.loadSprites();
    if (sprites.length === 0) {
      throw new Error(`No images found matching pattern: ${this.options.input}`);
    }
    if (this.options.stableOrder && this.options.preserveIds) {
      sprites = await this.reorderSpritesFromManifest(sprites);
    }
    const packer = new GridPacker(
      this.options.padding + this.options.spacing,
      this.options.maxSize,
      this.options.gridSize,
      false
      // Don't sort in packer, we've already ordered the sprites
    );
    if (!packer.canFit(sprites)) {
      throw new Error(
        `Sprites cannot fit in ${this.options.maxSize}x${this.options.maxSize} atlas. Try increasing maxSize or reducing sprite count.`
      );
    }
    const { placements, width, height } = packer.pack(sprites);
    const imagePath = `${this.options.output}.png`;
    await this.generateImage(placements, width, height, imagePath);
    const jsonPath = `${this.options.output}.json`;
    await this.generateJSON(placements, width, height, jsonPath);
    if (this.options.stableOrder && this.options.preserveIds) {
      await this.saveManifest(placements);
    }
    return {
      imagePath,
      jsonPath,
      spriteCount: sprites.length,
      size: { width, height }
    };
  }
  /**
   * Load all sprite images from input pattern
   */
  async loadSprites() {
    const inputPath = this.options.input;
    let files = [];
    try {
      const stat2 = await fs.stat(inputPath);
      if (stat2.isDirectory()) {
        files = await (0, import_glob.glob)(`${inputPath}/**/*.{png,jpg,jpeg}`, {
          nodir: true
        });
      }
    } catch {
      files = await (0, import_glob.glob)(inputPath, { nodir: true });
    }
    if (files.length === 0) {
      return [];
    }
    const basePath = this.getBasePath(inputPath);
    const sprites = [];
    for (const file of files) {
      try {
        const buffer = await fs.readFile(file);
        const image = (0, import_sharp.default)(buffer);
        const metadata = await image.metadata();
        if (!metadata.width || !metadata.height) {
          console.warn(`Skipping ${file}: unable to read dimensions`);
          continue;
        }
        const frameKey = this.generateFrameKey(file, basePath);
        let spriteInfo = {
          path: file,
          key: frameKey,
          width: metadata.width,
          height: metadata.height,
          buffer
        };
        if (this.options.resizeTo) {
          spriteInfo = await this.resizeSprite(spriteInfo, this.options.resizeTo);
        }
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
  async resizeSprite(sprite, targetSize) {
    try {
      const image = (0, import_sharp.default)(sprite.buffer);
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) {
        return sprite;
      }
      const fitMap = {
        contain: "contain",
        cover: "cover",
        stretch: "fill"
      };
      const kernelMap = {
        lanczos: "lanczos3",
        nearest: "nearest",
        linear: "cubic"
      };
      const resizeOptions = {
        width: targetSize,
        height: targetSize,
        fit: fitMap[this.options.resizeMode],
        position: "center",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: kernelMap[this.options.resizeFilter]
      };
      const resized = await image.resize(resizeOptions).png().toBuffer({ resolveWithObject: true });
      return {
        ...sprite,
        width: resized.info.width,
        height: resized.info.height,
        buffer: resized.data
      };
    } catch (error) {
      console.warn(`Failed to resize ${sprite.path}: ${error}`);
      return sprite;
    }
  }
  /**
   * Trim transparent pixels from sprite
   */
  async trimSprite(sprite) {
    try {
      const image = (0, import_sharp.default)(sprite.buffer);
      const trimmed = await image.trim().toBuffer({ resolveWithObject: true });
      const { data, info } = trimmed;
      const width = info.width;
      const height = info.height;
      if (width !== sprite.width || height !== sprite.height) {
        return {
          ...sprite,
          width,
          height,
          buffer: data,
          originalSize: { w: sprite.width, h: sprite.height },
          trimOffset: {
            x: info.trimOffsetLeft || 0,
            y: info.trimOffsetTop || 0
          }
        };
      }
    } catch {
    }
    return sprite;
  }
  /**
   * Generate the atlas PNG image
   */
  async generateImage(placements, width, height, outputPath) {
    const canvas = (0, import_sharp.default)({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });
    const composites = placements.map((placement) => ({
      input: placement.buffer,
      left: placement.x,
      top: placement.y
    }));
    await canvas.composite(composites).png().toFile(outputPath);
  }
  /**
   * Generate the JSON metadata file
   */
  async generateJSON(placements, width, height, outputPath) {
    const imageName = path.basename(outputPath).replace(".json", ".png").replace(".tsj", ".png");
    let jsonData;
    let finalOutputPath = outputPath;
    if (this.options.format === "phaser3-hash") {
      jsonData = this.generatePhaserHashFormat(
        placements,
        width,
        height,
        imageName
      );
    } else if (this.options.format === "phaser3-array") {
      jsonData = this.generatePhaserArrayFormat(
        placements,
        width,
        height,
        imageName
      );
    } else {
      finalOutputPath = outputPath.replace(".json", ".tsj");
      jsonData = this.generateTiledFormat(
        placements,
        width,
        height,
        imageName
      );
    }
    await fs.writeFile(finalOutputPath, JSON.stringify(jsonData, null, 2), "utf-8");
  }
  /**
   * Generate Phaser 3 Hash format JSON
   */
  generatePhaserHashFormat(placements, width, height, imageName) {
    const frames = {};
    for (const placement of placements) {
      const trimmed = !!placement.originalSize;
      const sourceSize = placement.originalSize || {
        w: placement.width,
        h: placement.height
      };
      const trimOffset = placement.trimOffset || { x: 0, y: 0 };
      const frameData = {
        frame: {
          x: placement.x,
          y: placement.y,
          w: placement.width,
          h: placement.height
        },
        rotated: false,
        trimmed,
        spriteSourceSize: {
          x: trimOffset.x,
          y: trimOffset.y,
          w: placement.width,
          h: placement.height
        },
        sourceSize
      };
      if (this.options.gridMetadata && placement.gridX !== void 0 && placement.gridY !== void 0) {
        frameData.grid = {
          x: placement.gridX,
          y: placement.gridY,
          cellWidth: placement.gridCellsWide || 1,
          cellHeight: placement.gridCellsHigh || 1
        };
      }
      frames[placement.key] = frameData;
    }
    return {
      frames,
      meta: {
        image: imageName,
        format: "RGBA8888",
        size: { w: width, h: height },
        scale: this.options.scale
      }
    };
  }
  /**
   * Generate Phaser 3 Array format JSON
   */
  generatePhaserArrayFormat(placements, width, height, imageName) {
    const frames = placements.map((placement) => {
      const trimmed = !!placement.originalSize;
      const sourceSize = placement.originalSize || {
        w: placement.width,
        h: placement.height
      };
      const trimOffset = placement.trimOffset || { x: 0, y: 0 };
      const frameData = {
        filename: placement.key,
        frame: {
          x: placement.x,
          y: placement.y,
          w: placement.width,
          h: placement.height
        },
        rotated: false,
        trimmed,
        spriteSourceSize: {
          x: trimOffset.x,
          y: trimOffset.y,
          w: placement.width,
          h: placement.height
        },
        sourceSize
      };
      if (this.options.gridMetadata && placement.gridX !== void 0 && placement.gridY !== void 0) {
        frameData.grid = {
          x: placement.gridX,
          y: placement.gridY,
          cellWidth: placement.gridCellsWide || 1,
          cellHeight: placement.gridCellsHigh || 1
        };
      }
      return frameData;
    });
    return {
      frames,
      meta: {
        image: imageName,
        format: "RGBA8888",
        size: { w: width, h: height },
        scale: this.options.scale
      }
    };
  }
  /**
   * Generate Tiled tileset format JSON (.tsj)
   */
  generateTiledFormat(placements, width, height, imageName) {
    let tileWidth;
    let tileHeight;
    let columns;
    if (this.options.gridSize) {
      tileWidth = this.options.gridSize;
      tileHeight = this.options.gridSize;
      columns = Math.floor(width / this.options.gridSize);
    } else {
      const firstSprite = placements[0];
      tileWidth = firstSprite.width;
      tileHeight = firstSprite.height;
      columns = this.calculateTiledColumns(placements);
    }
    const tiles = placements.map((placement, index) => ({
      id: index,
      type: placement.key,
      properties: [
        {
          name: "filename",
          type: "string",
          value: placement.key
        },
        {
          name: "originalPath",
          type: "string",
          value: placement.path
        }
      ]
    }));
    return {
      version: "1.10",
      tiledversion: "1.10.0",
      name: path.basename(imageName, ".png"),
      tilewidth: tileWidth,
      tileheight: tileHeight,
      tilecount: placements.length,
      columns,
      image: imageName,
      imagewidth: width,
      imageheight: height,
      margin: 0,
      spacing: this.options.padding + this.options.spacing,
      tiles
    };
  }
  /**
   * Calculate the number of columns for Tiled tileset based on placements
   */
  calculateTiledColumns(placements) {
    if (placements.length === 0) return 0;
    const firstRowY = placements[0].y;
    const threshold = 5;
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
  getBasePath(inputPath) {
    const wildcardMatch = inputPath.match(/[*?{\[]/);
    if (!wildcardMatch || wildcardMatch.index === void 0) {
      return inputPath;
    }
    const beforeWildcard = inputPath.substring(0, wildcardMatch.index);
    const lastSeparator = Math.max(
      beforeWildcard.lastIndexOf("/"),
      beforeWildcard.lastIndexOf("\\")
    );
    if (lastSeparator === -1) {
      return process.cwd();
    }
    return path.resolve(beforeWildcard.substring(0, lastSeparator));
  }
  /**
   * Generate frame key from file path, preserving directory structure
   */
  generateFrameKey(filePath, basePath) {
    let relativePath = path.relative(basePath, filePath);
    if (relativePath.startsWith("..")) {
      relativePath = path.basename(filePath);
    }
    return relativePath.replace(/\\/g, "/");
  }
  /**
   * Load existing sprite manifest to preserve tile IDs
   */
  async loadManifest() {
    const manifestPath = `${this.options.output}.manifest.json`;
    try {
      const data = await fs.readFile(manifestPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  /**
   * Save sprite manifest for future builds
   */
  async saveManifest(placements) {
    const manifestPath = `${this.options.output}.manifest.json`;
    const manifest = {
      version: "1.0",
      spriteOrder: placements.map((p) => p.key),
      metadata: {
        created: (/* @__PURE__ */ new Date()).toISOString(),
        modified: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  }
  /**
   * Reorder sprites based on existing manifest to preserve tile IDs
   * Existing sprites keep their order, new sprites are appended alphabetically at the end
   */
  async reorderSpritesFromManifest(sprites) {
    const manifest = await this.loadManifest();
    if (!manifest || manifest.spriteOrder.length === 0) {
      return [...sprites].sort((a, b) => a.key.localeCompare(b.key));
    }
    const spriteMap = /* @__PURE__ */ new Map();
    for (const sprite of sprites) {
      spriteMap.set(sprite.key, sprite);
    }
    const orderedSprites = [];
    const newSpriteKeys = new Set(spriteMap.keys());
    for (const key of manifest.spriteOrder) {
      const sprite = spriteMap.get(key);
      if (sprite) {
        orderedSprites.push(sprite);
        newSpriteKeys.delete(key);
      }
    }
    const newSprites = Array.from(newSpriteKeys).map((key) => spriteMap.get(key)).sort((a, b) => a.key.localeCompare(b.key));
    orderedSprites.push(...newSprites);
    if (newSprites.length > 0) {
      console.log(`\u2139\uFE0F  Added ${newSprites.length} new sprite(s) to end of atlas:`);
      newSprites.forEach((s, i) => {
        const tileId = manifest.spriteOrder.length + i;
        console.log(`   [${tileId}] ${s.key}`);
      });
    }
    const removedCount = manifest.spriteOrder.length - (orderedSprites.length - newSprites.length);
    if (removedCount > 0) {
      console.log(`\u2139\uFE0F  Removed ${removedCount} sprite(s) from atlas`);
    }
    return orderedSprites;
  }
};

// src/index.ts
async function generateAtlas(options) {
  const generator = new AtlasGenerator(options);
  return await generator.generate();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AtlasGenerator,
  GridPacker,
  generateAtlas
});
