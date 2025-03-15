uniform float uTime;
uniform float uPositionFrequency;
uniform float uStrength;
uniform float uWarpFrequency;
uniform float uWarpStrength;

varying vec3 vPosition;
varying float vUpDot;


#include ../includes/simplexNoise2d.glsl

//vec2 as input because the elevation only varies according to x & z axes
float getElevation(vec2 position){


    vec2 warpedPosition = position;
    //tanslation:
    warpedPosition += uTime * 0.2;
    warpedPosition += simplexNoise2d(warpedPosition * uPositionFrequency * uWarpFrequency) * uWarpStrength;

    float elevation = 0.0;



   // elevation += simplexNoise2d(position * uPositionFrequency) / 2.0;//
   elevation += simplexNoise2d(warpedPosition * uPositionFrequency) / 2.0;//
    // to create variations we are going to appy more simplexNoise2d function on the elevation:(this values must never reach the value of 1, too the value above)
    //elevation += simplexNoise2d(position * uPositionFrequency * 2.0)/ 4.0;
       elevation += simplexNoise2d(warpedPosition * uPositionFrequency * 2.0)/ 4.0;
    //elevation += simplexNoise2d(position * uPositionFrequency * 4.0) / 8.0;
     elevation += simplexNoise2d(warpedPosition * uPositionFrequency * 4.0) / 8.0;

    float elevationSign = sign(elevation);// when the value is negative the result -1;  when it is positive +1
    // we need negative values for the sea

    //plateus
    elevation = pow(abs(elevation), 2.0) * elevationSign;
    //strength for mountains & water
    elevation *= uStrength;

    return elevation;
}

void main () {
    // Base Position- Note *** position = csm_Position 
    float shift = 0.01;
    vec3 positionA = position.xyz + vec3(shift, 0.0, 0.0);
    vec3 positionB = position.xyz + vec3(0.0, 0.0, - shift);

    //Elevation
    float elevation = getElevation(csm_Position.xz);
    csm_Position.y += elevation;
        // updating the neighbours according to the elevation
    positionA.y += getElevation(positionA.xz);
    positionB.y += getElevation(positionB.xz);

    // Compute normal: Calculation neighbours directions (destinaton - origin)
    vec3 toA = normalize(positionA - csm_Position);
    vec3 toB = normalize(positionB - csm_Position);

    csm_Normal = cross(toA, toB);

    

    //Varyings
    vPosition = csm_Position;
    //updating the position of the vertices that we send to the fragment with animation
    vPosition.xz += uTime * 0.2;
    vUpDot = dot(csm_Normal, vec3(0.0, 1.0, 0.0));

}