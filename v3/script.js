/**
 * script.js
 * This file contains the WebGL code to render the Utah Teapot.
 * It fetches the parsed Bezier data, tessellates the patches into triangles,
 * and sets up a basic lighting model with camera controls.
 */

// Global variables for WebGL context and program
let gl;
let programInfo;
let buffers;
let teapotData = null;

// Camera and interaction variables
let rotationX = 0;
let rotationY = 0;
let zoom = 5.0; // Initial zoom level (distance from origin)
let isDragging = false;
let lastMouseX, lastMouseY;

// Constants for Bezier patch tessellation
const TESSELLATION_LEVEL = 20; // Number of subdivisions per U/V direction (NxN quads per patch)

// Vertex Shader source code
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix; // For transforming normals

    varying highp vec3 vLighting;

    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

        // Apply lighting
        highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
        highp vec3 directionalLightColor = vec3(1.0, 1.0, 1.0);
        highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75)); // Light direction

        highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
        highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
        vLighting = ambientLight + (directionalLightColor * directional);
    }
`;

// Fragment Shader source code
const fsSource = `
    precision mediump float;
    varying highp vec3 vLighting;

    void main(void) {
        gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0) * vec4(vLighting, 1.0); // Orange color
    }
`;

/**
 * Initializes the WebGL context, shaders, and begins loading data.
 */
function initWebGL() {
    const canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
        console.error('Unable to initialize WebGL. Your browser may not support it.');
        document.getElementById('loading-message').textContent = 'WebGL not supported!';
        document.getElementById('loading-message').style.display = 'block';
        return;
    }

    // Set canvas dimensions to fill its container
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize shaders
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
        },
    };

    // Show loading message while data is being fetched and processed
    document.getElementById('loading-message').style.display = 'block';

    // Load teapot data and then start rendering
    loadTeapotData();
    setupEventListeners(canvas);
}

/**
 * Resizes the canvas to match its display size and updates the WebGL viewport.
 */
function resizeCanvas() {
    const canvas = gl.canvas;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
}

/**
 * Compiles and links shaders into a WebGL program.
 * @param {WebGLRenderingContext} gl The WebGL rendering context.
 * @param {string} vsSource The source code for the vertex shader.
 * @param {string} fsSource The source code for the fragment shader.
 * @returns {WebGLProgram} The compiled and linked WebGL program.
 */
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

/**
 * Creates a shader of the given type, uploads the source and compiles it.
 * @param {WebGLRenderingContext} gl The WebGL rendering context.
 * @param {number} type The type of shader (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER).
 * @param {string} source The source code for the shader.
 * @returns {WebGLShader} The compiled shader.
 */
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

/**
 * Loads the teapot data from the JSON file.
 */
async function loadTeapotData() {
    try {
        // Assume 'teapot_data.json' is in the same directory as index.html
        const response = await fetch('teapot_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        teapotData = await response.json();
        console.log("Teapot data loaded:", teapotData);
        buffers = initBuffers(gl, teapotData);
        document.getElementById('loading-message').style.display = 'none'; // Hide loading message
        requestAnimationFrame(render); // Start the rendering loop
    } catch (error) {
        console.error("Could not load teapot data:", error);
        document.getElementById('loading-message').textContent = 'Failed to load teapot data.';
    }
}

/**
 * Initializes buffers for WebGL rendering based on the parsed teapot data.
 * This function will tessellate the Bezier patches into triangle strips.
 * @param {WebGLRenderingContext} gl The WebGL rendering context.
 * @param {object} teapotData The parsed teapot data.
 * @returns {object} An object containing WebGL buffers for positions, normals, and indices.
 */
function initBuffers(gl, teapotData) {
    const positions = [];
    const normals = [];
    const indices = [];

    const surfaces = teapotData.TeaSrfs;

    // Iterate over each Bezier surface patch
    surfaces.forEach(surface => {
        const controlPoints = surface.control_points; // A 4x4 array of [x, y, z] points
        const baseIndex = positions.length / 3; // Starting index for this patch's vertices

        // Tessellate each patch using a grid of TESSELLATION_LEVEL x TESSELLATION_LEVEL quads
        for (let i = 0; i <= TESSELLATION_LEVEL; i++) {
            const u = i / TESSELLATION_LEVEL;
            for (let j = 0; j <= TESSELLATION_LEVEL; j++) {
                const v = j / TESSELLATION_LEVEL;

                // Calculate point on the Bezier surface
                const point = getBezierSurfacePoint(u, v, controlPoints);
                positions.push(point[0], point[1], point[2]);

                // Calculate normal at the point
                const normal = getBezierSurfaceNormal(u, v, controlPoints);
                normals.push(normal[0], normal[1], normal[2]);

                // Generate indices for triangle strips
                if (i < TESSELLATION_LEVEL && j < TESSELLATION_LEVEL) {
                    const idx00 = baseIndex + i * (TESSELLATION_LEVEL + 1) + j;
                    const idx10 = baseIndex + (i + 1) * (TESSELLATION_LEVEL + 1) + j;
                    const idx01 = baseIndex + i * (TESSELLATION_LEVEL + 1) + (j + 1);
                    const idx11 = baseIndex + (i + 1) * (TESSELLATION_LEVEL + 1) + (j + 1);

                    // Two triangles form a quad
                    indices.push(idx00, idx10, idx01); // Triangle 1
                    indices.push(idx01, idx10, idx11); // Triangle 2
                }
            }
        }
    });

    // Create WebGL buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        normal: normalBuffer,
        indices: indexBuffer,
        vertexCount: indices.length,
    };
}

/**
 * Calculates a point on a cubic Bezier curve.
 * @param {number} t Parameter (0 to 1).
 * @param {Array<Array<number>>} points 4 control points for the curve [[x,y,z], ...].
 * @returns {Array<number>} The [x,y,z] coordinates of the point.
 */
function getBezierCurvePoint(t, points) {
    const B0 = (1 - t) ** 3;
    const B1 = 3 * (1 - t) ** 2 * t;
    const B2 = 3 * (1 - t) * t ** 2;
    const B3 = t ** 3;

    let x = B0 * points[0][0] + B1 * points[1][0] + B2 * points[2][0] + B3 * points[3][0];
    let y = B0 * points[0][1] + B1 * points[1][1] + B2 * points[2][1] + B3 * points[3][1];
    let z = B0 * points[0][2] + B1 * points[1][2] + B2 * points[2][2] + B3 * points[3][2];

    return [x, y, z];
}

/**
 * Calculates a point on a bicubic Bezier surface.
 * @param {number} u U-parameter (0 to 1).
 * @param {number} v V-parameter (0 to 1).
 * @param {Array<Array<Array<number>>>} controlPoints 4x4 array of control points.
 * @returns {Array<number>} The [x,y,z] coordinates of the point on the surface.
 */
function getBezierSurfacePoint(u, v, controlPoints) {
    // Evaluate 4 Bezier curves in the U direction to get 4 intermediate points
    const uPoints = [];
    for (let i = 0; i < 4; i++) {
        uPoints.push(getBezierCurvePoint(u, controlPoints[i]));
    }

    // Now evaluate a Bezier curve in the V direction using these intermediate points
    return getBezierCurvePoint(v, uPoints);
}

/**
 * Calculates the derivative of a Bezier curve with respect to t.
 * @param {number} t Parameter (0 to 1).
 * @param {Array<Array<number>>} points 4 control points for the curve.
 * @returns {Array<number>} The derivative vector [dx/dt, dy/dt, dz/dt].
 */
function getBezierCurveDerivative(t, points) {
    const dB0 = -3 * (1 - t) ** 2;
    const dB1 = 3 * (1 - t) ** 2 - 6 * (1 - t) * t;
    const dB2 = 6 * (1 - t) * t - 3 * t ** 2;
    const dB3 = 3 * t ** 2;

    let dx = dB0 * points[0][0] + dB1 * points[1][0] + dB2 * points[2][0] + dB3 * points[3][0];
    let dy = dB0 * points[0][1] + dB1 * points[1][1] + dB2 * points[2][1] + dB3 * points[3][1];
    let dz = dB0 * points[0][2] + dB1 * points[1][2] + dB2 * points[2][2] + dB3 * points[3][2];

    return [dx, dy, dz];
}

/**
 * Calculates the normal vector for a point on a bicubic Bezier surface.
 * This involves calculating partial derivatives with respect to u and v,
 * and then taking their cross product.
 * @param {number} u U-parameter (0 to 1).
 * @param {number} v V-parameter (0 to 1).
 * @param {Array<Array<Array<number>>>} controlPoints 4x4 array of control points.
 * @returns {Array<number>} The normalized normal vector [nx, ny, nz].
 */
function getBezierSurfaceNormal(u, v, controlPoints) {
    // Calculate partial derivative with respect to u (Pu)
    const Pu_uPoints = [];
    for (let i = 0; i < 4; i++) {
        Pu_uPoints.push(getBezierCurvePoint(u, controlPoints[i]));
    }
    const Pu = getBezierCurveDerivative(v, Pu_uPoints);

    // Calculate partial derivative with respect to v (Pv)
    const Pv_vPoints = [];
    for (let j = 0; j < 4; j++) {
        const tempControlPoints = [
            controlPoints[0][j],
            controlPoints[1][j],
            controlPoints[2][j],
            controlPoints[3][j]
        ];
        Pv_vPoints.push(getBezierCurvePoint(v, tempControlPoints));
    }
    const Pv = getBezierCurveDerivative(u, Pv_vPoints);


    // Cross product of Pu and Pv gives the normal vector
    const normal = crossProduct(Pu, Pv);
    return normalizeVector(normal);
}

/**
 * Calculates the cross product of two 3D vectors.
 * @param {Array<number>} a Vector A [x,y,z].
 * @param {Array<number>} b Vector B [x,y,z].
 * @returns {Array<number>} The cross product vector [x,y,z].
 */
function crossProduct(a, b) {
    const x = a[1] * b[2] - a[2] * b[1];
    const y = a[2] * b[0] - a[0] * b[2];
    const z = a[0] * b[1] - a[1] * b[0];
    return [x, y, z];
}

/**
 * Normalizes a 3D vector.
 * @param {Array<number>} v The vector to normalize [x,y,z].
 * @returns {Array<number>} The normalized vector.
 */
function normalizeVector(v) {
    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (length > 0.00001) { // Avoid division by zero
        return [v[0] / length, v[1] / length, v[2] / length];
    }
    return [0, 0, 0];
}


/**
 * Sets up mouse event listeners for camera rotation and zoom.
 * @param {HTMLCanvasElement} canvas The WebGL canvas element.
 */
function setupEventListeners(canvas) {
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        rotationY += deltaX * 0.5; // Adjust sensitivity
        rotationX += deltaY * 0.5; // Adjust sensitivity

        // Clamp rotationX to avoid flipping
        rotationX = Math.max(-90, Math.min(90, rotationX));

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        requestAnimationFrame(render);
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault(); // Prevent page scrolling
        zoom += e.deltaY * 0.01; // Adjust zoom sensitivity
        zoom = Math.max(1.0, Math.min(10.0, zoom)); // Clamp zoom level
        requestAnimationFrame(render);
    });

    // Handle touch events for rotation
    canvas.addEventListener('touchstart', (e) => {
        isDragging = true;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
        e.preventDefault(); // Prevent scrolling
    });

    canvas.addEventListener('touchend', () => {
        isDragging = false;
    });

    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const deltaX = e.touches[0].clientX - lastMouseX;
        const deltaY = e.touches[0].clientY - lastMouseY;

        rotationY += deltaX * 0.5; // Adjust sensitivity
        rotationX += deltaY * 0.5; // Adjust sensitivity

        // Clamp rotationX to avoid flipping
        rotationX = Math.max(-90, Math.min(90, rotationX));

        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
        requestAnimationFrame(render);
        e.preventDefault(); // Prevent scrolling
    });
}


/**
 * Main rendering loop.
 */
function render() {
    if (!gl || !programInfo || !buffers) {
        return; // Wait for initialization and data loading
    }

    gl.clearColor(0.2, 0.2, 0.2, 1.0); // Clear to dark gray, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create the projection matrix
    const fieldOfView = 45 * Math.PI / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Create the model-view matrix
    const modelViewMatrix = mat4.create();

    // Position the camera
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, -0.7, -zoom]); // Move slightly down and back

    // Apply rotations based on user input
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationX * Math.PI / 180, [1, 0, 0]); // Rotate around X axis
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationY * Math.PI / 180, [0, 1, 0]); // Rotate around Y axis

    // Adjust teapot's initial orientation to be more upright and centered
    mat4.rotate(modelViewMatrix, modelViewMatrix, Math.PI / 2, [1, 0, 0]); // Rotate X by 90 degrees to make it upright
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -1.0]); // Translate to center its base

    // Calculate the normal matrix
    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    // Tell WebGL how to pull out the positions from the position buffer into the vertexPosition attribute.
    {
        const numComponents = 3; // (x, y, z)
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the normals from the normal buffer into the vertexNormal attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexNormal,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexNormal);
    }

    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

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
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.normalMatrix,
        false,
        normalMatrix);

    {
        const vertexCount = buffers.vertexCount;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
}

// Basic matrix and vector utilities (simplified for this example)
// In a real application, you'd use a library like gl-matrix.
const mat4 = {
    create: function() {
        return new Float32Array(16);
    },
    identity: function(out) {
        out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
        out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
        out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
        out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
        return out;
    },
    perspective: function(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        out[0] = f / aspect;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = f;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[10] = (near + far) / (near - far);
        out[11] = -1;
        out[12] = 0;
        out[13] = 0;
        out[14] = (2 * far * near) / (near - far);
        out[15] = 0;
        return out;
    },
    translate: function(out, a, v) {
        let x = v[0], y = v[1], z = v[2];
        let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        out[0] = a00;
        out[1] = a01;
        out[2] = a02;
        out[3] = a03;
        out[4] = a10;
        out[5] = a11;
        out[6] = a12;
        out[7] = a13;
        out[8] = a20;
        out[9] = a21;
        out[10] = a22;
        out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a30;
        out[13] = a01 * x + a11 * y + a21 * z + a31;
        out[14] = a02 * x + a12 * y + a22 * z + a32;
        out[15] = a03 * x + a13 * y + a23 * z + a33;
        return out;
    },
    rotate: function(out, a, rad, axis) {
        let x = axis[0], y = axis[1], z = axis[2];
        let len = Math.sqrt(x * x + y * y + z * z);
        let s, c, t;
        let a00, a01, a02, a03;
        let a10, a11, a12, a13;
        let a20, a21, a22, a23;
        let b00, b01, b02;
        let b10, b11, b12;
        let b20, b21, b22;

        if (len < 0.000001) { return null; }

        len = 1 / len;
        x *= len;
        y *= len;
        z *= len;

        s = Math.sin(rad);
        c = Math.cos(rad);
        t = 1 - c;

        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        // Construct the rotation matrix
        b00 = x * x * t + c;
        b01 = y * x * t + z * s;
        b02 = z * x * t - y * s;
        b10 = x * y * t - z * s;
        b11 = y * y * t + c;
        b12 = z * y * t + x * s;
        b20 = x * z * t + y * s;
        b21 = y * z * t - x * s;
        b22 = z * z * t + c;

        // Perform rotation-specific matrix multiplication
        out[0] = a00 * b00 + a10 * b01 + a20 * b02;
        out[1] = a01 * b00 + a11 * b01 + a21 * b02;
        out[2] = a02 * b00 + a12 * b01 + a22 * b02;
        out[3] = a03 * b00 + a13 * b01 + a23 * b02;
        out[4] = a00 * b10 + a10 * b11 + a20 * b12;
        out[5] = a01 * b10 + a11 * b11 + a21 * b12;
        out[6] = a02 * b10 + a12 * b11 + a22 * b12;
        out[7] = a03 * b10 + a13 * b11 + a23 * b12;
        out[8] = a00 * b20 + a10 * b21 + a20 * b22;
        out[9] = a01 * b20 + a11 * b21 + a21 * b22;
        out[10] = a02 * b20 + a12 * b21 + a22 * b22;
        out[11] = a03 * b20 + a13 * b21 + a23 * b22;

        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
        return out;
    },
    // Invert a mat4
    invert: function(out, a) {
        let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        let b00 = a00 * a11 - a01 * a10;
        let b01 = a00 * a12 - a02 * a10;
        let b02 = a00 * a13 - a03 * a10;
        let b03 = a01 * a12 - a02 * a11;
        let b04 = a01 * a13 - a03 * a11;
        let b05 = a02 * a13 - a03 * a12;
        let b06 = a20 * a31 - a21 * a30;
        let b07 = a20 * a32 - a22 * a30;
        let b08 = a20 * a33 - a23 * a30;
        let b09 = a21 * a32 - a22 * a31;
        let b10 = a21 * a33 - a23 * a31;
        let b11 = a22 * a33 - a23 * a32;

        // Calculate the determinant
        let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

        if (!det) {
            return null;
        }
        det = 1.0 / det;

        out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        out[1] = (a01 * b11 - a02 * b10 + a03 * b09) * det; // Adjusted sign
        out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; // Adjusted sign
        out[3] = (a21 * b05 - a22 * b04 + a23 * b03) * det; // Adjusted sign

        out[4] = (a12 * b08 - a10 * b10 - a13 * b07) * det; // Adjusted sign
        out[5] = (a00 * b10 - a02 * b08 + a03 * b07) * det; // Adjusted sign
        out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; // Adjusted sign
        out[7] = (a22 * b02 - a20 * b05 - a23 * b01) * det; // Adjusted sign

        out[8] = (a10 * b05 + a13 * b06 - a11 * b08) * det; // Adjusted sign
        out[9] = (a01 * b08 - a00 * b05 - a03 * b06) * det; // Adjusted sign
        out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; // Adjusted sign
        out[11] = (a20 * b04 - a21 * b02 + a23 * b00) * det; // Adjusted sign

        out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; // Adjusted sign
        out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det; // Adjusted sign
        out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; // Adjusted sign
        out[15] = (a21 * b01 - a20 * b03 - a22 * b00) * det; // Adjusted sign

        return out;
    },
    // Transpose a mat4
    transpose: function(out, a) {
        // If out and a are the same, do this in-place
        if (out === a) {
            let a01 = a[1], a02 = a[2], a03 = a[3];
            let a12 = a[6], a13 = a[7];
            let a23 = a[11];

            out[1] = a[4];
            out[2] = a[8];
            out[3] = a[12];
            out[4] = a01;
            out[6] = a[9];
            out[7] = a[13];
            out[8] = a02;
            out[9] = a12;
            out[11] = a[14];
            out[12] = a03;
            out[13] = a13;
            out[14] = a23;
        } else {
            out[0] = a[0];
            out[1] = a[4];
            out[2] = a[8];
            out[3] = a[12];
            out[4] = a[1];
            out[5] = a[5];
            out[6] = a[9];
            out[7] = a[13];
            out[8] = a[2];
            out[9] = a[6];
            out[10] = a[10];
            out[11] = a[14];
            out[12] = a[3];
            out[13] = a[7];
            out[14] = a[11];
            out[15] = a[15];
        }
        return out;
    }
};


// Start the WebGL application when the window loads
window.onload = initWebGL;
