import type { SpriteInfo, SpritePlacement } from './types.js';

/**
 * Calculate the next power of 2 greater than or equal to n
 */
function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Simple grid-based packer
 * Arranges sprites in rows, creating a compact rectangular atlas
 */
export class GridPacker {
  private padding: number;
  private maxSize: number;
  private gridSize?: number;
  private stableOrder: boolean;

  constructor(padding: number = 2, maxSize: number = 2048, gridSize?: number, stableOrder: boolean = false) {
    this.padding = padding;
    this.maxSize = maxSize;
    this.gridSize = gridSize;
    this.stableOrder = stableOrder;
  }

  /**
   * Pack sprites into an atlas layout
   * Returns array of sprite placements and final atlas dimensions
   */
  pack(sprites: SpriteInfo[]): {
    placements: SpritePlacement[];
    width: number;
    height: number;
  } {
    if (sprites.length === 0) {
      return { placements: [], width: 0, height: 0 };
    }

    // Use fixed grid packing if gridSize is specified
    if (this.gridSize) {
      return this.packFixedGrid(sprites);
    }

    // Otherwise use standard row-based packing
    return this.packRowBased(sprites);
  }

  /**
   * Pack sprites using standard row-based algorithm
   */
  private packRowBased(sprites: SpriteInfo[]): {
    placements: SpritePlacement[];
    width: number;
    height: number;
  } {

    // Sort sprites: alphabetically if stable order is enabled, otherwise by height
    const sortedSprites = [...sprites].sort((a, b) => {
      if (this.stableOrder) {
        return a.key.localeCompare(b.key);
      }
      return b.height - a.height;
    });

    const placements: SpritePlacement[] = [];
    let currentX = this.padding;
    let currentY = this.padding;
    let rowHeight = 0;
    let maxWidth = 0;
    let maxHeight = 0;

    for (const sprite of sortedSprites) {
      const spriteWidth = sprite.width + this.padding;
      const spriteHeight = sprite.height + this.padding;

      // Check if we need to start a new row
      if (currentX + spriteWidth > this.maxSize) {
        // Move to next row
        currentX = this.padding;
        currentY += rowHeight;
        rowHeight = 0;

        // Check if we've exceeded max height
        if (currentY + spriteHeight > this.maxSize) {
          throw new Error(
            `Cannot fit all sprites in atlas. Maximum size: ${this.maxSize}x${this.maxSize}. ` +
            `Consider increasing maxSize or reducing the number of sprites.`
          );
        }
      }

      // Place sprite
      placements.push({
        ...sprite,
        x: currentX,
        y: currentY,
      });

      // Update dimensions
      maxWidth = Math.max(maxWidth, currentX + sprite.width + this.padding);
      maxHeight = Math.max(maxHeight, currentY + sprite.height + this.padding);

      // Update row tracking
      rowHeight = Math.max(rowHeight, spriteHeight);
      currentX += spriteWidth;
    }

    // Round up to next power of 2 for better GPU compatibility
    const finalWidth = Math.min(nextPowerOf2(maxWidth), this.maxSize);
    const finalHeight = Math.min(nextPowerOf2(maxHeight), this.maxSize);

    return {
      placements,
      width: finalWidth,
      height: finalHeight,
    };
  }

  /**
   * Pack sprites using fixed grid-based algorithm
   * All sprites are aligned to grid boundaries
   */
  private packFixedGrid(sprites: SpriteInfo[]): {
    placements: SpritePlacement[];
    width: number;
    height: number;
  } {
    const gridSize = this.gridSize!;

    // Sort sprites: alphabetically if stable order is enabled, otherwise by area
    const sortedSprites = [...sprites].sort((a, b) => {
      if (this.stableOrder) {
        return a.key.localeCompare(b.key);
      }
      return b.width * b.height - a.width * a.height;
    });

    const placements: SpritePlacement[] = [];
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    let maxWidth = 0;
    let maxHeight = 0;

    for (const sprite of sortedSprites) {
      // Calculate grid cells needed for this sprite
      const cellsWide = Math.ceil((sprite.width + this.padding) / gridSize);
      const cellsHigh = Math.ceil((sprite.height + this.padding) / gridSize);
      const cellWidth = cellsWide * gridSize;
      const cellHeight = cellsHigh * gridSize;

      // Check if we need to start a new row
      if (currentX + cellWidth > this.maxSize) {
        // Move to next row
        currentX = 0;
        currentY += rowHeight;
        rowHeight = 0;

        // Check if we've exceeded max height
        if (currentY + cellHeight > this.maxSize) {
          throw new Error(
            `Cannot fit all sprites in atlas with grid size ${gridSize}. ` +
            `Maximum size: ${this.maxSize}x${this.maxSize}. ` +
            `Consider increasing maxSize, reducing grid size, or reducing sprite count.`
          );
        }
      }

      // Place sprite (centered in its grid cells with padding)
      const offsetX = Math.floor((cellWidth - sprite.width) / 2);
      const offsetY = Math.floor((cellHeight - sprite.height) / 2);

      placements.push({
        ...sprite,
        x: currentX + offsetX,
        y: currentY + offsetY,
        gridX: currentX / gridSize,
        gridY: currentY / gridSize,
        gridCellsWide: cellsWide,
        gridCellsHigh: cellsHigh,
      });

      // Update dimensions
      maxWidth = Math.max(maxWidth, currentX + cellWidth);
      maxHeight = Math.max(maxHeight, currentY + cellHeight);

      // Update row tracking
      rowHeight = Math.max(rowHeight, cellHeight);
      currentX += cellWidth;
    }

    // Round up to grid boundaries and power of 2
    const gridAlignedWidth = Math.ceil(maxWidth / gridSize) * gridSize;
    const gridAlignedHeight = Math.ceil(maxHeight / gridSize) * gridSize;
    const finalWidth = Math.min(nextPowerOf2(gridAlignedWidth), this.maxSize);
    const finalHeight = Math.min(nextPowerOf2(gridAlignedHeight), this.maxSize);

    return {
      placements,
      width: finalWidth,
      height: finalHeight,
    };
  }

  /**
   * Calculate total area needed (useful for validation)
   */
  calculateRequiredArea(sprites: SpriteInfo[]): number {
    return sprites.reduce((total, sprite) => {
      const w = sprite.width + this.padding;
      const h = sprite.height + this.padding;
      return total + w * h;
    }, 0);
  }

  /**
   * Validate that sprites can theoretically fit in maxSize
   */
  canFit(sprites: SpriteInfo[]): boolean {
    const requiredArea = this.calculateRequiredArea(sprites);
    const maxArea = this.maxSize * this.maxSize;

    // Check area constraint
    if (requiredArea > maxArea) {
      return false;
    }

    // Check if any single sprite exceeds max dimensions
    for (const sprite of sprites) {
      if (sprite.width > this.maxSize || sprite.height > this.maxSize) {
        return false;
      }
    }

    return true;
  }
}
