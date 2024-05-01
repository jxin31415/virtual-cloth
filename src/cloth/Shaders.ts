export let defaultVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec3 vertColor;
    attribute vec4 aNorm;
    
    varying vec4 lightDir;
    varying vec4 normal;   

    uniform vec4 lightPosition;
    uniform mat4 mWorld;
    uniform mat4 mView;
	uniform mat4 mProj;

    void main () {
		//  Convert vertex to camera coordinates and the NDC
        gl_Position = mProj * mView * mWorld * vec4 (vertPosition, 1.0);
        
        //  Compute light direction (world coordinates)
        lightDir = lightPosition - vec4(vertPosition, 1.0);
		
        //  Pass along the vertex normal (world coordinates)
        normal = aNorm;
    }
`;

// TODO: Write the fragment shader

export let defaultFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;    
	
    
    void main () {
        vec3 ldNorm = normalize(lightDir.xyz);
        vec3 nNorm = normalize(normal.xyz);

        float diffuse = clamp(dot(ldNorm, nNorm), 0.0, 1.0);

        vec4 color = vec4(abs(normal[0]) * diffuse * 0.5, 0, 1.0, 1.0);
        gl_FragColor = color;

        // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        
    }
`;

// TODO: floor shaders

export let floorVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec3 vertColor;
    attribute vec4 aNorm;

    varying vec4 lightDir;
    varying vec4 normal;   
    varying vec4 worldPos;

    uniform vec4 lightPosition;
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    void main () {
        //  Convert vertex to camera coordinates and the NDC
        gl_Position = mProj * mView * mWorld * vec4 (vertPosition, 1.0);
        
        //  Compute light direction (world coordinates)
        lightDir = lightPosition - vec4(vertPosition, 1.0);
        
        //  Pass along the vertex normal (world coordinates)
        normal = aNorm;
        
        worldPos = mWorld * vec4(vertPosition, 1.0);
    }
`;

export let floorFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;  

    varying vec4 worldPos;

    void main () {
        vec3 ldNorm = normalize(lightDir.xyz);
        vec3 nNorm = normalize(normal.xyz);

        float diffuse = clamp(dot(ldNorm, nNorm), 0.0, 1.0);
    
        float gridSize = 5.0;
    
        // Calculate the checkerboard pattern
        int modX = int(mod(worldPos.x / gridSize, 2.0));
        int modZ = int(mod(worldPos.z / gridSize, 2.0));
        bool isWhite = bool(mod(float(modX + modZ), 2.0));
    
        vec3 white = vec3(1.0, 1.0, 1.0);
        vec3 black = vec3(0.0, 0.0, 0.0);
    
        vec3 color;
        if(isWhite){
            color = white;
        }else{
            color = black;
        }
    
        gl_FragColor = vec4(color * diffuse, 1.0);
    }
`;

