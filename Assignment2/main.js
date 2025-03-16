
var canvas;
var gl;

var program;

var near = 1;
var far = 100;


var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;


var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0 );

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var cameraAngle = Math.PI/2;
var rotationSpeed = 1.0;


var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time. You could very easily make a higher level object that stores these as Position, Rotation (and also Scale!)
var sphereRotation = [0,0,0];
var spherePosition = [-4,0,0];

var cubeRotation = [0,0,0];
var cubePosition = [0,0,0];

var cylinderRotation = [0,0,0];
var cylinderPosition = [1.1,0,0];

var coneRotation = [0,0,0];
var conePosition = [3,0,0];

var legRotation = [0,0,0];
// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.5, 0.5, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true;
            resetTimerFlag = true;
            cameraAngle = Math.PI/2;
            window.requestAnimFrame(render);
        }
        //console.log(animFlag);
    };

    render(0);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result, x, y, and z are the translation amounts for each axis
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result, theta is the rotation amount, x, y, z are the components of an axis vector (angle, axis rotations!)
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result, x, y, and z are the scale amounts for each axis
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}





function render(timestamp) {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (animFlag) {
        cameraAngle += rotationSpeed * dt;
        cameraAngle %= (2 * Math.PI);
    }
    
    var radius = 30.0;
    eye = vec3(
        radius * Math.cos(cameraAngle),
        0,
        radius * Math.sin(cameraAngle)
    );
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at , up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    
    
    // set all the matrices
    setAllMatrices();
    
	if( animFlag )
    {
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is, the new position equals the current position + the rate of of change of that position (often a velocity or speed) times the change in time
		// We can do this with angles or positions, the whole x,y,z position, or just one dimension. It is up to us!
		dt = (timestamp - prevTime) / 2000;
		prevTime = timestamp;
	}
	
	// Platform
	gPush();
		gTranslate(cubePosition[0],-4,cubePosition[2]);
		gPush();
		{
			setColor(vec4(0.9,0.9,0.9,1.0));
			// cubeRotation[1] = cubeRotation[1] + 30*dt;
			// gRotate(cubeRotation[1],0,1,0);
            gScale(40.0, 0.1, 40.0);
			drawSphere();
		}
		gPop();
	gPop();

    // Flying thing
    gPush();
        gTranslate(0, 0, 5);
        // torso
        gPush(); 
        {
            setColor(vec4(0.0,1.0,0.0,1.0));
            gScale(1, 0.5, 0.5);
            drawCube();
        }
        gPop();


        // legs (4x)
        gPush();

            const minAngleThigh = -10; // Minimum angle (backward)
            const maxAngleThigh = 10;  // Maximum angle (forward)
            const amplitude_thigh = (maxAngleThigh - minAngleThigh) / 2; // Amplitude of the sine wave
            const offset_thigh = (maxAngleThigh + minAngleThigh) / 2;    // Offset to center the range
            
            const minAngleCalf = -50; // Minimum angle (backward)
            const maxAngleCalf = -19;  // Maximum angle (forward)
            const amplitude_calf = (maxAngleCalf - minAngleCalf) / 2; // Amplitude of the sine wave
            const offset_calf = (maxAngleCalf + minAngleCalf) / 2;    // Offset to center the range

            //gRotate(legRotation[1],0,1,0);
            legRotation1[2] = amplitude_thigh * (Math.sin(timestamp * 0.0008)) + offset_thigh;
            lower = (amplitude_calf) * (Math.sin(timestamp * 0.0008)) + (offset_calf);
            gRotate(legRotation1[2],0,0,1);

            // 1st leg

            gPush();
            {
                setColor(vec4(0.0,1.0,0.0,1.0));
                gTranslate(0.7, -0.05, 0.45);
                gTranslate(0, -0.6, 0); //pivot
                gScale(0.15, 0.3, 0.15);
                drawCube(); //thigh
                
            }
            gPop();

            gPush();
            {
                setColor(vec4(0.0,1.0,0.0,1.0));
                gTranslate(0.9, -0.6, 0.45);      
                gRotate(lower,0,0,1);  
                gTranslate(0, -0.7, 0);
                gScale(0.15,0.3,0.15);         
                drawCube(); // calf
                
                gPush();
                {
                    gTranslate(0.5, -1, 0);
                    //gRotate(3,1,0,0);
                    gScale(1.5,0.1,1);
                    drawCube(); // foot
                }
                gPop();                
            }
            gPop();

            // 2nd leg

            gPush();
            {
                setColor(vec4(0.0,1.0,0.0,1.0));
                gTranslate(-0.6, -0.05, 0.45);
                gTranslate(0, -0.6, 0); //pivot
                gScale(0.15, 0.3, 0.15);
                drawCube(); //thigh
                
            }
            gPop();

            gPush();
            {
                setColor(vec4(0.0,1.0,0.0,1.0));
                gTranslate(0.9, -0.6, 0.45);      
                gRotate(lower,0,0,1);  
                gTranslate(0, -0.7, 0);
                gScale(0.15,0.3,0.15);         
                drawCube(); // calf
                
                gPush();
                {
                    gTranslate(0.5, -1, 0);
                    //gRotate(3,1,0,0);
                    gScale(1.5,0.1,1);
                    drawCube(); // foot
                }
                gPop();                
            }
            gPop();

        gPop();

        //tail
        gPush();
        {
            setColor(vec4(0.0,1.0,0.0,1.0));
            gTranslate(-2, 0, 0);
            gScale(1, 0.3, 0.3);
            drawCube();

            gPush();
            {
                gTranslate(-2,0,0);
                gScale(1,0.7,0.7);
                drawCube();
            }
            gPop();
        }
        gPop();

        //head
        gPush();
        {
            setColor(vec4(0.0,1.0,0.0,1.0));
            gTranslate(1.7,0,0);
            gScale(0.7,0.4,0.4);
            drawCube();
        }
        gPop();



    // Castle

    // gPush();
    //     gTranslate(0, -1.9, 0);
    //     // Middle of Castle
    //     gPush();
    //     {
    //         setColor(vec4(1.0,0.0,0.0,1.0));
    //         gScale(1.5, 2, 1.5);
    //         drawCube();
    //     }
    //     gPop();

    //     // Towers (4x)
    //     gPush();
    //     {
    //         setColor(vec4(1.0,0.0,0.0,1.0));
    //         gTranslate(2, 0.5, 1.75);
    //         gRotate(90, 1,0,0);
    //         gScale(1.5, 1.5, 5);
    //         drawCylinder();
    //     }
    //     gPop();

    //     gPush();
    //     {
    //         setColor(vec4(1.0,0.0,0.0,1.0));
    //         gTranslate(-2, 0.5, 1.75);
    //         gRotate(90, 1,0,0);
    //         gScale(1.5, 1.5, 5);
    //         drawCylinder();
    //     }
    //     gPop();

    //     gPush();
    //     {
    //         setColor(vec4(1.0,0.0,0.0,1.0));
    //         gTranslate(-2, 0.5, -1.75);
    //         gRotate(90, 1,0,0);
    //         gScale(1.5, 1.5, 5);
    //         drawCylinder();
    //     }
    //     gPop();        
        
    //     gPush();
    //     {
    //         setColor(vec4(1.0,0.0,0.0,1.0));
    //         gTranslate(2, 0.5, -1.75);
    //         gRotate(90, 1,0,0);
    //         gScale(1.5, 1.5, 5);
    //         drawCylinder();
    //     }
    //     gPop();

    //     // Roof of Towers

    //     gPush();
    //     {
    //         setColor(vec4(1.0,0.0,0.0,1.0));
    //         gTranslate(2, 3.5, 1.75);
    //         gRotate(-90, 1,0,0);
    //         gScale(1, 1, 1.5);
    //         drawCone();
    //     }
    //     gPop();

    //     gPush();
    //     {
    //         setColor(vec4(1.0,0.0,0.0,1.0));
    //         gTranslate(-2, 3.5, 1.75);
    //         gRotate(-90, 1,0,0);
    //         gScale(1, 1, 1.5);
    //         drawCone();
    //     }
    //     gPop();

    //     gPush();
    //     {
    //         setColor(vec4(1.0,0.0,0.0,1.0));
    //         gTranslate(-2, 3.5, -1.75);
    //         gRotate(-90, 1,0,0);
    //         gScale(1, 1, 1.5);
    //         drawCone();
    //     }
    //     gPop();

    //     gPush();
    //     {
    //         setColor(vec4(1.0,0.0,0.0,1.0));
    //         gTranslate(2, 3.5, -1.75);
    //         gRotate(-90, 1,0,0);
    //         gScale(1, 1, 1.5);
    //         drawCone();
    //     }
    //     gPop();

    // gPop();
 



         
        

    gPop();
    if( animFlag )
        window.requestAnimFrame(render);
}