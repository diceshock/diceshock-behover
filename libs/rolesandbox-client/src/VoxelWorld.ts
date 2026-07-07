import * as Y from "yjs";

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: number; // 0xRRGGBB
}

export interface VoxelWorldData {
  voxels: Voxel[];
}

/**
 * VoxelWorld wraps a Yjs document to store voxel data.
 * The voxels are stored in a Y.Map keyed by "x,y,z" strings.
 */
export class VoxelWorld {
  readonly doc: Y.Doc;
  private voxelMap: Y.Map<number>;

  constructor(doc?: Y.Doc) {
    this.doc = doc ?? new Y.Doc();
    this.voxelMap = this.doc.getMap("voxels");
  }

  private key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  setVoxel(x: number, y: number, z: number, color: number): void {
    this.voxelMap.set(this.key(x, y, z), color);
  }

  removeVoxel(x: number, y: number, z: number): void {
    this.voxelMap.delete(this.key(x, y, z));
  }

  getVoxel(x: number, y: number, z: number): number | undefined {
    return this.voxelMap.get(this.key(x, y, z));
  }

  getAllVoxels(): Voxel[] {
    const result: Voxel[] = [];
    for (const [key, color] of this.voxelMap.entries()) {
      const [x, y, z] = key.split(",").map(Number);
      result.push({ x, y, z, color });
    }
    return result;
  }

  get size(): number {
    return this.voxelMap.size;
  }

  /**
   * Initialize with a default cube if the world is empty.
   */
  initDefaultCube(size = 3, color = 0x4488ff): void {
    if (this.voxelMap.size > 0) return;

    this.doc.transact(() => {
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          for (let z = 0; z < size; z++) {
            this.setVoxel(x, y, z, color);
          }
        }
      }
    });
  }

  onChange(callback: () => void): () => void {
    this.voxelMap.observe(callback);
    return () => this.voxelMap.unobserve(callback);
  }
}
