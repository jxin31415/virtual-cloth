import { Mat3, Mat4, Vec3, Vec4 } from "../lib/TSM.js";

/* A potential interface that students should implement */
interface IMengerSponge {
  setLevel(level: number): void;
  isDirty(): boolean;
  setClean(): void;
  normalsFlat(): Float32Array;
  indicesFlat(): Uint32Array;
  positionsFlat(): Float32Array;
}

/**
 * Represents a Menger Sponge
 */
export class MengerSponge implements IMengerSponge {

  private dirty : boolean = true;
  private vertices : Float32Array;
  private faces : Uint32Array;
  private normals : Float32Array;

  private static normal_map: Float32Array = new Float32Array([
    0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, // -Z direction
    0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, // Z direction
    -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, // -X direction
    1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, // X direction
    0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, // -Y direction
    0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, // Y direction
  ]);

  private static recursive_cubes = [
    [-1, -1, -1], [0, -1, -1], [1, -1, -1],
    [-1, -1, 0], [1, -1, 0], // [0, -1, 0], 
    [-1, -1, 1], [0, -1, 1], [1, -1, 1], // Bottom layer
    [-1, 1, -1], [0, 1, -1], [1, 1, -1],
    [-1, 1, 0], [1, 1, 0], // [0, 1, 0], 
    [-1, 1, 1], [0, 1, 1], [1, 1, 1], // Top layer
    [-1, 0, -1], [1, 0, -1], [-1, 0, 1],  [1, 0, 1], // Middle layer
  ];
  
  constructor(level: number) {
	  this.setLevel(level);
    this.dirty = true;
  }

  /**
   * Returns true if the sponge has changed.
   */
  public isDirty(): boolean {
      return this.dirty;
  }

  public setClean(): void {
    this.dirty = false;
  }

  private buildSponge(level: number, l: number, origin: Vec3) {
    if (level <= 1) {
      var v = [
        l, -l, -l, 1.0, -l, -l, -l, 1.0, l, l, -l, 1.0, l, l, -l, 1.0, -l, -l, -l, 1.0, -l, l, -l, 1.0, // Front face
        l, -l, l, 1.0, l, l, l, 1.0, -l, -l, l, 1.0, l, l, l, 1.0, -l, l, l, 1.0, -l, -l, l, 1.0, // Back face 
        -l, l, -l, 1.0, -l, -l, -l, 1.0, -l, l, l, 1.0, -l, -l, -l, 1.0, -l, -l, l, 1.0, -l, l, l, 1.0, // Right face
        l, l, -l, 1.0, l, l, l, 1.0, l, -l, -l, 1.0, l, -l, -l, 1.0, l, l, l, 1.0, l, -l, l, 1.0, // Left face
        l, -l, -l, 1.0, l, -l, l, 1.0, -l, -l, l, 1.0, -l, -l, l, 1.0, -l, -l, -l, 1.0, l, -l, -l, 1.0, // Bottom face
        l, l, -l, 1.0, -l, l, l, 1.0, l, l, l, 1.0, -l, l, l, 1.0, l, l, -l, 1.0, -l, l, -l, 1.0, // Top face
      ];
      for (var i: number = 0; i < v.length; i++) {
        switch (i % 4) {
          case 0:
            v[i] += origin.x;
            break;
          case 1:
            v[i] += origin.y;
            break;
          case 2:
            v[i] += origin.z;
            break;
        }
      }
      return v;
    }

    var cons = [];
    var l_f : number = l / 3;

    for (var i: number = 0; i < MengerSponge.recursive_cubes.length; i++) {
      var offset = MengerSponge.recursive_cubes[i];
      var origin_f = new Vec3([origin.x + 2 * l_f * offset[0], origin.y + 2 * l_f * offset[1], origin.z + 2 * l_f * offset[2]]);
      var v_f = this.buildSponge(level - 1, l_f, origin_f);
      Array.prototype.push.apply(cons, v_f);
    }

    return cons;
  }
  
  public setLevel(level: number)
  {
	  this.dirty = true;
    console.log("Setting level");

    this.vertices = new Float32Array(this.buildSponge(level, 0.5, new Vec3([0, 0, 0])));

    this.faces = new Uint32Array(this.vertices.length / 4);
    for(var i : number = 0; i < this.faces.length; i++) {
      this.faces[i] = i;
    }

    this.normals = new Float32Array(this.vertices.length);
    for(var i : number = 0, j : number = 0; i < this.normals.length; i++, j++) {
      if (j >= MengerSponge.normal_map.length) {
        j = 0;
      }
      this.normals[i] = MengerSponge.normal_map[j];
    }
  }

  /* Returns a flat Float32Array of the sponge's vertex positions */
  public positionsFlat(): Float32Array {
	  return this.vertices;
  }

  /**
   * Returns a flat Uint32Array of the sponge's face indices
   */
  public indicesFlat(): Uint32Array {
    return this.faces;
  }

  /**
   * Returns a flat Float32Array of the sponge's normals
   */
  public normalsFlat(): Float32Array {
	  return this.normals;
  }

  /**
   * Returns the model matrix of the sponge
   */
  public uMatrix(): Mat4 {

    // TODO: change this, if it's useful
    const ret : Mat4 = new Mat4().setIdentity();

    return ret;    
  }
  
}
