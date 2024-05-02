import { Camera } from "../lib/webglutils/Camera.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { Cloth } from "./Cloth.js";
import { Mat4, Vec3 } from "../lib/TSM.js";

/**
 * Might be useful for designing any animation GUI
 */
interface IGUI {
  viewMatrix(): Mat4;
  projMatrix(): Mat4;
  dragStart(me: MouseEvent): void;
  drag(me: MouseEvent): void;
  dragEnd(me: MouseEvent): void;
  onKeydown(ke: KeyboardEvent): void;
}

/**
 * Handles Mouse and Button events along with
 * the the camera.
 */
export class GUI implements IGUI {
  private static readonly rotationSpeed: number = 0.05;
  private static readonly zoomSpeed: number = 0.1;
  private static readonly rollSpeed: number = 0.1;
  private static readonly panSpeed: number = 0.1;

  private camera: Camera;
  private dragging: boolean;
  private fps: boolean;
  private prevX: number;
  private prevY: number;

  private height: number;
  private width: number;

  private cloth: Cloth;
  private animation: CanvasAnimation;

  /**
   *
   * @param canvas required to get the width and height of the canvas
   * @param animation required as a back pointer for some of the controls
   * @param cloth required for some of the controls
   */
  constructor(
    canvas: HTMLCanvasElement,
    animation: CanvasAnimation,
    cloth: Cloth
  ) {
    this.height = canvas.height;
    this.width = canvas.width;
    this.prevX = 0;
    this.prevY = 0;

    this.cloth = cloth;
    this.animation = animation;

	  this.reset();

    this.registerEventListeners(canvas);
  }

  /**
   * Resets the state of the GUI
   */
  public reset(): void {
    this.fps = false;
    this.dragging = false;
    /* Create camera setup */
    this.camera = new Camera(
      new Vec3([3, 0, -3]),
      new Vec3([0, 0, 0]),
      new Vec3([0, 1, 0]),
      45,
      this.width / this.height,
      0.1,
      1000.0
    );
  }

  /**
   * Sets the GUI's camera to the given camera
   * @param cam a new camera
   */
  public setCamera(
    pos: Vec3,
    target: Vec3,
    upDir: Vec3,
    fov: number,
    aspect: number,
    zNear: number,
    zFar: number
  ) {
    this.camera = new Camera(pos, target, upDir, fov, aspect, zNear, zFar);
  }

  /**
   * Returns the view matrix of the camera
   */
  public viewMatrix(): Mat4 {
    return this.camera.viewMatrix();
  }

  /**
   * Returns the projection matrix of the camera
   */
  public projMatrix(): Mat4 {
    return this.camera.projMatrix();
  }

  /**
   * Callback function for the start of a drag event.
   * @param mouse
   */
  public dragStart(mouse: MouseEvent): void {
    this.dragging = true;
    this.prevX = mouse.screenX;
    this.prevY = mouse.screenY;
  }

  /**
   * The callback function for a drag event.
   * This event happens after dragStart and
   * before dragEnd.
   * @param mouse
   */
  public drag(mouse: MouseEvent): void {
    if (this.dragging) {
      var start = new Vec3([-this.prevX, this.prevY, 0]);
      start = this.viewMatrix().inverse().multiplyVec3((start));
      var end = new Vec3([-mouse.screenX, mouse.screenY, 0]);
      end = this.viewMatrix().inverse().multiplyVec3((end));

      var dir = end.subtract(start);
      var ortho = Vec3.cross(dir, this.camera.forward()).negate();
      this.camera.rotate(ortho, GUI.rotationSpeed);

      this.prevX = mouse.screenX;
      this.prevY = mouse.screenY;
    }
  }

  /**
   * Callback function for the end of a drag event
   * @param mouse
   */
  public dragEnd(mouse: MouseEvent): void {
    this.dragging = false;
    this.prevX = 0;
    this.prevY = 0;
  }

  /**
   * Callback function for a key press event
   * @param key
   */
  public onKeydown(key: KeyboardEvent): void {
    /*
       Note: key.code uses key positions, i.e a QWERTY user uses y where
             as a Dvorak user must press F for the same action.
       Note: arrow keys are only registered on a KeyDown event not a
       KeyPress event
       We can use KeyDown due to auto repeating.
     */

    switch (key.code) {
      case "Digit1": {
        this.cloth.setScene(1);
        break;
      }
      case "Digit2": {
        this.cloth.setScene(2);
        break;
      }
      case "Digit3": {
        this.cloth.setScene(3);
        break;
      }    
      case "Digit4": {
        this.cloth.setScene(4);
        break;
      }    
      case "Digit5": {
        this.cloth.setScene(5);
        break;
      }    
      case "Digit6": {
        this.cloth.setScene(6);
        break;
      }    
      case "KeyW": {
        this.camera.offset(this.camera.forward().negate(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyA": {
        this.camera.offset(this.camera.right().negate(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyS": {
        this.camera.offset(this.camera.forward(), GUI.panSpeed, true);
        break;
      }
      case "KeyD": {
        this.camera.offset(this.camera.right(), GUI.panSpeed, true);
        break;
      }
      case "KeyR": {
        this.reset();
        break;
      }
      case "KeyP": {
        this.cloth.toggleWind();
        break;
      }
      case "KeyN": {
        this.cloth.toggleNormals();
        break;
      }
      case "ArrowLeft": {
        this.camera.roll(GUI.rollSpeed, false);
        break;
      }
      case "ArrowRight": {
        this.camera.roll(GUI.rollSpeed, true);
        break;
      }
      case "ArrowUp": {
        this.camera.offset(this.camera.up(), GUI.panSpeed, true);
        break;
      }
      case "ArrowDown": {
        this.camera.offset(this.camera.up().negate(), GUI.panSpeed, true);
        break;
      }
      default: {
        console.log("Key : '", key.code, "' was pressed.");
        break;
      }
    }
  }

  /**
   * Registers all event listeners for the GUI
   * @param canvas The canvas being used
   */
  private registerEventListeners(canvas: HTMLCanvasElement): void {
    /* Event listener for key controls */
    window.addEventListener("keydown", (key: KeyboardEvent) =>
      this.onKeydown(key)
    );

    /* Event listener for mouse controls */
    canvas.addEventListener("mousedown", (mouse: MouseEvent) =>
      this.dragStart(mouse)
    );

    canvas.addEventListener("mousemove", (mouse: MouseEvent) =>
      this.drag(mouse)
    );

    canvas.addEventListener("mouseup", (mouse: MouseEvent) =>
      this.dragEnd(mouse)
    );

    /* Event listener to stop the right click menu */
    canvas.addEventListener("contextmenu", (event: any) =>
      event.preventDefault()
    );


    const tensileSlider = document.getElementById("tensileSlider") as HTMLInputElement;
    tensileSlider.addEventListener("input", () => {
      const tensile = parseFloat(tensileSlider.value);
      this.cloth.setTensile(tensile);
    });

    const windSlider = document.getElementById("windSlider") as HTMLInputElement;
    windSlider.addEventListener("input", () => {
      const wind = parseFloat(windSlider.value);
      this.cloth.setWind(wind);
    });

    const tSlider = document.getElementById("deltaTSlider") as HTMLInputElement;
    tSlider.addEventListener("input", () => {
      const t = parseFloat(tSlider.value);
      this.cloth.setDeltaT(t);
    });

    const dragSlider = document.getElementById("dragSlider") as HTMLInputElement;
    dragSlider.addEventListener("input", () => {
      const d = parseFloat(dragSlider.value);
      this.cloth.setDrag(d);
    });

    const collisionCheckbox = document.getElementById("collisions") as HTMLInputElement;
    collisionCheckbox.addEventListener("change", () => {
      if (collisionCheckbox.checked) {
        this.cloth.setCollisions(true);
      } else {
        this.cloth.setCollisions(false);
      }
    });
  }

  public setCloth(c: Cloth){
    this.cloth = c;
  }
}
