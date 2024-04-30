import { Mat3, Mat4, Vec3, Vec4 } from "../lib/TSM.js";
import { flattenListOfVec } from "./Utils.js";

/*
 * Represents a point within a cloth
 */ 
export class ClothPoint {
    public prevpos: Vec3;
    public pos: Vec3;
    public vel: Vec3;
    public accel: Vec3;

    constructor(p: Vec3, v: Vec3) {
        this.pos = p;
        this.prevpos = p;
        this.vel = v;
        this.accel = new Vec3([0, 0, 0]);
    }

    public resetA(){
      this.accel.x = 0;
      this.accel.y = 0;
      this.accel.z = 0;
    }

    public eulerIntegrate(time: number){
      this.pos.add(this.vel.copy().scale(time));
      this.vel.add(this.accel.copy().scale(time));
    }

    public trapezoidalIntegrate(time: number){

    }

    public verletIntegrate(time: number){
      let temp = this.pos.copy()
      this.pos = this.accel.copy().scale(time*time).add(this.pos.copy().scale(2)).subtract(this.prevpos);
      this.prevpos = temp;
    }
}

/**
 * Represents a Cloth
 */

// **************************************
// TODO: FIX CERTAIN POINTS TO CERTAIN POSITIONS
// **************************************

export class Cloth {
  private points: ClothPoint[]; //changed this to be 1-d
  private springs: Vec4[];

  private static width = 1.0;
  private static tensile = 200.0;
  private static structK = Cloth.tensile;
  private static sheerK = Cloth.tensile*Math.sqrt(2);
  private static flexK = Cloth.tensile*2;

  private static drag = 1.3;
  private static gravity = -9.8;
  private static HAS_WIND = false;
  private static wind = 1.0;
  private static deltaT = 0.1;


  private density : number;

  constructor(density: number) {
    let pt_dist = Cloth.width / density;
    this.density = density;
    // Initialize grid of points
    this.points = [];
    this.springs = [];
    for (let i = 0; i <= density; i++) {
      for(let j = 0; j <= density; j++) {
          this.points.push(new ClothPoint(
            //   new Vec3([i * pt_dist, j * pt_dist, 0.0]), // use this for actual setup

            // this is here for debugging + it looks cool
              new Vec3([i * pt_dist + Math.random() * 0.05, j * pt_dist + Math.random() * 0.05, 0.0 + Math.random() * 0.1]),
              new Vec3([0, 0, 0])
          ));
      }
    }

    //structural springs
    for (let i = 0; i <= density; i++) {
      for(let j = 0; j <= density-1; j++) {
        let num1 = i*(density+1) + j;
        let num2 = i*(density+1) + j+1;
        this.springs.push(new Vec4([num1, num2, Cloth.structK, pt_dist]));
        // this.springs[num1][num2] = Cloth.structK;
        // this.springs[num2][num1] = Cloth.structK;
      }
    }

    for (let i = 0; i <= density-1; i++) {
      for(let j = 0; j <= density; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+1)*(density+1) + j;
        this.springs.push(new Vec4([num1, num2, Cloth.structK, pt_dist]));
        // this.springs[num1][num2] = Cloth.structK;
        // this.springs[num2][num1] = Cloth.structK;
      }
    }
    //shear springs
    for (let i = 0; i <= density-1; i++) {
      for(let j = 0; j <= density-1; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+1)*(density+1) + j+1;
        this.springs.push(new Vec4([num1, num2, Cloth.sheerK, pt_dist*Math.sqrt(2)]));
        // this.springs[num1][num2] = Cloth.sheerK;
        // this.springs[num2][num1] = Cloth.sheerK;
      }
    }

    for (let i = 1; i <= density; i++) {
      for(let j = 0; j <= density-1; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i-1)*(density+1) + j+1;
        this.springs.push(new Vec4([num1, num2, Cloth.sheerK, pt_dist*Math.sqrt(2)]));
        // this.springs[num1][num2] = Cloth.sheerK;
        // this.springs[num2][num1] = Cloth.sheerK;
      }
    }

    //flexion springs
    for (let i = 0; i <= density; i++) {
      for(let j = 0; j <= density-2; j++) {
        let num1 = i*(density+1) + j;
        let num2 = i*(density+1) + j+2;
        this.springs.push(new Vec4([num1, num2, Cloth.flexK, 2*pt_dist]));
        // this.springs[num1][num2] = Cloth.flexK;
        // this.springs[num2][num1] = Cloth.flexK;
      }
    }

    for (let i = 0; i <= density-2; i++) {
      for(let j = 0; j <= density; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+2)*(density+1) + j;
        this.springs.push(new Vec4([num1, num2, Cloth.flexK, 2*pt_dist]));
        // this.springs[num1][num2] = Cloth.flexK;
        // this.springs[num2][num1] = Cloth.flexK;
      }
    }
  }

  public calcForces(){
    // reset, gravity, drag, wind accelerations
    let grav = new Vec3([0,Cloth.gravity, 0]); // TODO: NOT SURE IF CORRECT, ALSO MUST CHANGE MAGNITUDE
    for (let i = 0; i <= this.density; i++) {
      for(let j = 0; j <= this.density; j++) {
        let num1 = i*(this.density+1)+j;
        let p1 = this.points[num1];
        p1.resetA();

        p1.accel.add(grav);
        p1.accel.add(p1.vel.copy().scale(-1*Cloth.drag));

        if(Cloth.HAS_WIND){
          p1.accel.add(new Vec3([0.0, 0.0, Math.random()*Cloth.wind]));
        }
      }
    }

    // spring accelerations
    for(let i = 0; i < this.springs.length; i++){
      let p1 = this.points[this.springs[i].x];
      let p2 = this.points[this.springs[i].y];
      let k = this.springs[i].z;
      let x = this.springs[i].w;
      let pos1 = p1.pos;
      let pos2 = p2.pos;
      let dir = pos1.copy().subtract(pos2).normalize();  
      let dist = Vec3.distance(pos1, pos2);
      let acceleration = dir.scale(-1.0*k*(dist-x));
      p1.accel.add(acceleration);
      p2.accel.add(acceleration.scale(-1));
    }

  }

  public integrateForces(deltaT: number){
    for (let i = 0; i <= this.density; i++) {
      for(let j = 0; j <= this.density; j++) {
        let num1 = i*(this.density+1)+j;
        let p1 = this.points[num1];

        // TODO: BETTER INTEGRATION METHODS
        p1.verletIntegrate(Cloth.deltaT);
      }
    }
  }

  // Stuff for rendering, TODO
  // Variables for rendering; should not be directly operated on by physics logic
  private vertices : Float32Array;
  private faces : Uint32Array;
  private normals : Float32Array;

  private findNormal(a: Vec3, b: Vec3, c: Vec3) : Vec3 {
    let ab = b.copy().subtract(a);
    let ac = c.copy().subtract(a);

    let n = Vec3.cross(ab, ac);
    return n.normalize();
  }

  private addTriangle(a: Vec3, b: Vec3, c: Vec3, rawVerts: Vec3[], rawNormals: Vec3[]) {
    // Front face
    rawVerts.push(a);
    rawVerts.push(b);
    rawVerts.push(c);
    let norm = this.findNormal(a, b, c);
    rawNormals.push(norm); rawNormals.push(norm); rawNormals.push(norm);

    // Back face
    rawVerts.push(a);
    rawVerts.push(c);
    rawVerts.push(b);
    norm = this.findNormal(a, c, b);
    rawNormals.push(norm); rawNormals.push(norm); rawNormals.push(norm);
  }
  
  public update()
  {
    let rawVerts : Vec3[] = []
    let rawNormals : Vec3[] = []

    for (let i = 1; i <= this.density; i++) {
        for (let j = 1; j <= this.density; j++) {
            let a = this.points[(i-1) * (this.density+1) + j-1].pos;
            let b = this.points[i * (this.density+1) + j-1].pos;
            let c = this.points[(i-1) * (this.density+1) + j].pos;
            let d = this.points[i * (this.density+1) + j].pos;
            
            // Triangle #1
            this.addTriangle(a, b, c, rawVerts, rawNormals);
            // Triangle #2
            this.addTriangle(c, b, d, rawVerts, rawNormals);
        }
    }

    this.vertices = new Float32Array(flattenListOfVec(rawVerts, true));

    this.faces = new Uint32Array(this.vertices.length / 4);
    for(var i : number = 0; i < this.faces.length; i++) {
      this.faces[i] = i;
    }

    this.normals = new Float32Array(flattenListOfVec(rawNormals, false));
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
