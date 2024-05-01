import {
  CanvasAnimation,
  WebGLUtilities
} from "../lib/webglutils/CanvasAnimation.js";
import { GUI } from "./Gui.js";
import { Cloth } from "./Cloth.js";
// import { clothTests } from "./tests/ClothTests.js";
import {
  defaultFSText,
  defaultVSText,
  floorFSText,
  floorVSText
} from "./Shaders.js";
import { Mat4, Vec4 } from "../lib/TSM.js";
import { Floor } from "../lib/webglutils/Floor.js";

export interface ClothAnimationTest {
  reset(): void;
  setDensity(level: number): void;
  getGUI(): GUI;
  draw(): void;
}

export class ClothAnimation extends CanvasAnimation {
  private gui: GUI;
  private millis: number;
  
  private cloth: Cloth;

  /* Cloth Rendering Info */
  private clothVAO: WebGLVertexArrayObjectOES = -1;
  private clothProgram: WebGLProgram = -1;

  /* Cloth Buffers */
  private clothPosBuffer: WebGLBuffer = -1;
  private clothIndexBuffer: WebGLBuffer = -1;
  private clothNormBuffer: WebGLBuffer = -1;

  /* Cloth Attribute Locations */
  private clothPosAttribLoc: GLint = -1;
  private clothNormAttribLoc: GLint = -1;

  /* Cloth Uniform Locations */
  private clothWorldUniformLocation: WebGLUniformLocation = -1;
  private clothViewUniformLocation: WebGLUniformLocation = -1;
  private clothProjUniformLocation: WebGLUniformLocation = -1;
  private clothLightUniformLocation: WebGLUniformLocation = -1;

  /* Global Rendering Info */
  private lightPosition: Vec4 = new Vec4();
  private backgroundColor: Vec4 = new Vec4();

  // TODO: data structures for the floor

  private floor: Floor = new Floor();

  /* Floor Rendering Info */
  private floorVAO: WebGLVertexArrayObjectOES = -1;
  private floorProgram: WebGLProgram = -1;

  /* Floor Buffers */
  private floorPosBuffer: WebGLBuffer = -1;
  private floorIndexBuffer: WebGLBuffer = -1;
  private floorNormBuffer: WebGLBuffer = -1;

  /* Floor Attribute Locations */
  private floorPosAttribLoc: GLint = -1;
  private floorNormAttribLoc: GLint = -1;

  /* floor Uniform Locations */
  private floorWorldUniformLocation: WebGLUniformLocation = -1;
  private floorViewUniformLocation: WebGLUniformLocation = -1;
  private floorProjUniformLocation: WebGLUniformLocation = -1;
  private floorLightUniformLocation: WebGLUniformLocation = -1;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.gui = new GUI(canvas, this, this.cloth);

    /* Setup Animation */
    this.reset();
  }

  /**
   * Setup the animation. This can be called again to reset the animation.
   */
  public reset(): void {

    /* debugger; */
    this.lightPosition = new Vec4([-10.0, 10.0, -10.0, 1.0]);
    this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);

    this.initCloth();
    this.initFloor();

    this.gui.reset();
    this.millis = new Date().getTime();
  }

  /**
   * Initialize the Cloth cloth data structure
   */
  public initCloth(): void {
    this.cloth = new Cloth(10);
    this.gui.setCloth(this.cloth);

    /* Alias context for syntactic convenience */
    const gl: WebGLRenderingContext = this.ctx;

    
    /* Compile Shaders */
    this.clothProgram = WebGLUtilities.createProgram(
      gl,
      defaultVSText,
      defaultFSText
    );
    gl.useProgram(this.clothProgram);

    /* Create VAO for Cloth */
    this.clothVAO = this.extVAO.createVertexArrayOES() as WebGLVertexArrayObjectOES;
    this.extVAO.bindVertexArrayOES(this.clothVAO);

    /* Create and setup positions buffer*/
    // Returns a number that indicates where 'vertPosition' is in the shader program
    this.clothPosAttribLoc = gl.getAttribLocation(
      this.clothProgram,
      "vertPosition"
    );
    /* Ask WebGL to create a buffer */
    this.clothPosBuffer = gl.createBuffer() as WebGLBuffer;
    /* Tell WebGL that you are operating on this buffer */
    gl.bindBuffer(gl.ARRAY_BUFFER, this.clothPosBuffer);
    /* Fill the buffer with data */
    gl.bufferData(gl.ARRAY_BUFFER, this.cloth.positionsFlat(), gl.STATIC_DRAW);
    /* Tell WebGL how to read the buffer and where the data goes */
    gl.vertexAttribPointer(
      this.clothPosAttribLoc /* Essentially, the destination */,
      4 /* Number of bytes per primitive */,
      gl.FLOAT /* The type of data */,
      false /* Normalize data. Should be false. */,
      4 *
        Float32Array.BYTES_PER_ELEMENT /* Number of bytes to the next element */,
      0 /* Initial offset into buffer */
    );
    /* Tell WebGL to enable to attribute */
    gl.enableVertexAttribArray(this.clothPosAttribLoc);

    /* Create and setup normals buffer*/
    this.clothNormAttribLoc = gl.getAttribLocation(
      this.clothProgram,
      "aNorm"
    );
    this.clothNormBuffer = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.clothNormBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.cloth.normalsFlat(), gl.STATIC_DRAW);
    gl.vertexAttribPointer(
      this.clothNormAttribLoc,
      4,
      gl.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    gl.enableVertexAttribArray(this.clothNormAttribLoc);

    /* Create and setup index buffer*/
    this.clothIndexBuffer = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.clothIndexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      this.cloth.indicesFlat(),
      gl.STATIC_DRAW
    );

    /* End VAO recording */
    this.extVAO.bindVertexArrayOES(this.clothVAO);

    /* Get uniform locations */
    this.clothWorldUniformLocation = gl.getUniformLocation(
      this.clothProgram,
      "mWorld"
    ) as WebGLUniformLocation;
    this.clothViewUniformLocation = gl.getUniformLocation(
      this.clothProgram,
      "mView"
    ) as WebGLUniformLocation;
    this.clothProjUniformLocation = gl.getUniformLocation(
      this.clothProgram,
      "mProj"
    ) as WebGLUniformLocation;
    this.clothLightUniformLocation = gl.getUniformLocation(
      this.clothProgram,
      "lightPosition"
    ) as WebGLUniformLocation;

    /* Bind uniforms */
    gl.uniformMatrix4fv(
      this.clothWorldUniformLocation,
      false,
      new Float32Array(this.cloth.uMatrix().all())
    );
    gl.uniformMatrix4fv(
      this.clothViewUniformLocation,
      false,
      new Float32Array(Mat4.identity.all())
    );
    gl.uniformMatrix4fv(
      this.clothProjUniformLocation,
      false,
      new Float32Array(Mat4.identity.all())
    );
    gl.uniform4fv(this.clothLightUniformLocation, this.lightPosition.xyzw);
  }

  /**
   * Sets up the floor and floor drawing
   */
  public initFloor(): void {
      
    // TODO: your code to set up the floor rendering
    const gl: WebGLRenderingContext = this.ctx;

    /* Compile Shaders */
    this.floorProgram = WebGLUtilities.createProgram(
      gl,
      floorVSText,
      floorFSText
    );
    gl.useProgram(this.floorProgram);

    /* Create VAO for Floor */
    this.floorVAO = this.extVAO.createVertexArrayOES() as WebGLVertexArrayObjectOES;
    this.extVAO.bindVertexArrayOES(this.floorVAO);

    this.floorPosAttribLoc = gl.getAttribLocation(
      this.floorProgram,
      "vertPosition"
    );
    this.floorPosBuffer = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.floorPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.floor.positionsFlat(), gl.STATIC_DRAW);
    gl.vertexAttribPointer(
      this.floorPosAttribLoc /* Essentially, the destination */,
      4 /* Number of bytes per primitive */,
      gl.FLOAT /* The type of data */,
      false /* Normalize data. Should be false. */,
      4 *
        Float32Array.BYTES_PER_ELEMENT /* Number of bytes to the next element */,
      0 /* Initial offset into buffer */
    );
    gl.enableVertexAttribArray(this.floorPosAttribLoc);

    /* Create and setup normals buffer*/
    this.floorNormAttribLoc = gl.getAttribLocation(
      this.floorProgram,
      "aNorm"
    );
    this.floorNormBuffer = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.floorNormBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.floor.normalsFlat(), gl.STATIC_DRAW);
    gl.vertexAttribPointer(
      this.floorNormAttribLoc,
      4,
      gl.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    gl.enableVertexAttribArray(this.floorNormAttribLoc);

    this.floorIndexBuffer = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.floorIndexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      this.floor.indicesFlat(),
      gl.STATIC_DRAW
    );

    /* End VAO recording */
    this.extVAO.bindVertexArrayOES(this.floorVAO);

    /* Get uniform locations */
    this.floorWorldUniformLocation = gl.getUniformLocation(
      this.floorProgram,
      "mWorld"
    ) as WebGLUniformLocation;
    this.floorViewUniformLocation = gl.getUniformLocation(
      this.floorProgram,
      "mView"
    ) as WebGLUniformLocation;
    this.floorProjUniformLocation = gl.getUniformLocation(
      this.floorProgram,
      "mProj"
    ) as WebGLUniformLocation;
    this.floorLightUniformLocation = gl.getUniformLocation(
      this.floorProgram,
      "lightPosition"
    ) as WebGLUniformLocation;

    /* Bind uniforms */
    gl.uniformMatrix4fv(
      this.floorWorldUniformLocation,
      false,
      new Float32Array(this.floor.uMatrix().all())
    );
    gl.uniformMatrix4fv(
      this.floorViewUniformLocation,
      false,
      new Float32Array(Mat4.identity.all())
    );
    gl.uniformMatrix4fv(
      this.floorProjUniformLocation,
      false,
      new Float32Array(Mat4.identity.all())
    );
    gl.uniform4fv(this.floorLightUniformLocation, this.lightPosition.xyzw);
  }

  /**
   * Draws a single frame
   */
  public draw(): void {
    let curr = new Date().getTime();
    let deltaT = (curr - this.millis) / 1000.0;
    this.millis = curr;

    // Do physics logic here
    this.cloth.calcForces();
    this.cloth.integrateForces(deltaT);

    // Update rendering logic
    this.cloth.update();

    const gl: WebGLRenderingContext = this.ctx;

    /* Clear canvas */
    const bg: Vec4 = this.backgroundColor;
    gl.clearColor(bg.r, bg.g, bg.b, bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    /* Cloth - Update/Draw */
    const modelMatrix = this.cloth.uMatrix();
    gl.useProgram(this.clothProgram);

    this.extVAO.bindVertexArrayOES(this.clothVAO);

    /* Update cloth buffers */
    gl.bindBuffer(gl.ARRAY_BUFFER, this.clothPosBuffer);
    gl.bufferData(
    gl.ARRAY_BUFFER,
    this.cloth.positionsFlat(),
    gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(
    this.clothPosAttribLoc,
    4,
    gl.FLOAT,
    false,
    4 * Float32Array.BYTES_PER_ELEMENT,
    0
    );
    gl.enableVertexAttribArray(this.clothPosAttribLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.clothNormBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.cloth.normalsFlat(), gl.STATIC_DRAW);
    gl.vertexAttribPointer(
    this.clothNormAttribLoc,
    4,
    gl.FLOAT,
    false,
    4 * Float32Array.BYTES_PER_ELEMENT,
    0
    );
    gl.enableVertexAttribArray(this.clothNormAttribLoc);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.clothIndexBuffer);
    gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    this.cloth.indicesFlat(),
    gl.STATIC_DRAW
    );

    /* Update cloth uniforms */
    gl.uniformMatrix4fv(
      this.clothWorldUniformLocation,
      false,
      new Float32Array(modelMatrix.all())
    );
    gl.uniformMatrix4fv(
      this.clothViewUniformLocation,
      false,
      new Float32Array(this.gui.viewMatrix().all())
    );
    gl.uniformMatrix4fv(
      this.clothProjUniformLocation,
      false,
      new Float32Array(this.gui.projMatrix().all())
    );
	
	// console.log("Drawing ", this.cloth.indicesFlat().length, " triangles");


    /* Draw cloth */
    gl.drawElements(
      gl.TRIANGLES,
      this.cloth.indicesFlat().length,
      gl.UNSIGNED_INT,
      0
    );

    // TODO: draw the floor
    
    /* Floor - Update/Draw */
    const floorMatrix = this.floor.uMatrix();
    gl.useProgram(this.floorProgram);

    this.extVAO.bindVertexArrayOES(this.floorVAO);

    /* Update floor buffers */
    this.floor.setDirty();
    if (this.floor.isDirty()) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.floorPosBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        this.floor.positionsFlat(),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(
        this.floorPosAttribLoc,
        4,
        gl.FLOAT,
        false,
        4 * Float32Array.BYTES_PER_ELEMENT,
        0
      );
      gl.enableVertexAttribArray(this.floorPosAttribLoc);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.floorNormBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.floor.normalsFlat(), gl.STATIC_DRAW);
      gl.vertexAttribPointer(
        this.floorNormAttribLoc,
        4,
        gl.FLOAT,
        false,
        4 * Float32Array.BYTES_PER_ELEMENT,
        0
      );
      gl.enableVertexAttribArray(this.floorNormAttribLoc);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.floorIndexBuffer);
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        this.floor.indicesFlat(),
        gl.STATIC_DRAW
      );

      this.floor.setClean();
    }

    /* Update floor uniforms */
    gl.uniformMatrix4fv(
      this.floorWorldUniformLocation,
      false,
      new Float32Array(floorMatrix.all())
    );
    gl.uniformMatrix4fv(
      this.floorViewUniformLocation,
      false,
      new Float32Array(this.gui.viewMatrix().all())
    );
    gl.uniformMatrix4fv(
      this.floorProjUniformLocation,
      false,
      new Float32Array(this.gui.projMatrix().all())
    );
    // console.log("Drawing ", this.floor.indicesFlat().length, " triangles");


    /* Draw floor */
    gl.drawElements(
      gl.TRIANGLES,
      this.floor.indicesFlat().length,
      gl.UNSIGNED_INT,
      0
    );

  }

  public getGUI(): GUI {
    return this.gui;
  }
}

export function initializeCanvas(): void {
  const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  /* Start drawing */
  const canvasAnimation: ClothAnimation = new ClothAnimation(canvas);
//   clothTests.registerDeps(canvasAnimation);
//   clothTests.registerDeps(canvasAnimation);
  canvasAnimation.start();
}
