import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import {SUBTRACTION, Evaluator, Brush} from 'three-bvh-csg';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import terrainVertexShader from './shaders/terrain/vertex.glsl';
import terrainFragmentShader from './shaders/terrain/fragment.glsl';
import GUI from 'lil-gui';
/**
 * Procedural Terrain
 * 
 * 1.BOARD (three-bhv-csg: https://github.com/gkjohnson/three-bvh-csg). Bounding Volume Hierarchy(BVH)-(CGS)Constructive Solid Geometry. This enables
 *  boolean operations between geometries
 * -Brush: Each base shape that will be used. We need 2 Brushes: for the base shape & for the poke a hole
 * - To instantiate a Brush we need to sed it a three.js geometry
 * - Evaluator: to execute only one operation, but one Evaluator can be used for multiple operations
 * - Vertices information is separated into groups and the materials will be applied accordinly => board.geometry.groups, but it ism't useful
 * in our case, because we want one simple MeshStandardMaterial (We do not need multiple materials on the same Brush, on the same Mesh)
 *  Brush Transformations: inherits from Object3D and we can transform it using position, rotation, & scale
 * 
 * - TERRAIN- ELEVATION: We want to move the vertices up and down (on the y axis) to create the terrain elevation. The process(technique) is similar to the Raging Sea Project
 * 
 * - FIX THE NORMALS in vertex.glsl => APPLY NEIGHBOURS TECHNIQUE to compute the normals(updating the vertices of the normal):
 * - we need to find the position of the two neighbours A (x axis) & b (z axis). Both at the shift distance
 * Alfer calculatin csm_Normal in vertex.glsl, we are not using the original normal attribute animore. We can remove
 * the normal from the geometry attributes, i mean the uv => geometry.deleteAttribute('uv) // geometry.deleteAttribute('normal)
 * 
 * - ELEVATION FREQUENCY. We are going to play with the frequency elevation => uniforms => uPositionFrequency
 * - PLATEAUS. In real lihe we tend to see plateaus near the sea level. So we are going to crush the value down when elevation is near to 0.
 *     we are using pow() function => range from 0 to 1. So the elevation never goes above 1
 * -STRENGTH. We need higher mountains & higher depth for the water => uniforms : uStrength
 * -WARP. To add more diversity by warping the position. Creation vec3 warpedPosition
 * - TRANSLATION. We are going to make the terrain move continously by applyint the time on the warpedPosition
 * - FIX SHADOW  WITH  depthMaterial => terrain.customDepthMaterial = depthMaterial;
 * - COLOR: We are going to add various colors according the elevation from -1 to +1. fragment.glsl file
 * We are going to need 6 colors:
 *          - water deep: #002b3b
 *          - water surface: #66a8ff
 *          - sand: #ffe894
 *          - grass: #85d534
 *          - snow:  #ffffff
 *          - rock: #bfbd8d
 * In fragment.glsl we want to use the color according to the elevation. Instead of just sending the elevation, we are going
 * to send the whole csm_Position
 * RockColor:  instead of sending the whole normal to the fragment, we are going to calculate the dot product in the vertex.glsl
 * and only send the result to the fragment shader => varying float vUpDot
 * 
 * 
 *  
 * 
/**
 * Base
 */
// Debug
const gui = new GUI({ width: 325 });
const debugObject = {};


// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

// Loaders
const rgbeLoader = new RGBELoader();

/**
 * Environment map
 */
rgbeLoader.load('/spruit_sunrise.hdr', (environmentMap) =>
{
    environmentMap.mapping = THREE.EquirectangularReflectionMapping

    scene.background = environmentMap
    scene.backgroundBlurriness = 0.5
    scene.environment = environmentMap
});

/**
 * Terrain
 */
//Geometry
const geometry = new THREE.PlaneGeometry(10,10, 500, 500);
geometry.deleteAttribute('uv');
geometry.deleteAttribute('normal'); 
geometry.rotateX( - Math.PI * 0.5);// to rotate the all geometry

//Material

debugObject.colorWaterDeep = '#002b3b';
debugObject.colorWaterSurface = '#66a8ff';
debugObject.colorSand = '#ffe894';
debugObject.colorGrass = '#85d534';
debugObject.colorSnow = '#ffffff';
debugObject.colorRock = '#bfbd8d';




const uniforms = {
    uTime: new THREE.Uniform(0),
    uPositionFrequency: new THREE.Uniform(0.2),
    uStrength: new THREE.Uniform(2.0),
    uWarpFrequency: new THREE.Uniform(5.0),
    uWarpStrength: new THREE.Uniform(0.5),
    //colors
    uColorWaterDeep: new THREE.Uniform(new THREE.Color(debugObject.colorWaterDeep)),
    uColorWaterSurface: new THREE.Uniform(new THREE.Color(debugObject.colorWaterSurface)),
    uColorSand: new THREE.Uniform(new THREE.Color(debugObject.colorSand)),
    uColorGrass: new THREE.Uniform(new THREE.Color(debugObject.colorGrass)),
    uColorSnow: new THREE.Uniform(new THREE.Color(debugObject.colorSnow)),
    uColorRock: new THREE.Uniform(new THREE.Color(debugObject.colorRock))
};

gui.add(uniforms.uPositionFrequency, 'value', 0, 1, 0.001).name('uPositionFrequency');
gui.add(uniforms.uStrength, 'value', 0, 10, 0.001).name('uStrength');
gui.add(uniforms.uWarpFrequency, 'value', 0, 10, 0.001).name('uWarpFrequency');
gui.add(uniforms.uWarpStrength, 'value', 0, 1, 0.001).name('uWarpStrength');

//gui color
gui.addColor(debugObject, 'colorWaterDeep').onChange(() => { uniforms.uColorWaterDeep.value.set(debugObject.colorWaterDeep) });
gui.addColor(debugObject, 'colorWaterSurface').onChange(() => { uniforms.uColorWaterSurface.value.set(debugObject.colorWaterSurface) });
gui.addColor(debugObject, 'colorSand').onChange(() => { uniforms.uColorSand.value.set(debugObject.colorSand) });
gui.addColor(debugObject, 'colorGrass').onChange(() => { uniforms.uColorGrass.value.set(debugObject.colorGrass) });
gui.addColor(debugObject, 'colorSnow').onChange(() => { uniforms.uColorSnow.value.set(debugObject.colorSnow) });
gui.addColor(debugObject, 'colorRock').onChange(() => { uniforms.uColorRock.value.set(debugObject.colorRock) });

const material = new CustomShaderMaterial({
        //Custom Shader Material
        baseMaterial: THREE.MeshStandardMaterial,
        vertexShader: terrainVertexShader,
        fragmentShader: terrainFragmentShader,
        uniforms: uniforms,
        silent: true,

        //MeshStandardMaterial:
        metalness: 0,
        roughness: 0.5,
        color: '#85d534'
});

const depthMaterial = new CustomShaderMaterial({
    //Custom Shader Material
    baseMaterial: THREE.MeshDepthMaterial,
    vertexShader: terrainVertexShader,
    uniforms: uniforms,
    silent: true,

    //MeshDepthMaterial:
    depthPacking: THREE.RGBADepthPacking
});

const terrain = new THREE.Mesh(geometry, material);
//to fix the shadows problem:
terrain.customDepthMaterial = depthMaterial;
terrain.castShadow = true;
terrain.receiveShadow = true;

scene.add(terrain);


/**
 * Water
 */
const water = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10, 1, 1),
    new THREE.MeshPhysicalMaterial({
        transmission: 1,
        roughness: 0.3
    })
);
water.rotation.x = - Math.PI * 0.5;
water.position.y = -0.1;
scene.add(water);
/**
 * Board
 */
const boardFill = new Brush(new THREE.BoxGeometry(11, 2, 11));
const boardHole = new Brush(new THREE.BoxGeometry(10, 2.1, 10));
// boardHole.position.y =  0.5;
// boardHole.updateMatrixWorld();
//Evaluate
const evaluator = new Evaluator();

const board = evaluator.evaluate(boardFill, boardHole, SUBTRACTION);

// to remove the groups :
board.geometry.clearGroups();
// to add only a material on the same Mesh
board.material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    metalness: 0,
    roughness: 0.6
})
// at this point  board is like a Mesh: MeshBasicMaterial

// Shadows
board.castShadow = true;
board.receiveShadow = true;
scene.add(board)
/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 2);
directionalLight.position.set(6.25, 3, 4);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 30;
directionalLight.shadow.camera.top = 8;
directionalLight.shadow.camera.right = 8;
directionalLight.shadow.camera.bottom = -8;
directionalLight.shadow.camera.left = -8;
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
};

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
camera.position.set(-10, 6, -2);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime();

    //update uTime
    uniforms.uTime.value = elapsedTime;

    // Update controls
    controls.update();

    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}

tick();