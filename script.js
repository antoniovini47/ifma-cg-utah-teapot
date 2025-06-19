// Vertex shader program
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aNormal;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPos;
    
    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vNormal = mat3(uModelViewMatrix) * aNormal;
        vPosition = vec3(uModelViewMatrix * aVertexPosition);
        vWorldPos = vec3(aVertexPosition);
    }
`;

// Fragment shader program
const fsSource = `
    precision mediump float;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPos;
    
    uniform float uLightIntensity;
    uniform bool uWireframeMode;
    
    void main() {
        if (uWireframeMode) {
            // Wireframe mode - show edges
            vec3 worldPos = vWorldPos;
            float edgeWidth = 0.02;
            
            // Check if we're near an edge
            vec3 grid = fract(worldPos * 10.0);
            float edge = min(min(grid.x, grid.y), grid.z);
            
            if (edge < edgeWidth) {
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            } else {
                gl_FragColor = vec4(0.1, 0.1, 0.1, 1.0);
            }
        } else {
            // Normal lighting mode
            vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            vec3 normal = normalize(vNormal);
            float diff = max(dot(normal, lightDir), 0.0);
            
            // Ambient light
            vec3 ambient = vec3(0.1, 0.1, 0.1);
            
            // Diffuse light with more contrast
            vec3 diffuse = vec3(0.9, 0.9, 0.9) * diff * uLightIntensity;
            
            // Specular light
            vec3 viewDir = normalize(-vPosition);
            vec3 reflectDir = reflect(-lightDir, normal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 64.0);
            vec3 specular = vec3(0.8, 0.8, 0.8) * spec * uLightIntensity;
            
            // Add some color variation based on position to highlight tessellation
            vec3 color = vec3(0.8, 0.6, 0.4); // Base teapot color
            color += vec3(0.1) * sin(vWorldPos.x * 5.0) * sin(vWorldPos.y * 5.0) * sin(vWorldPos.z * 5.0);
            
            // Combine lights
            vec3 result = (ambient + diffuse + specular) * color;
            
            gl_FragColor = vec4(result, 1.0);
        }
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

// Calculate Bezier surface normal
function calculateBezierNormal(controlPoints, u, v, epsilon = 0.001) {
    const point = calculateBezierPoint(controlPoints, u, v);
    const pointU = calculateBezierPoint(controlPoints, u + epsilon, v);
    const pointV = calculateBezierPoint(controlPoints, u, v + epsilon);
    
    const tangentU = [
        pointU[0] - point[0],
        pointU[1] - point[1],
        pointU[2] - point[2]
    ];
    
    const tangentV = [
        pointV[0] - point[0],
        pointV[1] - point[1],
        pointV[2] - point[2]
    ];
    
    // Cross product of tangents gives normal
    return [
        tangentU[1] * tangentV[2] - tangentU[2] * tangentV[1],
        tangentU[2] * tangentV[0] - tangentU[0] * tangentV[2],
        tangentU[0] * tangentV[1] - tangentU[1] * tangentV[0]
    ];
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
            
            const normal = calculateBezierNormal(controlPoints, u, v);
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

    // Set clear color to match background
    gl.clearColor(0.102, 0.102, 0.18, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

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
            lightIntensity: gl.getUniformLocation(shaderProgram, 'uLightIntensity'),
            wireframeMode: gl.getUniformLocation(shaderProgram, 'uWireframeMode'),
        },
    };

    // Load teapot data
    const response = await fetch('v4/teapot_data.json');
    const teapotData = await response.json();

    // State variables
    let rotationSpeed = 1.0;
    let lightIntensity = 1.0;
    let tessellation = 20;
    let mouseX = 0;
    let mouseY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let rotationX = 0;
    let rotationY = 0;
    let zoom = -6.0;
    let wireframeMode = false;

    // Event listeners for controls
    document.getElementById('rotationSpeed').addEventListener('input', (e) => {
        rotationSpeed = parseFloat(e.target.value);
    });

    document.getElementById('lightIntensity').addEventListener('input', (e) => {
        lightIntensity = parseFloat(e.target.value);
    });

    document.getElementById('tessellation').addEventListener('input', (e) => {
        tessellation = parseInt(e.target.value);
        document.getElementById('tessellationValue').textContent = tessellation;
        generateTeapot();
    });

    document.getElementById('wireframeMode').addEventListener('change', (e) => {
        wireframeMode = e.target.checked;
        generateTeapot();
    });

    // Mouse event listeners
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            rotationY += deltaX * 0.01;
            rotationX += deltaY * 0.01;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
        zoom += e.deltaY * 0.01;
        zoom = Math.max(-10, Math.min(-2, zoom));
    });

    // Generate teapot geometry
    function generateTeapot() {
        const allVertices = [];
        const allNormals = [];
        const allIndices = [];
        let indexOffset = 0;

        teapotData.TeaSrfs.forEach(surface => {
            const { vertices, normals, indices } = generateBezierSurface(surface.control_points, tessellation, tessellation);
            allVertices.push(...vertices);
            allNormals.push(...normals);
            allIndices.push(...indices.map(i => i + indexOffset));
            indexOffset += vertices.length / 3;
        });

        // Calculate triangle count
        const triangleCount = allIndices.length / 3;
        document.getElementById('triangleCountValue').textContent = triangleCount.toLocaleString();

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

        return { positionBuffer, normalBuffer, indexBuffer, indexCount: allIndices.length };
    }

    let teapotBuffers = generateTeapot();

    // Initialize display values
    document.getElementById('tessellationValue').textContent = tessellation;

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
        mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, zoom]);
        mat4.rotate(modelViewMatrix, modelViewMatrix, rotationX, [1, 0, 0]);
        mat4.rotate(modelViewMatrix, modelViewMatrix, rotationY, [0, 1, 0]);
        mat4.rotate(modelViewMatrix, modelViewMatrix, Date.now() * 0.001 * rotationSpeed, [0, 1, 0]);

        // Tell WebGL how to pull out the positions from the position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.positionBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            3,
            gl.FLOAT,
            false,
            0,
            0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        // Tell WebGL how to pull out the normals from the normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, teapotBuffers.normalBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.normal,
            3,
            gl.FLOAT,
            false,
            0,
            0);
        gl.enableVertexAttribArray(programInfo.attribLocations.normal);

        // Tell WebGL which indices to use to index the vertices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotBuffers.indexBuffer);

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
        gl.uniform1f(
            programInfo.uniformLocations.lightIntensity,
            lightIntensity);
        gl.uniform1i(
            programInfo.uniformLocations.wireframeMode,
            wireframeMode ? 1 : 0);

        // Draw the elements
        gl.drawElements(gl.TRIANGLES, teapotBuffers.indexCount, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(drawScene);
    }

    drawScene();
}

main(); 