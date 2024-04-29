import { Cloth } from "../Cloth.js";
import { Mat4, Vec3, Vec4 } from "../../lib/TSM.js";
import { isEqual, isTrue, shouldFail, Tests } from "../../lib/Suite.js";
import { ClothAnimationTest } from "../App.js";

const canvas: HTMLCanvasElement = document.getElementById(
  "glCanvas"
) as HTMLCanvasElement;

/**
 * Creates synthetic events to simulate a mouse drag
 * @param can canvas elemnt
 * @param dx direction in x to drag
 * @param dy direction in y to drag
 * @param frames number of frames to drag
 * @param rightClick true if it is a right click on the mouse
 */
function dragMouse(
  target: EventTarget,
  dx: number,
  dy: number,
  frames: number,
  rightClick: boolean = false
): void {
  target.dispatchEvent(new MouseEvent("mousedown", { screenX: 0, screenY: 0 }));
  for (let i = 0; i < frames; i++) {
    target.dispatchEvent(
      new MouseEvent("mousemove", {
        buttons: rightClick ? 2 : 1,
        screenX: dx + i * dx,
        screenY: dy + i * dy
      })
    );
  }
  target.dispatchEvent(new MouseEvent("mouseup"));
}

/**
 * Creates synthetic events to simulate pressing a button
 * @param keyCode code of the key to press
 * @param times number of times to press the button
 */
function pressKey(target: EventTarget, keyCode: string, times: number) {
  for (let i = 0; i < times; i++) {
    target.dispatchEvent(new KeyboardEvent("keydown", { code: keyCode }));
  }
}

/* Create testing environment by linking with browser. */
export const clothTests: Tests<ClothAnimationTest> = new Tests(canvas, document.getElementById(
  "test-view"
) as HTMLElement);

clothTests.setup = (animation) => {
  if (animation) {
    animation.reset();
  }
};

clothTests.cleanup = clothTests.setup;




/**
 * Tests the isDirty and setClean methods.
 */
clothTests.unitTest("Cloth isDirty/setClean", () => {
  const m: Cloth = new Cloth(1);
  // Must be dirty on creation
  isTrue(() => m.isDirty());

  m.setClean();
  isTrue(() => !m.isDirty());

  m.setLevel(2);
  isTrue(() => m.isDirty());
});

/**
 * Tests that the generated geometry is approximately
 * correct.
 */
clothTests.unitTest("Cloth approximate positions/normals/indices", () => {
  const m: Cloth = new Cloth(1);

  // Level one
  isTrue(() => m.normalsFlat().length >= 8 * 3);
  isTrue(() => m.indicesFlat().length >= 12 * 3);
  isTrue(() => m.positionsFlat().length >= 8 * 3);

  // Level two
  m.setLevel(2);
  isTrue(() => m.normalsFlat().length >= 64 * 3);
  isTrue(() => m.indicesFlat().length >= 68 * 2 * 3);
  isTrue(() => m.positionsFlat().length >= 64 * 3);

  // Level three. Too much to compute. At least as big as level two.
  m.setLevel(3);
  isTrue(() => m.normalsFlat().length >= 64 * 3);
  isTrue(() => m.indicesFlat().length >= 68 * 2 * 3);
  isTrue(() => m.positionsFlat().length >= 64 * 3);

  // Level three. Too much to compute. At least as big as level two.
  m.setLevel(4);
  isTrue(() => m.normalsFlat().length >= 64 * 3);
  isTrue(() => m.indicesFlat().length >= 68 * 2 * 3);
  isTrue(() => m.positionsFlat().length >= 64 * 3);
});

/**
 * Cloth Level integration tests
 */
for (let i = 1; i < 5; i++) {
  clothTests.integrationTest(
    "Cloth Level " + i,
    "./static/img/cloth/level_" + i + "_ref.png",
    (animation) => {
      animation.reset();
      dragMouse(canvas, 1, -1, 10);
      pressKey(window, "KeyW", 30);
      pressKey(window, "KeyD", 5);
      dragMouse(canvas, -1, 1, 20);
      pressKey(window, "Digit" + i, 1);
      animation.draw();
    }
  );
}

/**
 * Tests the mouse orbital rotation
 */
/*clothTests.integrationTest(
  "Mouse Orbital Rotation",
  "./static/img/cloth/mouse_orbit_rotation_ref.png",
  (animation) => {
    animation.reset();
    pressKey(window, "Digit2", 1);
    pressKey(window, "KeyC", 1);
    dragMouse(canvas, -1, 1, 10);
    animation.draw();

  }
);*/

/**
 * Tests the mouse fps rotation
 */
clothTests.integrationTest(
  "Mouse FPS Rotation",
  "./static/img/cloth/mouse_fps_rotation_ref.png",
  (animation) => {
    animation.reset();
    pressKey(window, "Digit2", 1);
    dragMouse(canvas, -1, -1, 10);
    animation.draw();
  }
);

/**
 * Tests mouse zoom in
 */
clothTests.integrationTest(
  "Mouse Zoom In",
  "./static/img/cloth/mouse_zoom_in_ref.png",
  (animation) => {
    animation.reset();
    pressKey(window, "Digit2", 1);
    dragMouse(canvas, -1, -1, 35, true);
    animation.draw();
  }
);

/**
 * Tests mouse zoom out
 */
clothTests.integrationTest(
  "Mouse Zoom Out",
  "./static/img/cloth/mouse_zoom_out_ref.png",
  (animation) => {
    animation.reset();
    pressKey(window, "Digit2", 1);
    dragMouse(canvas, -1, 1, 35, true);
    animation.draw();
  }
);

/**
 * Tests W key Orbital Mode
 */
/*clothTests.integrationTest(
  "W Key (Orbital Mode)",
  "./static/img/cloth/w_orbital_ref.png",
  (animation) => {
    animation.reset();
    pressKey(window, "Digit2", 1);
    pressKey(window, "KeyC", 1);
    pressKey(window, "KeyW", 35);
    animation.draw();
  }
);*/

/**
 * Tests W Key in FPS Mode
 */
clothTests.integrationTest(
  "W Key (FPS Mode)",
  "./static/img/cloth/w_fps_ref.png",
  (animation) => {
    animation.reset();
    pressKey(window, "Digit2", 1);
    dragMouse(canvas, 1, 0, 5);
    pressKey(window, "KeyW", 30);
    animation.draw();
  }
);

/**
 * Tests S key Orbital Mode
 */
/*clothTests.integrationTest(
  "S Key (Orbital Mode)",
  "./static/img/cloth/s_orbital_ref.png",
  (animation) => {
    animation.reset();
    pressKey(window, "Digit2", 1);
    pressKey(window, "KeyC", 1);  
    pressKey(window, "KeyS", 35);
    animation.draw();
  }
);*/

/**
 * Tests S Key in FPS Mode
 */
clothTests.integrationTest(
  "S Key (FPS Mode)",
  "./static/img/cloth/s_fps_ref.png",
  (animation) => {
    animation.reset();
    pressKey(window, "Digit2", 1);
    dragMouse(canvas, 1, 0, 10);
    pressKey(window, "KeyS", 30);
    animation.draw();
  }
);

/**
 * Tests A key Orbital Mode
 */
/*clothTests.integrationTest(
  "A Key (Orbital Mode)",
  "./static/img/cloth/a_orbital_ref.png",
  (animation) => {
    animation.reset();
    pressKey(window, "Digit2", 1);
    pressKey(window, "KeyW", 35);
    pressKey(window, "KeyC", 1);    
    pressKey(window, "KeyA", 5);
    animation.draw();
  }
);*/

/**
 * Tests A Key in FPS Mode
 */
clothTests.integrationTest(
  "A Key (FPS Mode)",
  "./static/img/cloth/a_fps_ref.png",
  (animation) => {
    if (animation) {
      animation.reset();
      pressKey(window, "Digit2", 1);
      pressKey(window, "KeyW", 35);
      pressKey(window, "KeyA", 10);
      animation.draw();
    }
  }
);

/**
 * Tests D key Orbital Mode
 */
/*clothTests.integrationTest(
  "D Key (Orbital Mode)",
  "./static/img/cloth/d_orbital_ref.png",
  (animation) => {
    if (animation) {
      animation.reset();
      pressKey(window, "Digit2", 1);
      pressKey(window, "KeyW", 35);
      pressKey(window, "KeyC", 1);
      pressKey(window, "KeyD", 5);
      animation.draw();
    }
  }
);*/

/**
 * Tests D Key in FPS Mode
 */
clothTests.integrationTest(
  "D Key (FPS Mode)",
  "./static/img/cloth/d_fps_ref.png",
  (animation) => {
    if (animation) {
      animation.reset();
      pressKey(window, "Digit2", 1);
      pressKey(window, "KeyW", 35);
      pressKey(window, "KeyD", 10);
      animation.draw();
    }
  }
);

/**
 * Tests left arrow key
 */
clothTests.integrationTest(
  "Left Arrow Key",
  "./static/img/cloth/left_arrow_ref.png",
  (animation) => {
    if (animation) {
      animation.reset();
      pressKey(window, "Digit2", 1);
      //dragMouse(canvas, -1, 1, 15);
      pressKey(window, "ArrowLeft", 10);
      animation.draw();
    }
  }
);

/**
 * Tests right arrow key
 */
clothTests.integrationTest(
  "Right Arrow Key",
  "./static/img/cloth/right_arrow_ref.png",
  (animation) => {
    if (animation) {
      animation.reset();
      pressKey(window, "Digit2", 1);
      //dragMouse(canvas, -1, 1, 15);
      pressKey(window, "ArrowRight", 10);
      animation.draw();
    }
  }
);

/**
 * Tests Up arrow key in orbital mode
 */
/*clothTests.integrationTest(
  "Up Arrow Key (Orbital Mode)",
  "./static/img/cloth/up_arrow_orbital_ref.png",
  (animation) => {
    if (animation) {
      animation.reset();
      pressKey(window, "Digit2", 1);
      pressKey(window, "KeyC", 1);
      pressKey(window, "ArrowUp", 4);
      animation.draw();
    }
  }
);*/

/**
 * Tests up arrow in fps mode
 */
clothTests.integrationTest(
  "Up Arrow Key (FPS Mode)",
  "./static/img/cloth/up_arrow_fps_ref.png",
  (animation) => {
    if (animation) {
      animation.reset();
      pressKey(window, "Digit2", 1);
      pressKey(window, "ArrowUp", 13);
      animation.draw();
    }
  }
);

/**
 * Tests down arrow key in orbital mode
 */
/*clothTests.integrationTest(
  "Down Arrow Key (Orbital Mode)",
  "./static/img/cloth/down_arrow_orbital_ref.png",
  (animation) => {
    if (animation) {
      animation.reset();
      pressKey(window, "Digit2", 1);
      pressKey(window, "KeyC", 1);
      pressKey(window, "ArrowDown", 4);
      animation.draw();
    }
  }
);*/

/**
 * Tests down arrow in fps mode
 */
clothTests.integrationTest(
  "Down Arrow Key (FPS Mode)",
  "./static/img/cloth/down_arrow_fps_ref.png",
  (animation) => {
    if (animation) {
      animation.reset();
      pressKey(window, "Digit2", 1);
      pressKey(window, "ArrowDown", 10);
      animation.draw();
    }
  }
);
