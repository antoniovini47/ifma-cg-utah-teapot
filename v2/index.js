// Vertex shader program
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying lowp vec4 vColor;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
    }
`;

// Fragment shader program
const fsSource = `
    varying lowp vec4 vColor;
    void main(void) {
        gl_FragColor = vColor;
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
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

// Create a shader of the given type
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Initialize buffers
function initBuffers(gl, surfaces) {
    // Create arrays to hold the vertices and colors
    let vertices = [];
    let colors = [];

    // Scale factor to make the model smaller
    const scale = 0.2;

    // Process each surface
    surfaces.forEach((surface, surfaceIndex) => {
        // Create triangles from the surface points
        const p0 = surface[0];
        const p1 = surface[1];
        const p2 = surface[2];
        const p3 = surface[3];

        // First triangle (scaled)
        vertices.push(p0[0] * scale, p0[1] * scale, p0[2] * scale);
        vertices.push(p1[0] * scale, p1[1] * scale, p1[2] * scale);
        vertices.push(p2[0] * scale, p2[1] * scale, p2[2] * scale);

        // Second triangle (scaled)
        vertices.push(p0[0] * scale, p0[1] * scale, p0[2] * scale);
        vertices.push(p2[0] * scale, p2[1] * scale, p2[2] * scale);
        vertices.push(p3[0] * scale, p3[1] * scale, p3[2] * scale);

        // Add colors for each vertex
        const color = [
            Math.random(),
            Math.random(),
            Math.random(),
            1.0
        ];

        // Add colors for first triangle
        colors.push(...color);
        colors.push(...color);
        colors.push(...color);

        // Add colors for second triangle
        colors.push(...color);
        colors.push(...color);
        colors.push(...color);
    });

    // Convert to Float32Array
    const vertexArray = new Float32Array(vertices);
    const colorArray = new Float32Array(colors);

    // Create and bind position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

    // Create and bind color buffer
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colorArray, gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        vertexCount: vertices.length / 3
    };
}

// Draw the scene
function drawScene(gl, programInfo, buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create perspective matrix
    const fieldOfView = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Set drawing position
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, -0.5, -1.0]); // Adjusted position
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotation, [0, 1, 0]);

    // Tell WebGL how to pull out the positions from the position buffer
    {
        const numComponents = 3;
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

    // Tell WebGL how to pull out the colors from the color buffer
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexColor);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

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

    {
        const offset = 0;
        gl.drawArrays(gl.TRIANGLES, offset, buffers.vertexCount);
    }
}

// Main function
let rotation = 0.0;
let then = 0;

function main() {
    const canvas = document.querySelector('#glCanvas');
    const gl = canvas.getContext('webgl');
    const debugDiv = document.querySelector('#debug');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    // Set clear color to black
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Initialize shader program
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    // Load the model data
    fetch('model.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.surfaces || !Array.isArray(data.surfaces)) {
                throw new Error('Invalid model data format');
            }
            debugDiv.textContent = `Loaded ${data.surfaces.length} surfaces`;
            
            const buffers = initBuffers(gl, data.surfaces);

            // Render loop
            function render(now) {
                now *= 0.001;  // convert to seconds
                const deltaTime = now - then;
                then = now;

                rotation += deltaTime;

                drawScene(gl, programInfo, buffers);
                requestAnimationFrame(render);
            }
            requestAnimationFrame(render);
        })
        .catch(error => {
            console.error('Error loading model:', error);
            debugDiv.textContent = `Error: ${error.message}`;
        });
}

// Start the application
window.onload = main; 