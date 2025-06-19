// Vertex shader program
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aNormal;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vNormal = mat3(uModelViewMatrix) * aNormal;
        vPosition = vec3(uModelViewMatrix * aVertexPosition);
    }
`;

// Fragment shader program
const fsSource = `
    precision mediump float;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        vec3 normal = normalize(vNormal);
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 color = vec3(0.8, 0.8, 0.8);
        gl_FragColor = vec4(color * (0.3 + 0.7 * diff), 1.0);
    }
`;

// Initialize a shader program
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program:', gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

// Create a shader of the given type, uploads the source and compiles it
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Calculate Bezier surface point
function calculateBezierPoint(controlPoints, u, v) {
    const n = controlPoints.length - 1;
    const m = controlPoints[0].length - 1;
    let result = [0, 0, 0];

    for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= m; j++) {
            const bernsteinU = binomial(n, i) * Math.pow(u, i) * Math.pow(1 - u, n - i);
            const bernsteinV = binomial(m, j) * Math.pow(v, j) * Math.pow(1 - v, m - j);
            const point = controlPoints[i][j];
            
            result[0] += bernsteinU * bernsteinV * point[0];
            result[1] += bernsteinU * bernsteinV * point[1];
            result[2] += bernsteinU * bernsteinV * point[2];
        }
    }

    return result;
}

// Calculate binomial coefficient
function binomial(n, k) {
    let coeff = 1;
    for (let i = 1; i <= k; i++) {
        coeff *= (n - k + i) / i;
    }
    return coeff;
}

// Generate vertices for a Bezier surface
function generateBezierSurface(controlPoints, uSteps, vSteps) {
    const vertices = [];
    const normals = [];
    const indices = [];

    // Generate vertices
    for (let i = 0; i <= uSteps; i++) {
        const u = i / uSteps;
        for (let j = 0; j <= vSteps; j++) {
            const v = j / vSteps;
            const point = calculateBezierPoint(controlPoints, u, v);
            vertices.push(...point);
            
            // Simple normal calculation (can be improved)
            const normal = [0, 1, 0]; // Default normal pointing up
            normals.push(...normal);
        }
    }

    // Generate indices
    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            const topLeft = i * (vSteps + 1) + j;
            const topRight = topLeft + 1;
            const bottomLeft = (i + 1) * (vSteps + 1) + j;
            const bottomRight = bottomLeft + 1;

            indices.push(topLeft, bottomLeft, topRight);
            indices.push(topRight, bottomLeft, bottomRight);
        }
    }

    return { vertices, normals, indices };
}

// Main function
async function main() {
    const canvas = document.querySelector('#glCanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    // Set clear color to black
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Initialize shader program
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            normal: gl.getAttribLocation(shaderProgram, 'aNormal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    // Load teapot data
    const response = await fetch('./teapot_data.json');
    const teapotData = await response.json();

    // Generate vertices for all surfaces
    const allVertices = [];
    const allNormals = [];
    const allIndices = [];
    let indexOffset = 0;

    teapotData.TeaSrfs.forEach(surface => {
        const { vertices, normals, indices } = generateBezierSurface(surface.control_points, 20, 20);
        allVertices.push(...vertices);
        allNormals.push(...normals);
        allIndices.push(...indices.map(i => i + indexOffset));
        indexOffset += vertices.length / 3;
    });

    // Create buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allVertices), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allNormals), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(allIndices), gl.STATIC_DRAW);

    // Draw the scene
    function drawScene() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Create perspective matrix
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

        // Set the drawing position
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
        mat4.rotate(modelViewMatrix, modelViewMatrix, Date.now() * 0.001, [0, 1, 0]);

        // Tell WebGL how to pull out the positions from the position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            3,
            gl.FLOAT,
            false,
            0,
            0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        // Tell WebGL how to pull out the normals from the normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.normal,
            3,
            gl.FLOAT,
            false,
            0,
            0);
        gl.enableVertexAttribArray(programInfo.attribLocations.normal);

        // Tell WebGL which indices to use to index the vertices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        // Tell WebGL to use our program when drawing
        gl.useProgram(programInfo.program);

        // Set the shader uniforms
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);

        // Draw the elements
        gl.drawElements(gl.TRIANGLES, allIndices.length, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(drawScene);
    }

    // Add mat4 library
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gl-matrix/2.8.1/gl-matrix-min.js';
    script.onload = drawScene;
    document.head.appendChild(script);
}

main(); 