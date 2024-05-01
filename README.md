Names: Jimmy Xin (jjx88), Gavin Wang (gw7775)

# Final Project
For our final project, we implemented a *mass-spring system* that we use to simulate *cloth*.

## How to Run
This project can be run the same way as every other WebGL project from this semester. First, run, `make-cloth.py` from the project root directory, and then launch an HTTP server with `http-server dist -c-1`. This will launch an interactive demo.

You can use the typical camera controls (`WASD`, arrow keys) to navigate around the environment.

We also provide some pre-generated videos in the environment for your viewing convenience.

## Mass-Spring System
We use a mass-spring system to simulate cloth. First, some preliminaries on mass-spring systems. This is a form of *physical simulation*, in particular a *particle simulation*. We maintain some point masses and then describe the forces acting on these point masses. In particular, instead of attempting to mathematically model the path of every particle as a function of time, we'll instead provide some basic physical principles and then just allow the system to "play out."

The primary interesting physical principle we use is *Hooke's Law*, which describes the behavior of springs. Given two points, we can attach a spring between them and model the force using the equation `F = -kx`, where `F` is the force, `k` is the spring constant, and `x` is the displacement between the two points. This follows from some basic physics background.

Then, for each point, we can maintain its acceleration, velocity, and position. To simulate the system, we'll simply step through time (using very small timesteps) and use Newton's second law (`F = ma`) to update the acceleration, and some kinematic equations to update the velocity and position.

### Integrators
There are a few different ways of doing this calculation. (talk about integrators here)

### Dampening Term
However, even this is unsatisfactory -- there will always be some error left in the system. In order to correct for this error, and to make the system more realistic by modeling *energy loss*, we'll also add a dampening term. That is, we'll add a force that resists the particle's current direction of motion. Without this, we find that the error compounds and causes the system to quickly spiral out of control (it appears to implode or explode). Even without any error, a spring that keeps bouncing forever is unrealistic, justifying the use of this dampening term.

Now we just need to add a constant force for gravity, and put it all together!

## Cloth
We model a cloth simply as a network of points and springs connecting those points. In particular, we add:

- *structural springs*:
- *sheer springs*:
- *flex springs*:

### Rendering
We render the system by converting the particle system into a triangle mesh. Since the cloth is arranged in a grid-like structure, for each "cell" (a square defined by four points), we can simply split that into two triangles and render those two triangles.

We use a similar method to the Menger sponge, where we'll duplicate points when they need to be used for multiple triangles. Normals are calculated by finding the plane that defines the triangle. A future extension would be to make this normal calculation smoother.

## Collisions
We do some rudimentary collision tracking, which...

## Extra Credit
(10 pts) We have both completed the online course instructor survey.