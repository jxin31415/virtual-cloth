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
    public fixed: boolean; // top two corner points are fixed maybe

    public hasSphere: boolean;

    constructor(p: Vec3, v: Vec3, f: boolean) {
        this.pos = p;
        this.prevpos = p;
        this.vel = v;
        this.accel = new Vec3([0, 0, 0]);
        this.fixed = f;
        this.hasSphere = false;
    }

    public resetA(){
      this.accel.x = 0;
      this.accel.y = 0;
      this.accel.z = 0;
    }

    public eulerIntegrate(time: number){
      if(!this.fixed){
        this.pos.add(this.vel.copy().scale(time));
        this.vel.add(this.accel.copy().scale(time));
      }
    }

    public trapezoidalIntegrate(time: number){

    }

    public verletIntegrate(time: number){
      if(!this.fixed){
        let temp = this.pos.copy()
        this.pos = this.accel.copy().scale(time*time).add(this.pos.copy().scale(2)).subtract(this.prevpos);
        this.prevpos = temp;
        this.vel = this.pos.copy().subtract(this.prevpos).scale(1/time);
        this.floorCollision();

        if(this.hasSphere){
          this.sphereCollision(new Vec3([0, -2, 0]), 1);
        }
      }
    }

    public floorCollision(){
      if(this.pos.y <= -1.99){
        this.pos.y = -1.99;
      }
    }

    public sphereCollision(sphere: Vec3, radius: number){
      let vect = this.pos.copy().subtract(sphere);
      let distance = vect.length();
      if(distance < radius*radius){
        let project = vect.normalize().scale(radius);
        this.pos = project.add(sphere);
      }
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
  private tensile;
  private structK;
  private sheerK;
  private flexK;
  private static springDamp = 0.5;

  private drag;
  private static gravity = -9.8 / 1000.0;
  private wind = 0.0;
  private deltaT = 0.1;

  private HAS_WIND = true;

  private density : number;

  constructor(density: number) {
    let pt_dist = Cloth.width / density;
    this.density = density;

    this.tensile = 1500/this.density;
    this.structK = this.tensile;
    this.sheerK = this.tensile/Math.sqrt(2);
    this.flexK = this.tensile/2;
    
    this.drag = 5.0/density;

    // Initialize grid of points
    this.points = [];
    this.springs = [];
    for (let i = 0; i <= density; i++) {
      for(let j = 0; j <= density; j++) {
          this.points.push(new ClothPoint(
            new Vec3([i * pt_dist, j * pt_dist, j * pt_dist * 0.5]), // use this for actual setup

            // this is here for debugging + it looks cool
            // new Vec3([i * pt_dist + Math.random() * 0.05, j * pt_dist + Math.random() * 0.05, j * pt_dist * 0.5 + Math.random() * 0.1]),
            new Vec3([0, 0, 0]),
            ((i==0||i==density)&&j==density)
          ));
      }
    }

    //structural springs
    for (let i = 0; i <= density; i++) {
      for(let j = 0; j <= density-1; j++) {
        let num1 = i*(density+1) + j;
        let num2 = i*(density+1) + j+1;
        this.springs.push(new Vec4([num1, num2, this.structK, pt_dist]));
      }
    }

    for (let i = 0; i <= density-1; i++) {
      for(let j = 0; j <= density; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+1)*(density+1) + j;
        this.springs.push(new Vec4([num1, num2, this.structK, pt_dist]));
      }
    }
    //shear springs
    for (let i = 0; i <= density-1; i++) {
      for(let j = 0; j <= density-1; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+1)*(density+1) + j+1;
        this.springs.push(new Vec4([num1, num2, this.sheerK, pt_dist*Math.sqrt(2)]));
      }
    }

    for (let i = 1; i <= density; i++) {
      for(let j = 0; j <= density-1; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i-1)*(density+1) + j+1;
        this.springs.push(new Vec4([num1, num2, this.sheerK, pt_dist*Math.sqrt(2)]));
      }
    }

    //flexion springs
    for (let i = 0; i <= density; i++) {
      for(let j = 0; j <= density-2; j++) {
        let num1 = i*(density+1) + j;
        let num2 = i*(density+1) + j+2;
        this.springs.push(new Vec4([num1, num2, this.flexK, 2*pt_dist]));
      }
    }

    for (let i = 0; i <= density-2; i++) {
      for(let j = 0; j <= density; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+2)*(density+1) + j;
        this.springs.push(new Vec4([num1, num2, this.flexK, 2*pt_dist]));
      }
    }
  }

  public calcForces(){
    if(this.deltaT == 0){
      return;
    }
    // reset, gravity, drag, wind accelerations
    let grav = new Vec3([0,Cloth.gravity, 0]); // TODO: CHANGE MAGNITUDE
    for (let i = 0; i <= this.density; i++) {
      for(let j = 0; j <= this.density; j++) {
        let num1 = i*(this.density+1)+j;
        let p1 = this.points[num1];
        p1.resetA();

        p1.accel.add(grav);
        p1.accel.add(p1.vel.copy().scale(-1*this.drag));

        if(this.HAS_WIND){
          // p1.accel.add(new Vec3([0.0, 0.0, Math.random()*Cloth.wind]));
          p1.accel.add(new Vec3([Math.sin(p1.pos.x*p1.pos.y*this.deltaT), Math.cos(p1.pos.z*this.deltaT), Math.sin(Math.cos(5*p1.pos.x*p1.pos.y*p1.pos.z))]).scale(this.wind));
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
      let diff = pos1.copy().subtract(pos2);
      let dir = diff.copy().normalize();  
      let dist = Vec3.distance(pos1, pos2);
      
      // let dampingForce = diff.scale(-Cloth.springDamp);
      // let acceleration = dir.scale(-1.0*k*(dist-x)).add(dampingForce);

      let acceleration = dir.scale(-1.0*k*(dist-x));



      p1.accel.add(acceleration);
      p2.accel.add(acceleration.scale(-1));
    }

  }

  public integrateForces(){
    if(this.deltaT == 0){
      return;
    }
    for (let i = 0; i <= this.density; i++) {
      for(let j = 0; j <= this.density; j++) {
        let num1 = i*(this.density+1)+j;
        let p1 = this.points[num1];

        p1.verletIntegrate(this.deltaT);
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
  
  public toggleWind() {
    this.HAS_WIND = !this.HAS_WIND;
  }

  public setTensile(t: number){
    this.tensile = t;

    this.structK = this.tensile;
    this.sheerK = this.tensile/Math.sqrt(2);
    this.flexK = this.tensile/2;

    console.log(t,this.tensile);
  }

  public setWind(w: number){
    this.wind = w;
    // console.log(w,this.wind);
  }

  public setDeltaT(t: number){
    this.deltaT = t;
    // console.log(t,this.deltaT);
  }

  public setDrag(d: number){
    this.drag = d;
  }

  public setScene(level: number){
    let pt_dist = Cloth.width / this.density;
    for (let i = 0; i <= this.density; i++) {
      for(let j = 0; j <= this.density; j++) {
        let num1 = i*(this.density+1)+j;

        if(level < 5){
          this.points[num1].pos = new Vec3([i * pt_dist, j * pt_dist, i * pt_dist * 0.5]);
          this.points[num1].hasSphere = false;
        }else{
          this.points[num1].pos = new Vec3([i * pt_dist - 0.5, 1, j * pt_dist - 0.5]);
          this.points[num1].hasSphere = true;
        }
        // this is here for debugging + it looks cool
        // new Vec3([i * pt_dist + Math.random() * 0.05, j * pt_dist + Math.random() * 0.05, i * pt_dist * 0.5 + Math.random() * 0.1]),

        this.points[num1].prevpos = this.points[num1].pos;
        this.points[num1].vel = new Vec3([0, 0, 0]);
        this.points[num1].accel = new Vec3([0, 0, 0]);

        this.points[num1].fixed = level==1 ? ((i==0||i==this.density)&&j==this.density) : //top 2 points
          level==2 ? ((i==0||i==this.density)&&(j==0||j==this.density)) : //all 4 points
          level==3 ? (i==0&&j==this.density) : // 1 point
          level==6 ? (i==this.density/2&&j==this.density/2):
          false;
      }
    }
  }
}
