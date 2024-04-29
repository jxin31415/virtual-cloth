import { Mat3, Mat4, Vec3, Vec4 } from "../lib/TSM.js";

/* A potential interface that students should implement */
interface ICloth {
  setLevel(level: number): void;
  isDirty(): boolean;
  setClean(): void;
  normalsFlat(): Float32Array;
  indicesFlat(): Uint32Array;
  positionsFlat(): Float32Array;
}

/**
 * Represents a Cloth
 */
export class Cloth implements ICloth {

  private dirty : boolean = true;
  private vertices : Float32Array;
  private faces : Uint32Array;
  private normals : Float32Array;

  private static normal_map: Float32Array = new Float32Array([
    0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, // -Z direction
    0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, // Z direction
  ]);
  
  constructor(level: number) {
    this.setLevel(level);
    this.dirty = true;
  }

  /**
   * Returns true if the cloth has changed.
   */
  public isDirty(): boolean {
    return this.dirty;
  }

  public setClean(): void {
    this.dirty = false;
  }

  private buildCloth() {
    let x = 1.0;
    let y = 1.0;
    let z = 1.0;
    var v = [
    x, -y, z, 1.0, -x, -y, z, 1.0, x, y, z, 1.0, x, y, z, 1.0, -x, -y, z, 1.0, -x, y, z, 1.0, // Back face
    x, -y, z, 1.0, x, y, z, 1.0, -x, -y, z, 1.0, x, y, z, 1.0, -x, y, z, 1.0, -x, -y, z, 1.0, // Front face 
    ];
    return v;
  }
  
  public setLevel(level: number)
  {
    this.dirty = true;
    
    this.vertices = new Float32Array(this.buildCloth());

    this.faces = new Uint32Array(this.vertices.length / 4);
    for(var i : number = 0; i < this.faces.length; i++) {
      this.faces[i] = i;
    }

    this.normals = new Float32Array(this.vertices.length);
    for(var i : number = 0, j : number = 0; i < this.normals.length; i++, j++) {
      if (j >= Cloth.normal_map.length) {
        j = 0;
      }
      this.normals[i] = Cloth.normal_map[j];
    }
  }

  /* Returns a flat Float32Array of the cloth's vertex positions */
  public positionsFlat(): Float32Array {
	  return this.vertices;
  }

  /**
   * Returns a flat Uint32Array of the cloth's face indices
   */
  public indicesFlat(): Uint32Array {
    console.log(this.faces)
    return this.faces;
  }

  /**
   * Returns a flat Float32Array of the cloth's normals
   */
  public normalsFlat(): Float32Array {
	  return this.normals;
  }

  /**
   * Returns the model matrix of the cloth
   */
  public uMatrix(): Mat4 {

    // TODO: change this, if it's useful
    const ret : Mat4 = new Mat4().setIdentity();

    return ret;    
  }
  
}
