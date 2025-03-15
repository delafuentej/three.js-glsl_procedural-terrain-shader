
uniform  vec3 uColorWaterDeep;
uniform  vec3  uColorWaterSurface;
uniform  vec3 uColorSand;
uniform  vec3 uColorGrass;
uniform  vec3 uColorSnow;
uniform  vec3 uColorRock;

varying vec3 vPosition;
varying float vUpDot;

#include ../includes/simplexNoise2d.glsl

void main () {
    //Color
    vec3 color = vec3(1.0);

    //Water
    float surfaceWaterMix = smoothstep(-1.0, -0.1, vPosition.y);
    color = mix(uColorWaterDeep, uColorWaterSurface, surfaceWaterMix);
    //Sand
    float sandMix = step(-0.1, vPosition.y);
    color = mix(color, uColorSand, sandMix);
    //Grass
    float grassMix = step(-0.06, vPosition.y);
    color = mix(color, uColorGrass, grassMix);
    //Rock
    float rockMix = vUpDot;//it returns 1.0 when the face is oriented perfectly up// it returns 0.0 when it is oriented perfectly sideways
    rockMix = 1.0 - step(0.8, rockMix);//to become the opposite
    rockMix *= step(-0.06, vPosition.y);// to fix the visibility problem of the rock in the water
    color = mix(color, uColorRock, rockMix);
    //Snow
    float snowThreshold = 0.45;
    snowThreshold += simplexNoise2d(vPosition.xz * 15.0) * 0.1;
    float snowMix = step (snowThreshold, vPosition.y);
    color = mix(color, uColorSnow, snowMix);
  
    //Final color
    csm_DiffuseColor = vec4(color, 1.0);
   // csm_FragColor = vec4(vec3(vUpDot), 1.0);
}