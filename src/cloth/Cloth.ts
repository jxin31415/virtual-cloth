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

    public normal: Vec3;

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
        this.floorCollision();

        this.pos.add(this.vel.copy().scale(time));
        this.vel.add(this.accel.copy().scale(time));
        
        if(this.hasSphere){
          this.sphereCollision(new Vec3([0, -2, 0]), 1);
        }
      }
    }

    public trapezoidalIntegrate(time: number){

    }

    public verletIntegrate(time: number){
      if(!this.fixed){
        this.floorCollision();
        let temp = this.pos.copy()
        this.pos = this.accel.copy().scale(time*time).add(this.pos.copy().scale(2)).subtract(this.prevpos);
        this.prevpos = temp;
        this.vel = this.pos.copy().subtract(this.prevpos).scale(1/time);

        if(this.hasSphere){
          this.sphereCollision(new Vec3([0, -2, 0]), 1);
        }
      }
    }

    public floorCollision(){
      if(this.pos.y <= -1.98){
        if(this.accel.y < 0){
          this.accel.y = 0.0;
          this.prevpos = this.pos;
        }
        // this.pos.y = -1.99;
      }
    }

    public sphereCollision(sphere: Vec3, radius: number){
      let vect = this.pos.copy().subtract(sphere);
      let distance = vect.length();
      if(distance < radius){
        let project = vect.normalize().scale(radius);
        this.pos = project.add(sphere);
      }
    }

    public pointCollision(point: ClothPoint, radius: number){
      let sphere = point.pos;
      let vect = this.pos.copy().subtract(sphere);
      let distance = vect.length();
      if(distance < radius){
        let project = vect.normalize().scale(1/2*(radius-distance));
        this.pos.add(project);
        point.pos.subtract(project);

        this.prevpos = this.pos;
        point.prevpos = point.pos;
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
  private HAS_SELF_COLLISIONS = false;
  private SMOOTH_NORMALS = true;
  private currScene;

  private density : number;
  private springSet: Set<number>;

  constructor(density: number) {
    let pt_dist = Cloth.width / density;
    this.density = density;

    this.tensile = 1500/this.density;
    this.structK = this.tensile;
    this.sheerK = this.tensile/Math.sqrt(2);
    this.flexK = this.tensile/2;
    
    this.drag = 5.0/density;
    this.springSet = new Set<number>();
    this.currScene = 1;

    // Initialize grid of points
    this.points = [];
    this.springs = [];

    let hashnum = (density+2)*(density+2);

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
        this.springs.push(new Vec4([num1, num2, 1, pt_dist]));
        this.springSet.add(num1*hashnum+num2);
      }
    }

    for (let i = 0; i <= density-1; i++) {
      for(let j = 0; j <= density; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+1)*(density+1) + j;
        this.springs.push(new Vec4([num1, num2, 1, pt_dist]));
        this.springSet.add(num1*hashnum+num2);
      }
    }
    //shear springs
    for (let i = 0; i <= density-1; i++) {
      for(let j = 0; j <= density-1; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+1)*(density+1) + j+1;
        this.springs.push(new Vec4([num1, num2, 2, pt_dist*Math.sqrt(2)]));
        this.springSet.add(num1*hashnum+num2);
      }
    }

    for (let i = 1; i <= density; i++) {
      for(let j = 0; j <= density-1; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i-1)*(density+1) + j+1;
        this.springs.push(new Vec4([num1, num2, 2, pt_dist*Math.sqrt(2)]));
        this.springSet.add(num1*hashnum+num2);
      }
    }

    //flexion springs
    for (let i = 0; i <= density; i++) {
      for(let j = 0; j <= density-2; j++) {
        let num1 = i*(density+1) + j;
        let num2 = i*(density+1) + j+2;
        this.springs.push(new Vec4([num1, num2, 3, 2*pt_dist]));
        this.springSet.add(num1*hashnum+num2);
      }
    }

    for (let i = 0; i <= density-2; i++) {
      for(let j = 0; j <= density; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+2)*(density+1) + j;
        this.springs.push(new Vec4([num1, num2, 3, 2*pt_dist]));
        this.springSet.add(num1*hashnum+num2);
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
      let kkey = this.springs[i].z;
      let k = kkey == 0 ? 0 :
              kkey == 1 ? this.structK :
              kkey == 2 ? this.sheerK :
              this.flexK;
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

    if(this.HAS_SELF_COLLISIONS){
      let numP = this.points.length;
      let hashnum = (this.density+2)*(this.density+2);
      let pt_dist = Cloth.width / this.density;
      for (let i = 0; i <numP; i++) {
        for(let j = i+1; j <numP; j++) {
          if(this.springSet.has(i*hashnum+j) || this.springSet.has(j*hashnum+i)){
            continue;
          }else{
            this.points[i].pointCollision(this.points[j], pt_dist*1.5);
          }
        }
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

  public update()
  {
    let rawVerts : Vec3[] = []
    let rawNormals : Vec3[] = []

    for (let i = 0; i < this.points.length; i++) {
        this.points[i].normal = new Vec3([0, 0, 0]);
    }

    for (let i = 1; i <= this.density; i++) {
        for (let j = 1; j <= this.density; j++) {
            let a = (i-1) * (this.density+1) + j-1;
            let b = i * (this.density+1) + j-1;
            let c = (i-1) * (this.density+1) + j;
            let d = i * (this.density+1) + j;
            
            let norm = this.findNormal(this.points[a].pos, this.points[b].pos, this.points[c].pos);
            this.points[a].normal.add(norm);
            this.points[b].normal.add(norm);
            this.points[c].normal.add(norm);

            norm = this.findNormal(this.points[c].pos, this.points[b].pos, this.points[d].pos);
            this.points[c].normal.add(norm);
            this.points[b].normal.add(norm);
            this.points[d].normal.add(norm);
        }
    }

    for (let i = 0; i < this.points.length; i++) {
        this.points[i].normal.normalize();
    }

    for (let i = 1; i <= this.density; i++) {
        for (let j = 1; j <= this.density; j++) {
            let a = (i-1) * (this.density+1) + j-1;
            let b = i * (this.density+1) + j-1;
            let c = (i-1) * (this.density+1) + j;
            let d = i * (this.density+1) + j;
            
            if (this.SMOOTH_NORMALS) {
                // Triangle #1
                // Front face
                rawVerts.push(this.points[a].pos);
                rawVerts.push(this.points[b].pos);
                rawVerts.push(this.points[c].pos);
                rawNormals.push(this.points[a].normal);
                rawNormals.push(this.points[b].normal);
                rawNormals.push(this.points[c].normal);
    
                // Back face
                rawVerts.push(this.points[a].pos);
                rawVerts.push(this.points[c].pos);
                rawVerts.push(this.points[b].pos);
                rawNormals.push(this.points[a].normal.scale(-1));
                rawNormals.push(this.points[c].normal.scale(-1));
                rawNormals.push(this.points[b].normal.scale(-1));
    
                
                // Triangle #2
                // Front face
                rawVerts.push(this.points[c].pos);
                rawVerts.push(this.points[b].pos);
                rawVerts.push(this.points[d].pos);
                rawNormals.push(this.points[c].normal);
                rawNormals.push(this.points[b].normal);
                rawNormals.push(this.points[d].normal);
    
                // Back face
                rawVerts.push(this.points[c].pos);
                rawVerts.push(this.points[d].pos);
                rawVerts.push(this.points[b].pos);
                rawNormals.push(this.points[c].normal.scale(-1));
                rawNormals.push(this.points[d].normal.scale(-1));
                rawNormals.push(this.points[b].normal.scale(-1));
            } else {
                // Front face
                let ap = this.points[a].pos;
                let bp = this.points[b].pos;
                let cp = this.points[c].pos;
                let dp = this.points[d].pos;

                rawVerts.push(ap);
                rawVerts.push(bp);
                rawVerts.push(cp);
                let norm = this.findNormal(ap, bp, cp);
                rawNormals.push(norm); rawNormals.push(norm); rawNormals.push(norm);

                // Back face
                rawVerts.push(ap);
                rawVerts.push(cp);
                rawVerts.push(bp);
                norm = this.findNormal(ap, cp, bp);
                rawNormals.push(norm); rawNormals.push(norm); rawNormals.push(norm);
            }
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

  public toggleNormalsB(b: boolean) {
    this.SMOOTH_NORMALS = b;
  }

  public toggleNormals() {
    this.SMOOTH_NORMALS = !this.SMOOTH_NORMALS;
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

  public setCollisions(b: boolean){
    this.HAS_SELF_COLLISIONS = b;
    this.setScene(this.currScene);
  }

  public setScene(level: number){
    let pt_dist = Cloth.width / this.density;
    let density = this.density;
    this.currScene = level;

    for (let i = 0; i <= this.density; i++) {
      for(let j = 0; j <= this.density; j++) {
        let num1 = i*(this.density+1)+j;

        if(level < 5){
          this.points[num1].pos = new Vec3([i * pt_dist, j * pt_dist, j * pt_dist * 0.5]);
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

    this.springSet = new Set<number>();
    this.springs = [];
    let hashnum = (density+2)*(density+2);

    //structural springs
    for (let i = 0; i <= density; i++) {
      for(let j = 0; j <= density-1; j++) {
        let num1 = i*(density+1) + j;
        let num2 = i*(density+1) + j+1;
        this.springs.push(new Vec4([num1, num2, 1, pt_dist]));
        this.springSet.add(num1*hashnum+num2);
      }
    }

    for (let i = 0; i <= density-1; i++) {
      for(let j = 0; j <= density; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+1)*(density+1) + j;
        this.springs.push(new Vec4([num1, num2, 1, pt_dist]));
        this.springSet.add(num1*hashnum+num2);
      }
    }
    //shear springs
    for (let i = 0; i <= density-1; i++) {
      for(let j = 0; j <= density-1; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+1)*(density+1) + j+1;
        this.springs.push(new Vec4([num1, num2, 2, pt_dist*Math.sqrt(2)]));
        this.springSet.add(num1*hashnum+num2);
      }
    }

    for (let i = 1; i <= density; i++) {
      for(let j = 0; j <= density-1; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i-1)*(density+1) + j+1;
        this.springs.push(new Vec4([num1, num2, 2, pt_dist*Math.sqrt(2)]));
        this.springSet.add(num1*hashnum+num2);
      }
    }

    //flexion springs
    for (let i = 0; i <= density; i++) {
      for(let j = 0; j <= density-2; j++) {
        let num1 = i*(density+1) + j;
        let num2 = i*(density+1) + j+2;
        this.springs.push(new Vec4([num1, num2, 3, 2*pt_dist]));
        this.springSet.add(num1*hashnum+num2);
      }
    }

    for (let i = 0; i <= density-2; i++) {
      for(let j = 0; j <= density; j++) {
        let num1 = i*(density+1) + j;
        let num2 = (i+2)*(density+1) + j;
        this.springs.push(new Vec4([num1, num2, 3, 2*pt_dist]));
        this.springSet.add(num1*hashnum+num2);
      }
    }
  }
}
