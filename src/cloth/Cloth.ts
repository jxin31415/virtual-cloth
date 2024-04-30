import { Mat3, Mat4, Vec3, Vec4 } from "../lib/TSM.js";

/*
 * Represents a point within a cloth
 */ 
export class ClothPoint {
    private pos: Vec3;
    private vel: Vec3;
    // anything else idk

    constructor(p: Vec3, v: Vec3) {
        this.pos = p;
        this.vel = v;
    }
}

/**
 * Represents a Cloth
 */
export class Cloth {
  private points: ClothPoint[][];

  private static width = 10.0;

  constructor(density: number) {
    let pt_dist = Cloth.width / density;

    // Initialize grid of points
    this.points = []
    for (let i = 0; i <= density; i++) {
        this.points.push([])
        for(let j = 0; j <= density; j++) {
            this.points[i].push(new ClothPoint(
                new Vec3([i * pt_dist, j * pt_dist, 0.0]),
                new Vec3([0, 0, 0])
            ));
        }
    }
  }

  // Stuff for rendering, TODO
  // Variables for rendering; should not be directly operated on by physics logic
  private vertices : Float32Array;
  private faces : Uint32Array;
  private normals : Float32Array;

  private static normal_map: Float32Array = new Float32Array([
    0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, // -Z direction
    0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, // Z direction
  ]);
  
  public update()
  {    
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

  /* Returns a flat Float32Array of the cloth's vertex positions */
  public positionsFlat(): Float32Array {
	  return this.vertices;
  }

  /**
   * Returns a flat Uint32Array of the cloth's face indices
   */
  public indicesFlat(): Uint32Array {
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
    const ret : Mat4 = new Mat4().setIdentity();
    return ret;    
  }
  
}
