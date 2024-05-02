import { Mat3, Mat4, Vec3, Vec4 } from "../lib/TSM.js";
import { flattenListOfVec } from "./Utils.js";
import { sphere } from "../lib/geogl/shape-gen.js"

/**
 * Represents a Sphere
 */

export class Sphere {

    private vertices : Float32Array;
    private faces : Uint32Array;
    private normals : Float32Array;

  constructor() {
  }

  public update()
  {

    let circ = sphere(50);

    for (var i = 0; i < circ.positions.length; i++) {
        circ.positions[i][1] -= 2;
    }

    let positions: number[] = []
    let normals: number[] = []
    let faces: number[] = []

    for(var i = 0; i < circ.triangles.length; i++) {
        let ind: number = circ.triangles[i];
        faces.push(i);
        positions.push(circ.positions[ind][0]); positions.push(circ.positions[ind][1]); positions.push(circ.positions[ind][2]); positions.push(1.0);
        normals.push(circ.normals[ind][0]); normals.push(circ.normals[ind][1]); normals.push(circ.normals[ind][2]); normals.push(0.0);
    }

    this.vertices = new Float32Array(positions);
    this.faces = new Uint32Array(faces);
    this.normals = new Float32Array(normals);
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
