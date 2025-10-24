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
});
