I have implemented all elements of the animation in my code!!!

Astronaut:
I seperated each part of the astronaut (torso, arms, etc) in to their own. I made a universal variable for the astronaut so that
all parts within it can be oscillated the same range.
All parts are rotated the same angle as well as the emblems.
Arms and legs use Math.sin for oscilatting within specific angles and used Math.PI to alternate the motions.
Arm used the z-axis and the legs used the x-axis for the pivot

The challenging part of the astronaut were the legs as when I tried to implement them, the calfs were being scaled as they were
being rotated. Eventually figured it out and set a universal rotate within the leg segment then added another rotate inside the
calf's gPush(). Then the feet were nested in the calfs to be in sync with their rotation!

Each emblem and head/helmet parts are drawn with drawSphere() and each astronaut body part is drawn with drawCube()

Jellyfish:
The head and the body are made seperately from the tentacles.
Using the y-axis as the pivot, i made a universal variable within the jellyfish segment so that all parts can rotate, 
making them orbit around the astronaut.
I offset each part using the x-axis so I can visually see how far it is initially from the astronaut.

The tentacles were pretty challenging to implement as they had to link as best as possible while. The way I implemented them was
each "sausage" (is what I called each segment of the tentacle) had their own amplitude so it can make the wave illusion while each
of their speed is also offset by a bit. Once I made one tentacle, I just copied and pasted it two more times for a total of three
tentacles as intended. 

Stars:
Now this was hard to get my head around. I made three helper functions for the stars, one to make the stars (different little 
spheres stored in an array), one to initialize them, and one that created the stars and draw in to the world (using the data
stored from making the stars). 

The last function called drawStars made sure that whenever a star goes out of bounds it resets its position based on the world
space (x and y axis). 



This assignment was difficult but learned a lot about transformations and practiced ordering each one to how I intended.