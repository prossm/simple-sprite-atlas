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

  constructor(padding: number = 2, maxSize: number = 2048) {
    this.padding = padding;
    this.maxSize = maxSize;
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

    // Sort sprites by height (descending) for better packing
    const sortedSprites = [...sprites].sort((a, b) => b.height - a.height);

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
