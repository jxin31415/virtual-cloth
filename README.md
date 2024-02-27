Names: Jimmy Xin (jjx88), Gavin Wang (gw7775)

# Menger Sponge
We do not have anything particularly important to report.

Implementation details:
- We use 5 vertices for the floor, and 4 total triangles.
- For the mouse drag, we assume the vector created by the drag is in the camera's local coordinates, i.e. we do not touch the projection matrix.
- We use a recursive function to build the sponge. The function propogates down the current cube's origin and length; once it reaches the base case, it builds the set of vertices for the current cube.
- The triangle indices and normals are filled in afterwards, since they follow a specific pre-determined pattern.
- We display a floor with a checkerboard pattern, occupying the plane y = -2.
- We use shaders to color the triangles with diffuse shading.
  
