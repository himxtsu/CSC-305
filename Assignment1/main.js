
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

var astroHeadRotation = [0,-30,0];
var astroHeadPosition = [0,1.55,0];

var astroVisorRotation = [0,-30,0];
var astroVisorPosition = [0,0,1];

var astroTorsoRotation = [0,-35,0];
var astroTorsoPosition = [0,0,0];

var l_armRotation = [0,-40,35];
var l_armPosition = [1.2,0.6,0];

var r_armRotation = [0,-35,-35];
var r_armPosition = [-0.8,0.6,-0.9];

var legRotation = [0,-40,0];

var jellyHeadRotation = [0,0,0];
var jellyTentaclePosition = [0,0,0];

var num_stars = 50;
var star_Positions = [];
var star_Size = [];
var starBuffer;

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
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    
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
            window.requestAnimFrame(render);
        }
        //console.log(animFlag);
    };
        //create stars
        make_star();
        initStars();
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
    
    eye = vec3(0,0,10);
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
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
	}   
    
        let star_move = dt * 0.8;
        drawStars(star_move);

	// ASTRONAUT
	gPush();
		// Oscillate the torso's position using sine function
        let oscillationSpeed = 0.0008; // Adjust the speed of oscillation
        let oscillationRangeX = 1; // Adjust the range of oscillation in the x direction
        let oscillationRangeY = 1; // Adjust the range of oscillation in the y direction
        let oscillationX = Math.sin(prevTime * oscillationSpeed) * oscillationRangeX;
        let oscillationY = Math.sin(prevTime * oscillationSpeed) * oscillationRangeY;
    
        gTranslate(oscillationX,oscillationY,astroTorsoPosition[2]); // Translates whole astronaut
		
        // torso
        gPush();
		{
			
            setColor(vec4(1.0,1.0,1.0,1.0));
			astroTorsoRotation[1] = astroTorsoRotation[1]
			gRotate(astroTorsoRotation[1],0,1,0);
            gScale(0.7,1.1,0.3)
			drawCube();     

		}
        gPop();

        // Emblems
        gPush();
        {
            gPush();
            {
                setColor(vec4(0.0,0.0,1.0,1.0));
                gTranslate(-0.5,0.8,1);
                gRotate(-35, 0, 1, 0); // Blue Badge
                gScale(0.2,0.2,0.05);
                drawSphere();                
            }
            gPop();
            
            gPush();
            {
                setColor(vec4(0.0,0.0,1.0,1.0));
                gTranslate(0,0.2,1);
                gRotate(-35,0,1,0); // Blue Button left
                gScale(0.15,0.15,0.2);
                drawSphere();
            }
            gPop();

            gPush();
            {
                setColor(vec4(0.0,0.0,1.0,1.0));
                gTranslate(-0.4,0.2,1);
                gRotate(-35,0,1,0); // Blue Button right
                gScale(0.15,0.15,0.2);
                drawSphere();
            }
            gPop();

            gPush();
            {
                setColor(vec4(0.78,0.64,0.78,1.0));
                gTranslate(0.1,-0.1,1);
                gRotate(-35,0,1,0); // Pink Button left
                gScale(0.15,0.15,0.2);
                drawSphere();
            }
            gPop();

            gPush();
            {
                setColor(vec4(0.78,0.64,0.78,1.0));
                gTranslate(-0.5,-0.1,1);
                gRotate(-35,0,1,0); // Pink Button right
                gScale(0.15,0.15,0.2);
                drawSphere();
            }
            gPop();

            gPush();
            {
                setColor(vec4(0.78,0.43,0.0,1.0));
                gTranslate(-0.4,-0.4,1);
                gRotate(-35,0,1,0); // Orange Button right
                gScale(0.15,0.15,0.2);
                drawSphere();
            }
            gPop();

            gPush();
            {
                setColor(vec4(0.78,0.43,0.0,1.0));
                gTranslate(0,-0.4,1);
                gRotate(-35,0,1,0); // Orange Button right
                gScale(0.15,0.15,0.2);
                drawSphere();
            }
            gPop();

        }
        gPop();

        // head + visor
        gPush();
        {
            setColor(vec4(1.0,1.0,1.0,1.0));
            gTranslate(astroHeadPosition[0],astroHeadPosition[1],astroHeadPosition[2]);
            gRotate(astroHeadRotation[1],0,1,0);
            gScale(0.6,0.5,0.4);         
            drawSphere();
                
            gPush();
            {
                gTranslate(astroVisorPosition[0],astroVisorPosition[1],astroVisorPosition[2]);
                setColor(vec4(1.0,0.64,0.0,1.0));
                gScale(0.9,0.8,0.6);         
                drawSphere();
            }
            gPop();
        }
		gPop();
        
        // left_arm
        gPush();
        {
            setColor(vec4(1.0,1.0,1.0,1.0));
            gTranslate(l_armPosition[0],l_armPosition[1],l_armPosition[2]);
            gRotate(l_armRotation[1],0,1,0);
            gRotate(l_armRotation[2],0,0,1);
            l_armRotation[2] = 10 * (Math.sin(timestamp * (oscillationSpeed))) + 15;
            gRotate(l_armRotation[2],0,0,1);
            gTranslate(0, -0.4, 0.5);
            gScale(0.15,0.6,0.15);         
			drawCube();
        }
        gPop();

        // right_arm
        gPush();
        {
            setColor(vec4(1.0,1.0,1.0,1.0));
            gTranslate(r_armPosition[0],r_armPosition[1],r_armPosition[2]);
            gRotate(r_armRotation[1],0,1,0);
            gRotate(r_armRotation[2],0,0,1);
            r_armRotation[2] = -10 * (Math.sin(timestamp * oscillationSpeed + Math.PI)) - 15;
            gRotate(r_armRotation[2],0,0,1);
            gTranslate(0, -0.4, 0);
            gScale(0.15,0.6,0.15);         
            drawCube();
        }
        gPop();

        // right_leg
        gPush();
        {
            const minAngleThigh = 0; // Minimum angle (backward)
            const maxAngleThigh = 10;  // Maximum angle (forward)
            const amplitude_thigh = (maxAngleThigh - minAngleThigh) / 2; // Amplitude of the sine wave
            const offset_thigh = (maxAngleThigh + minAngleThigh) / 2;    // Offset to center the range
            
            const minAngleCalf = 20; // Minimum angle (backward)
            const maxAngleCalf = 40;  // Maximum angle (forward)
            const amplitude_calf = (maxAngleCalf - minAngleCalf) / 2; // Amplitude of the sine wave
            const offset_calf = (maxAngleCalf + minAngleCalf) / 2;    // Offset to center the range
            
            gRotate(legRotation[1],0,1,0);
            legRotation[0] = amplitude_thigh * (Math.sin(timestamp * oscillationSpeed)) + offset_thigh;
            lower = (amplitude_calf) * (Math.sin(timestamp * oscillationSpeed)) + (offset_calf);
            gRotate(legRotation[0],1,0,0);
            
            
            gPush();
            {
                setColor(vec4(1.0,1.0,1.0,1.0));
                gTranslate(-0.5,-1.1,0);
                gTranslate(0, -0.6, 0); //pivot            
                gScale(0.18,0.6,0.18);         
                drawCube(); // thigh
            }
            gPop();

            gPush();
            {
                setColor(vec4(1.0,1.0,1.0,1.0));
                gTranslate(-0.5,-2.3,0.3);      
                gRotate(lower,1,0,0);  
                gTranslate(0, -0.7, -0.3);
                gScale(0.18,0.6,0.18);         
                drawCube(); // calf
                
                gPush();
                {
                    gTranslate(0, -1, 0.4);
                    gRotate(3,1,0,0);
                    gScale(1,0.1,1.5);
                    drawCube(); // foot
                }
                gPop();                
            }
            gPop();
        }
        gPop();

        // left_leg
        gPush();
        {
            const minAngleThigh = 0; // Minimum angle (backward)
            const maxAngleThigh = 10;  // Maximum angle (forward)
            const amplitude_thigh = (maxAngleThigh - minAngleThigh) / 2; // Amplitude of the sine wave
            const offset_thigh = (maxAngleThigh + minAngleThigh) / 2;    // Offset to center the range
            
            const minAngleCalf = 20; // Minimum angle (backward)
            const maxAngleCalf = 40;  // Maximum angle (forward)
            const amplitude_calf = (maxAngleCalf - minAngleCalf) / 2; // Amplitude of the sine wave
            const offset_calf = (maxAngleCalf + minAngleCalf) / 2;    // Offset to center the range
            
            gRotate(legRotation[1],0,1,0);
            legRotation[0] = amplitude_thigh * (Math.sin(timestamp * oscillationSpeed + Math.PI)) + offset_thigh;
            lower = (amplitude_calf) * (Math.sin(timestamp * oscillationSpeed + Math.PI)) + (offset_calf);
            gRotate(legRotation[0],1,0,0);
            
            
            gPush();
            {
                setColor(vec4(1.0,1.0,1.0,1.0));
                gTranslate(0.5,-1.1,0.2);
                gTranslate(0, -0.6, 0); //pivot            
                gScale(0.18,0.6,0.18);         
                drawCube(); // thigh
            }
            gPop();

            gPush();
            {
                setColor(vec4(1.0,1.0,1.0,1.0));
                gTranslate(0.5,-2.3,0.3);      
                gRotate(lower,1,0,0);  
                gTranslate(0, -0.6, -0.1);
                gScale(0.18,0.6,0.18);         
                drawCube(); // calf
                
                gPush();
                {
                    gTranslate(0, -1, 0.4);
                    gRotate(3,1,0,0);
                    gScale(1,0.1,1.5);
                    drawCube(); // foot
                }
                gPop();                
            }
            gPop();
        }
        gPop();        
      

	gPop(); 
    
    // JELLYFISH THING
    gPush();
    {
        jellyHeadRotation[1] = jellyHeadRotation[1] + 35*dt
        gRotate(jellyHeadRotation[1],0,1,0);
        //head
        gPush();
        {
            setColor(vec4(1.0,0.3,0.5,1.0));
            gTranslate(0,1.5,0);
            gTranslate(4,0,0);
            gScale(1,1,0.4);
            drawSphere();
            
            // body
            gTranslate(0,0,1);
            gScale(-0.7,-0.7,-0.7);
            drawSphere();
        }
        gPop();

        // tentacles
        gPush();
        {
            const min1 = -20; // Minimum angle (backward)
            const max1= 20;  // Maximum angle (forward)
            const amplitude1 = (max1 - min1) / 2; // Amplitude of the sine wave

            const min2 = -50; // Minimum angle (backward)
            const max2 = 50;  // Maximum angle (forward)
            const amplitude2 = (max2 - min2) / 2; // Amplitude of the sine wave

            const min3 = -60;
            const max3 = 60;
            const amplitude3 = (max3 - min3) / 2;

            const min4 = -70;
            const max4 = 70;
            const amplitude4= (max4 - min4) / 2;            

            sausage1 = amplitude1 * (Math.sin(timestamp * (oscillationSpeed) + 2.5 * dt));
            sausage2 = amplitude2 * (Math.sin(timestamp * (oscillationSpeed) + 2 * dt));
            sausage3 = amplitude3 * (Math.sin(timestamp * (oscillationSpeed) + 1.5 * dt));
            sausage4 = amplitude4 * (Math.sin(timestamp * (oscillationSpeed) + 1 * dt));

            gTranslate(4,0,0);
            
            //1st tentacle
            jellyTentaclePosition[1] = 2.2
            gPush();
            {
                gPush();
                {
                    
                    setColor(vec4(1.0,1.0,0.0,1.0));
                    gTranslate(0,jellyTentaclePosition[1],0.65);
                    gScale(0.13,0.13,0.25);
                    drawSphere();
    
                }
                gPop();
    
                //2nd
                gPush();
                {
                    
                    gTranslate(0,jellyTentaclePosition[1],0.75);
                    gRotate(sausage1,1,0,0);
                    gTranslate(0,0,0.4);
                    gScale(0.13,0.13,0.25);
                    drawSphere();

                }
                gPop();
    
                //3rd
                gPush();
                {
                    
                    gTranslate(0,jellyTentaclePosition[1],1.17);
                    gRotate(sausage2,1,0,0);
                    gTranslate(0,0,0.5);
                    gScale(0.13,0.13,0.25);
                    drawSphere();

                }
                gPop();
    
                //4th
                gPush();
                {
                    
                    gTranslate(0,jellyTentaclePosition[1],1.35);
                    gRotate(sausage3,1,0,0);
                    gTranslate(0,0,0.85);
                    gScale(0.13,0.13,0.25);
                    drawSphere();
    
                }
                gPop();
    
                //5th
                gPush();
                {
                    
                    gTranslate(0,jellyTentaclePosition[1],1.55);
                    gRotate(sausage4,1,0,0);
                    gTranslate(0,0,1.2);
                    gScale(0.13,0.13,0.25);
                    drawSphere();

                }
                gPop();   
            }         
            gPop();

            // 2nd tentacle
            jellyTentaclePosition[1] = 1.5
            gPush();
            {
                gPush();
                {
                    
                    setColor(vec4(1.0,1.0,0.0,1.0));
                    gTranslate(0,jellyTentaclePosition[1],0.65);
                    gScale(0.13,0.13,0.25);
                    drawSphere();
    
                }
                gPop();
    
                //2nd
                gPush();
                {
                    
                    gTranslate(0,jellyTentaclePosition[1],0.75);
                    gRotate(sausage1,1,0,0);
                    gTranslate(0,0,0.4);
                    gScale(0.13,0.13,0.25);
                    drawSphere();

                }
                gPop();
    
                //3rd
                gPush();
                {
                    
                    gTranslate(0,jellyTentaclePosition[1],1.17);
                    gRotate(sausage2,1,0,0);
                    gTranslate(0,0,0.5);
                    gScale(0.13,0.13,0.25);
                    drawSphere();

                }
                gPop();
    
                //4th
                gPush();
                {
                    
                    gTranslate(0,jellyTentaclePosition[1],1.35);
                    gRotate(sausage3,1,0,0);
                    gTranslate(0,0,0.85);
                    gScale(0.13,0.13,0.25);
                    drawSphere();
    
                }
                gPop();
    
                //5th
                gPush();
                {
                    
                    gTranslate(0,jellyTentaclePosition[1],1.55);
                    gRotate(sausage4,1,0,0);
                    gTranslate(0,0,1.2);
                    gScale(0.13,0.13,0.25);
                    drawSphere();

                }
                gPop();   
            }
            gPop();

            // 3rd tentacle
            jellyTentaclePosition[1] = 0.8
            gPush();
            {
                gPush();
                {
                    
                    setColor(vec4(1.0,1.0,0.0,1.0));
                    gTranslate(0,jellyTentaclePosition[1],0.65);
                    gScale(0.13,0.13,0.25);
                    drawSphere();
    
                }
                gPop();
    
                //2nd
                gPush();
                {
                    
                    gTranslate(0,jellyTentaclePosition[1],0.75);
                    gRotate(sausage1,1,0,0);
                    gTranslate(0,0,0.4);
                    gScale(0.13,0.13,0.25);
                    drawSphere();

                }
                gPop();
    
                //3rd
                gPush();
                {
                    
                    gTranslate(0,jellyTentaclePosition[1],1.17);
                    gRotate(sausage2,1,0,0);
                    gTranslate(0,0,0.5);
                    gScale(0.13,0.13,0.25);
                    drawSphere();

                }
                gPop();
    
                //4th
                gPush();
                {
                    
                    gTranslate(0,jellyTentaclePosition[1],1.35);
                    gRotate(sausage3,1,0,0);
                    gTranslate(0,0,0.85);
                    gScale(0.13,0.13,0.25);
                    drawSphere();
    
                }
                gPop();
    
                //5th
                gPush();
                {
                   
                    gTranslate(0,jellyTentaclePosition[1],1.55);
                    gRotate(sausage4,1,0,0);
                    gTranslate(0,0,1.2);
                    gScale(0.13,0.13,0.25);
                    drawSphere();

                }
                gPop();   
            }
            gPop();

        }
        gPop();
    }
    gPop();

   

gPop(); 
    
    if( animFlag )
        window.requestAnimFrame(render);
}

function make_star() {
    for (let i = 0; i < num_stars; i++) {
        let x = (Math.random() - 0.5) * 12;
        let y = (Math.random() - 0.5) * 12;
        let z = -Math.random() * 10 - 5; // Push stars back so it doesn't interfere with jelly
        star_Positions.push(vec3(x, y, z));

		let s = 0.03 + Math.random() * (0.09 - 0.03); 
		star_Size.push(s)
    }
}
// Initializing stars..
function initStars() {
    starBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(star_Positions), gl.STATIC_DRAW);
}

// create stars
function drawStars(movement) {
    setColor(vec4(1, 1, 1, 1));
    
    for (let i = 0; i < num_stars; i++) {
        gPush();
        
        // Update star position
        star_Positions[i][0] = star_Positions[i][0] + movement;
        star_Positions[i][1] = star_Positions[i][1] + movement;

        // Checks the star in the x-axis is out of bounds
        if (star_Positions[i][0] > right) {
            
            // Reset star position based on world space
            star_Positions[i][0] = star_Positions[i][0] - 12; // Bounds the star

        } 

        // Checks the star in the y-axis is out of bounds
        if (star_Positions[i][1] > 6) {
            
            star_Positions[i][1] = star_Positions[i][1] - 12;
		}
        
        // Making little spheres as stars
        gTranslate(star_Positions[i][0], star_Positions[i][1], star_Positions[i][2]);
        gScale(star_Size[i], star_Size[i], star_Size[i]);
        drawSphere();
        
        gPop();
    }
}