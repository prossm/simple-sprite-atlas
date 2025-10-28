import { describe, it, expect } from 'vitest';
import { GridPacker } from '../src/packer.js';
import type { SpriteInfo } from '../src/types.js';

describe('GridPacker', () => {
  it('should pack sprites in a grid', () => {
    const packer = new GridPacker(2, 2048);

    const sprites: SpriteInfo[] = [
      {
        path: 'sprite1.png',
        key: 'sprite1.png',
        width: 64,
        height: 64,
        buffer: Buffer.from(''),
      },
      {
        path: 'sprite2.png',
        key: 'sprite2.png',
        width: 64,
        height: 64,
        buffer: Buffer.from(''),
      },
    ];

    const result = packer.pack(sprites);

    expect(result.placements).toHaveLength(2);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('should handle empty sprite list', () => {
    const packer = new GridPacker(2, 2048);
    const result = packer.pack([]);

    expect(result.placements).toHaveLength(0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it('should throw error if sprites exceed maxSize', () => {
    const packer = new GridPacker(2, 128);

    const sprites: SpriteInfo[] = Array(100).fill(null).map((_, i) => ({
      path: `sprite${i}.png`,
      key: `sprite${i}.png`,
      width: 64,
      height: 64,
      buffer: Buffer.from(''),
    }));

    expect(() => packer.pack(sprites)).toThrow();
  });

  it('should correctly calculate required area', () => {
    const packer = new GridPacker(2, 2048);

    const sprites: SpriteInfo[] = [
      {
        path: 'sprite1.png',
        key: 'sprite1.png',
        width: 64,
        height: 64,
        buffer: Buffer.from(''),
      },
      {
        path: 'sprite2.png',
        key: 'sprite2.png',
        width: 32,
        height: 32,
        buffer: Buffer.from(''),
      },
    ];

    const area = packer.calculateRequiredArea(sprites);

    // (64 + 2) * (64 + 2) + (32 + 2) * (32 + 2)
    expect(area).toBe(66 * 66 + 34 * 34);
  });

  it('should validate if sprites can fit', () => {
    const packer = new GridPacker(2, 2048);

    const fittableSprites: SpriteInfo[] = [
      {
        path: 'sprite1.png',
        key: 'sprite1.png',
        width: 64,
        height: 64,
        buffer: Buffer.from(''),
      },
    ];

    const tooLargeSprites: SpriteInfo[] = [
      {
        path: 'huge.png',
        key: 'huge.png',
        width: 4096,
        height: 4096,
        buffer: Buffer.from(''),
      },
    ];

    expect(packer.canFit(fittableSprites)).toBe(true);
    expect(packer.canFit(tooLargeSprites)).toBe(false);
  });

  it('should place sprites without overlap', () => {
    const packer = new GridPacker(2, 2048);

    const sprites: SpriteInfo[] = [
      {
        path: 'sprite1.png',
        key: 'sprite1.png',
        width: 64,
        height: 64,
        buffer: Buffer.from(''),
      },
      {
        path: 'sprite2.png',
        key: 'sprite2.png',
        width: 64,
        height: 64,
        buffer: Buffer.from(''),
      },
    ];

    const result = packer.pack(sprites);

    // Check that sprites don't overlap
    const [p1, p2] = result.placements;

    const overlap = !(
      p1.x + p1.width <= p2.x ||
      p2.x + p2.width <= p1.x ||
      p1.y + p1.height <= p2.y ||
      p2.y + p2.height <= p1.y
    );

    expect(overlap).toBe(false);
  });

  describe('Grid-based packing', () => {
    it('should pack sprites on fixed grid with gridSize', () => {
      const gridSize = 32;
      const packer = new GridPacker(2, 2048, gridSize);

      const sprites: SpriteInfo[] = [
        {
          path: 'sprite1.png',
          key: 'sprite1.png',
          width: 24,
          height: 24,
          buffer: Buffer.from(''),
        },
        {
          path: 'sprite2.png',
          key: 'sprite2.png',
          width: 30,
          height: 30,
          buffer: Buffer.from(''),
        },
      ];

      const result = packer.pack(sprites);

      // Verify grid metadata is present
      expect(result.placements[0].gridX).toBeDefined();
      expect(result.placements[0].gridY).toBeDefined();
      expect(result.placements[0].gridCellsWide).toBeDefined();
      expect(result.placements[0].gridCellsHigh).toBeDefined();

      // Verify positions are multiples of gridSize
      result.placements.forEach(placement => {
        const gridX = placement.gridX!;
        const gridY = placement.gridY!;
        expect(gridX * gridSize).toBe(
          Math.floor(placement.x / gridSize) * gridSize
        );
        expect(gridY * gridSize).toBe(
          Math.floor(placement.y / gridSize) * gridSize
        );
      });
    });

    it('should align atlas dimensions to grid boundaries', () => {
      const gridSize = 32;
      const packer = new GridPacker(2, 2048, gridSize);

      const sprites: SpriteInfo[] = [
        {
          path: 'sprite1.png',
          key: 'sprite1.png',
          width: 20,
          height: 20,
          buffer: Buffer.from(''),
        },
      ];

      const result = packer.pack(sprites);

      // Atlas dimensions should be multiples of grid size and power of 2
      expect(result.width % gridSize).toBe(0);
      expect(result.height % gridSize).toBe(0);

      // Should also be power of 2
      expect(Math.log2(result.width) % 1).toBe(0);
      expect(Math.log2(result.height) % 1).toBe(0);
    });

    it('should calculate correct grid cell count', () => {
      const gridSize = 32;
      const packer = new GridPacker(2, 2048, gridSize);

      const sprites: SpriteInfo[] = [
        {
          path: 'small.png',
          key: 'small.png',
          width: 20,
          height: 20,
          buffer: Buffer.from(''),
        },
        {
          path: 'large.png',
          key: 'large.png',
          width: 50,
          height: 50,
          buffer: Buffer.from(''),
        },
      ];

      const result = packer.pack(sprites);

      // Small sprite (20x20 + 2 padding = 22x22) should fit in 1 cell
      const smallSprite = result.placements.find(p => p.key === 'small.png');
      expect(smallSprite?.gridCellsWide).toBe(1);
      expect(smallSprite?.gridCellsHigh).toBe(1);

      // Large sprite (50x50 + 2 padding = 52x52) should need 2 cells
      const largeSprite = result.placements.find(p => p.key === 'large.png');
      expect(largeSprite?.gridCellsWide).toBe(2);
      expect(largeSprite?.gridCellsHigh).toBe(2);
    });

    it('should throw error if sprites cannot fit with grid layout', () => {
      const gridSize = 64;
      const packer = new GridPacker(2, 256, gridSize);

      // Create many sprites that won't fit
      const sprites: SpriteInfo[] = Array(50)
        .fill(null)
        .map((_, i) => ({
          path: `sprite${i}.png`,
          key: `sprite${i}.png`,
          width: 60,
          height: 60,
          buffer: Buffer.from(''),
        }));

      expect(() => packer.pack(sprites)).toThrow(/grid size/);
    });
  });
});
