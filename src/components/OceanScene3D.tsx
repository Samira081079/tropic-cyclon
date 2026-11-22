import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { evaluateWaveHeight } from '../engine/simulation';
import {
  CameraPreset,
  CycloneState,
  GamePhase,
  Hemisphere,
  ShipState,
  WeatherTelemetry,
} from '../types/game';

export interface SceneLiveBridge {
  ship: ShipState;
  cyclone: CycloneState;
  telemetry: WeatherTelemetry;
  portPos: { x: number; z: number };
  hemisphere: Hemisphere;
  cameraPreset: CameraPreset;
  phase: GamePhase;
  elapsedSec: number;
}

interface OceanScene3DProps {
  liveBridgeRef: React.MutableRefObject<SceneLiveBridge>;
  onThunderFlash?: () => void;
}

// 1 NM in simulation = 2.0 3D scene units
const WORLD_UNIT_PER_NM = 2.0;

// Pre-allocated scratch objects (zero GC inside animation loop)
const _tmpColorA = new THREE.Color();
const _tmpColorB = new THREE.Color();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3();
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Procedural multi-part cargo/research vessel (11 distinct PBR components).
 * Oriented along -Z forward when rotation.y = 0 (matching heading 0° = North/-Z).
 */
function buildProceduralVessel(): {
  group: THREE.Group;
  radarBar: THREE.Mesh;
  wakePoints: THREE.Points;
  wakePositions: Float32Array;
} {
  const shipGroup = new THREE.Group();

  // 1. Main steel hull using extruded 2D deck silhouette (bow at -Z, stern at +Z)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 8.2); // Bow tip (+Y in 2D shape -> maps to -Z after rotateX)
  hullShape.quadraticCurveTo(1.75, 5.2, 1.85, 1.8);
  hullShape.lineTo(1.85, -6.2);
  hullShape.quadraticCurveTo(1.7, -7.2, 1.15, -7.4);
  hullShape.lineTo(-1.15, -7.4);
  hullShape.quadraticCurveTo(-1.7, -7.2, -1.85, -6.2);
  hullShape.lineTo(-1.85, 1.8);
  hullShape.quadraticCurveTo(-1.75, 5.2, 0, 8.2);

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 1.85,
    bevelEnabled: true,
    bevelThickness: 0.25,
    bevelSize: 0.16,
    bevelSegments: 2,
  });
  hullGeo.rotateX(-Math.PI / 2);
  hullGeo.translate(0, -0.75, 0);

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x10233a,
    roughness: 0.42,
    metalness: 0.35,
  });
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  shipGroup.add(hullMesh);

  // 2. Red anti-fouling lower boot-top belt
  const keelGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.72,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.1,
    bevelSegments: 1,
  });
  keelGeo.rotateX(-Math.PI / 2);
  keelGeo.scale(0.985, 1, 0.99);
  keelGeo.translate(0, -1.05, 0);
  const keelMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.62,
    metalness: 0.15,
  });
  const keelMesh = new THREE.Mesh(keelGeo, keelMat);
  shipGroup.add(keelMesh);

  // 3. Main weather deck
  const deckGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.14,
    bevelEnabled: false,
  });
  deckGeo.rotateX(-Math.PI / 2);
  deckGeo.scale(0.93, 1, 0.96);
  deckGeo.translate(0, 1.24, 0);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x2f4358,
    roughness: 0.78,
    metalness: 0.12,
  });
  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.receiveShadow = true;
  shipGroup.add(deckMesh);

  // 4. Raised forecastle bow bulwark
  const bowBulwarkGeo = new THREE.BoxGeometry(2.1, 0.52, 2.6);
  const whiteTrimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.36,
    metalness: 0.18,
  });
  const bowDeck = new THREE.Mesh(bowBulwarkGeo, whiteTrimMat);
  bowDeck.position.set(0, 1.5, -4.6);
  bowDeck.castShadow = true;
  shipGroup.add(bowDeck);

  // 5. Cargo containers on foredeck (varied roughness & maritime colors)
  const containerColors = [0x0284c7, 0xd97706, 0x0d9488, 0xc2410c, 0x1d4ed8, 0x475569];
  const containerGeo = new THREE.BoxGeometry(1.12, 0.88, 2.35);
  for (let i = 0; i < 6; i++) {
    const col = i % 2 === 0 ? -0.64 : 0.64;
    const row = Math.floor(i / 2);
    const cMat = new THREE.MeshStandardMaterial({
      color: containerColors[i],
      roughness: 0.58 + (i % 2) * 0.18,
      metalness: 0.25,
    });
    const cMesh = new THREE.Mesh(containerGeo, cMat);
    cMesh.position.set(col, 1.78 + (row === 1 ? 0.25 : 0), -1.8 + row * 2.55);
    cMesh.castShadow = true;
    cMesh.receiveShadow = true;
    shipGroup.add(cMesh);
  }

  // 6. Superstructure / Bridge Tower
  const superBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 1.9, 2.7),
    whiteTrimMat,
  );
  superBase.position.set(0, 2.25, 4.35);
  superBase.castShadow = true;
  superBase.receiveShadow = true;
  shipGroup.add(superBase);

  // 7. Bridge Wing Deck (wide observation deck)
  const bridgeWing = new THREE.Mesh(
    new THREE.BoxGeometry(3.75, 0.72, 1.55),
    whiteTrimMat,
  );
  bridgeWing.position.set(0, 3.48, 4.05);
  bridgeWing.castShadow = true;
  shipGroup.add(bridgeWing);

  // 8. Dark tinted bridge windows
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x082f49,
    roughness: 0.12,
    metalness: 0.85,
  });
  const windowBand = new THREE.Mesh(
    new THREE.BoxGeometry(3.45, 0.36, 1.6),
    glassMat,
  );
  windowBand.position.set(0, 3.52, 4.0);
  shipGroup.add(windowBand);

  // 9. Funnel / Smokestack
  const funnelMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    metalness: 0.45,
  });
  const funnel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.56, 1.65, 14),
    funnelMat,
  );
  funnel.position.set(0, 3.35, 5.75);
  funnel.castShadow = true;
  shipGroup.add(funnel);

  const funnelBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.48, 0.36, 14),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 }),
  );
  funnelBand.position.set(0, 3.75, 5.75);
  shipGroup.add(funnelBand);

  // 10. Radar Mast & Rotating Scanner Bar
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.14, 1.9, 8),
    whiteTrimMat,
  );
  mast.position.set(0, 4.65, 4.15);
  shipGroup.add(mast);

  const radarBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.1, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    }),
  );
  radarBar.position.set(0, 5.55, 4.15);
  shipGroup.add(radarBar);

  // 11. Port (Red) & Starboard (Green) navigation lights
  const portLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 }),
  );
  portLight.position.set(-1.86, 3.5, 3.9);
  shipGroup.add(portLight);

  const stbdLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x10b981 }),
  );
  stbdLight.position.set(1.86, 3.5, 3.9);
  shipGroup.add(stbdLight);

  // 12. Wake foam particle ribbon behind stern
  const wakeCount = 90;
  const wakePositions = new Float32Array(wakeCount * 3);
  for (let i = 0; i < wakeCount; i++) {
    const t = i / wakeCount;
    wakePositions[i * 3] = (Math.random() - 0.5) * (1.2 + t * 3.5);
    wakePositions[i * 3 + 1] = 0.08;
    wakePositions[i * 3 + 2] = 7.4 + t * 22;
  }
  const wakeGeo = new THREE.BufferGeometry();
  wakeGeo.setAttribute('position', new THREE.BufferAttribute(wakePositions, 3));
  const wakeMat = new THREE.PointsMaterial({
    color: 0xe2e8f0,
    size: 0.85,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const wakePoints = new THREE.Points(wakeGeo, wakeMat);
  shipGroup.add(wakePoints);

  return { group: shipGroup, radarBar, wakePoints, wakePositions };
}

/**
 * Procedural Lighthouse & Harbour Breakwater Island at destination port
 */
function buildPortLighthouse(): THREE.Group {
  const group = new THREE.Group();

  const rockGeo = new THREE.CylinderGeometry(7.5, 11.5, 3.2, 12);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.92,
    metalness: 0.05,
  });
  const island = new THREE.Mesh(rockGeo, rockMat);
  island.position.y = 0.2;
  island.receiveShadow = true;
  group.add(island);

  const towerBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 2.0, 11, 16),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
  );
  towerBase.position.y = 6.5;
  towerBase.castShadow = true;
  group.add(towerBase);

  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(1.52, 1.72, 3.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 }),
  );
  stripe.position.y = 7.2;
  group.add(stripe);

  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 1.6, 12),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
  );
  lantern.position.y = 12.6;
  group.add(lantern);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.55, 1.4, 12),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }),
  );
  roof.position.y = 14.0;
  group.add(roof);

  return group;
}

export const OceanScene3D: React.FC<OceanScene3DProps> = ({
  liveBridgeRef,
  onThunderFlash,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      onContextRestored,
    );

    const scene = new THREE.Scene();
    const skyColorCalm = new THREE.Color(0x163859);
    const skyColorStorm = new THREE.Color(0x060d17);
    scene.background = skyColorCalm.clone();
    const sceneFog = new THREE.FogExp2(0x163859, 0.0022);
    scene.fog = sceneFog;

    // Mandatory studio environment reflection for metallic/glass realism
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      55,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.5,
      1400,
    );
    camera.position.set(0, 14, 34);
    _currentLookAt.set(0, 2, 0);

    // Three-point warm/cool atmospheric lighting rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0c2338, 0.95);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4d6, 2.1);
    sunLight.position.set(80, 110, 60);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 260;
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rimLight.position.set(-70, 40, -90);
    scene.add(rimLight);

    const lightningLight = new THREE.PointLight(0xe0f2fe, 0, 500, 1.2);
    scene.add(lightningLight);

    // Dynamic 3D Ocean Surface with synchronized Gerstner/multi-sine shader
    const oceanGeo = new THREE.PlaneGeometry(460, 460, 116, 116);
    oceanGeo.rotateX(-Math.PI / 2);

    const oceanUniforms = {
      uTime: { value: 0 },
      uWaveAmp: { value: 1.0 },
      uStormFactor: { value: 0 },
      uOceanOrigin: { value: new THREE.Vector2(0, 0) },
    };

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0b3b5c,
      roughness: 0.22,
      metalness: 0.14,
      envMapIntensity: 1.15,
    });

    oceanMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = oceanUniforms.uTime;
      shader.uniforms.uWaveAmp = oceanUniforms.uWaveAmp;
      shader.uniforms.uStormFactor = oceanUniforms.uStormFactor;
      shader.uniforms.uOceanOrigin = oceanUniforms.uOceanOrigin;

      shader.vertexShader =
        `
        uniform float uTime;
        uniform float uWaveAmp;
        uniform vec2 uOceanOrigin;
        varying float vWaveHeight;
        varying float vSlope;

        float calcWave(vec2 xz, float t, float amp) {
          float s = max(0.25, amp);
          float w1 = sin(xz.x * 0.11 + xz.y * 0.07 + t * 1.45) * 0.48;
          float w2 = sin(xz.x * -0.08 + xz.y * 0.14 + t * 1.95) * 0.30;
          float w3 = sin(xz.x * 0.21 + xz.y * -0.17 + t * 2.65) * 0.14;
          float w4 = cos(xz.x * 0.31 + xz.y * 0.28 - t * 3.10) * 0.08;
          return (w1 + w2 + w3 + w4) * s;
        }
        ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `
        #include <beginnormal_vertex>
        vec2 wPosN = position.xz + uOceanOrigin;
        float eps = 0.65;
        float hC = calcWave(wPosN, uTime, uWaveAmp);
        float hX = calcWave(wPosN + vec2(eps, 0.0), uTime, uWaveAmp);
        float hZ = calcWave(wPosN + vec2(0.0, eps), uTime, uWaveAmp);
        vec3 waveNorm = normalize(vec3(hC - hX, eps, hC - hZ));
        objectNormal = waveNorm;
        vSlope = length(vec2(hC - hX, hC - hZ)) / eps;
        `,
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec2 wPosV = position.xz + uOceanOrigin;
        float wH = calcWave(wPosV, uTime, uWaveAmp);
        transformed.y += wH;
        vWaveHeight = wH;
        `,
      );

      shader.fragmentShader =
        `
        uniform float uStormFactor;
        uniform float uWaveAmp;
        varying float vWaveHeight;
        varying float vSlope;
        ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        vec3 calmTrough = vec3(0.02, 0.11, 0.22);
        vec3 calmCrest = vec3(0.05, 0.32, 0.45);
        vec3 stormTrough = vec3(0.015, 0.05, 0.09);
        vec3 stormCrest = vec3(0.08, 0.17, 0.23);

        float heightNorm = clamp((vWaveHeight / max(0.8, uWaveAmp)) * 0.5 + 0.5, 0.0, 1.0);
        vec3 troughCol = mix(calmTrough, stormTrough, uStormFactor);
        vec3 crestCol = mix(calmCrest, stormCrest, uStormFactor);
        vec3 waterCol = mix(troughCol, crestCol, heightNorm);

        float foamThreshold = mix(0.95, 0.32, uStormFactor);
        float foam = smoothstep(foamThreshold, foamThreshold + 0.32, heightNorm * 0.65 + vSlope * 0.72);
        waterCol = mix(waterCol, vec3(0.86, 0.91, 0.96), foam * (0.45 + 0.55 * uStormFactor));
        diffuseColor.rgb = waterCol;
        `,
      );
    };

    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.receiveShadow = true;
    scene.add(oceanMesh);

    // Procedural Vessel
    const vessel = buildProceduralVessel();
    scene.add(vessel.group);

    // Port Lighthouse
    const portGroup = buildPortLighthouse();
    scene.add(portGroup);

    // Cyclone Spiral Cloud Wall (InstancedMesh: 180 dark storm cloud puffs)
    const spiralCloudCount = 180;
    const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
    const spiralCloudMat = new THREE.MeshStandardMaterial({
      color: 0x263447,
      roughness: 0.95,
      metalness: 0.02,
      transparent: true,
      opacity: 0.88,
    });
    const spiralClouds = new THREE.InstancedMesh(
      cloudGeo,
      spiralCloudMat,
      spiralCloudCount,
    );
    spiralClouds.frustumCulled = false;

    const spiralMeta: Array<{
      arm: number;
      radius: number;
      angleOffset: number;
      height: number;
      scaleXZ: number;
      scaleY: number;
    }> = [];

    for (let i = 0; i < spiralCloudCount; i++) {
      const arm = i % 3;
      const t = Math.floor(i / 3) / (spiralCloudCount / 3);
      const radius = 16 + t * 92;
      const angleOffset = (arm * Math.PI * 2) / 3 + t * 3.4;
      spiralMeta.push({
        arm,
        radius,
        angleOffset,
        height: 18 + t * 14 + Math.sin(i * 1.7) * 4,
        scaleXZ: 11 + t * 14,
        scaleY: 5.5 + (1 - t) * 5.2,
      });
    }
    scene.add(spiralClouds);

    // Overhead Storm Overcast Clouds (fade in around ship as cloudDensity increases)
    const skyCloudCount = 46;
    const skyCloudMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.96,
      metalness: 0.0,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const skyClouds = new THREE.InstancedMesh(
      cloudGeo,
      skyCloudMat,
      skyCloudCount,
    );
    skyClouds.frustumCulled = false;
    const skyCloudOffsets: Array<{
      ox: number;
      oy: number;
      oz: number;
      sx: number;
      sy: number;
    }> = [];
    for (let i = 0; i < skyCloudCount; i++) {
      const a = (i / skyCloudCount) * Math.PI * 2 + (i % 5) * 0.4;
      const r = 18 + (i % 7) * 19;
      skyCloudOffsets.push({
        ox: Math.cos(a) * r,
        oy: 24 + (i % 4) * 4.5,
        oz: Math.sin(a) * r,
        sx: 16 + (i % 5) * 5,
        sy: 4.5 + (i % 3) * 1.5,
      });
    }
    scene.add(skyClouds);

    // 3D Rain Streaks around ship/camera
    const rainCount = 650;
    const rainPositions = new Float32Array(rainCount * 6);
    const rainOffsets = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainOffsets[i * 3] = (Math.random() - 0.5) * 95;
      rainOffsets[i * 3 + 1] = Math.random() * 42;
      rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * 95;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(rainPositions, 3),
    );
    const rainMat = new THREE.LineBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const rainLines = new THREE.LineSegments(rainGeo, rainMat);
    rainLines.frustumCulled = false;
    scene.add(rainLines);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let lightningTimer = 3.5;
    let lightningIntensity = 0;
    let cameraInitialized = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      const now = performance.now();
      const dt = Math.min(0.08, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const bridge = liveBridgeRef.current;
      const { ship, cyclone, telemetry, portPos, hemisphere, cameraPreset, elapsedSec } =
        bridge;

      const shipWX = ship.x * WORLD_UNIT_PER_NM;
      const shipWZ = ship.z * WORLD_UNIT_PER_NM;
      const cycWX = cyclone.x * WORLD_UNIT_PER_NM;
      const cycWZ = cyclone.z * WORLD_UNIT_PER_NM;

      // Wave amplitude scales cleanly with waveHeightM (1.2m -> ~0.75, 14m -> ~4.8)
      const waveAmp = 0.45 + telemetry.waveHeightM * 0.3;

      // Snap ocean grid to 4-unit steps around ship to avoid vertex swimming
      const snap = 4.0;
      const oceanOX = Math.round(shipWX / snap) * snap;
      const oceanOZ = Math.round(shipWZ / snap) * snap;
      oceanMesh.position.set(oceanOX, 0, oceanOZ);
      oceanUniforms.uTime.value = elapsedSec;
      oceanUniforms.uWaveAmp.value = waveAmp;
      oceanUniforms.uStormFactor.value = telemetry.stormFactor;
      oceanUniforms.uOceanOrigin.value.set(oceanOX, oceanOZ);

      // Update vessel position & 4-point wave buoyancy
      const headingRad = THREE.MathUtils.degToRad(ship.headingDeg);
      const fwdX = Math.sin(headingRad);
      const fwdZ = -Math.cos(headingRad);
      const rightX = Math.cos(headingRad);
      const rightZ = Math.sin(headingRad);

      const hBow = evaluateWaveHeight(
        shipWX + fwdX * 6.5,
        shipWZ + fwdZ * 6.5,
        elapsedSec,
        waveAmp,
      );
      const hStern = evaluateWaveHeight(
        shipWX - fwdX * 6.5,
        shipWZ - fwdZ * 6.5,
        elapsedSec,
        waveAmp,
      );
      const hPort = evaluateWaveHeight(
        shipWX - rightX * 2.2,
        shipWZ - rightZ * 2.2,
        elapsedSec,
        waveAmp,
      );
      const hStbd = evaluateWaveHeight(
        shipWX + rightX * 2.2,
        shipWZ + rightZ * 2.2,
        elapsedSec,
        waveAmp,
      );

      const targetHeave =
        (hBow + hStern + hPort + hStbd) * 0.25 - ship.sinkingProgress * 3.8;
      const targetPitch = Math.atan2(hBow - hStern, 13.0);
      const targetRoll =
        Math.atan2(hPort - hStbd, 4.4) + ship.sinkingProgress * 0.58;

      ship.heaveY = THREE.MathUtils.damp(ship.heaveY, targetHeave, 6.5, dt);
      ship.pitchRad = THREE.MathUtils.damp(ship.pitchRad, targetPitch, 5.5, dt);
      ship.rollRad = THREE.MathUtils.damp(ship.rollRad, targetRoll, 5.5, dt);

      vessel.group.position.set(shipWX, ship.heaveY, shipWZ);
      // Order YXZ: yaw heading first, then pitch bow up/down, then roll port/starboard
      vessel.group.rotation.order = 'YXZ';
      vessel.group.rotation.y = -headingRad;
      vessel.group.rotation.x = ship.pitchRad;
      vessel.group.rotation.z = ship.rollRad;

      // Rotate ship radar bar & animate wake particles
      vessel.radarBar.rotation.y += dt * 3.4;
      const wakeOpacity = Math.min(0.65, 0.1 + (ship.speedKnots / 22) * 0.55);
      (vessel.wakePoints.material as THREE.PointsMaterial).opacity =
        ship.sinkingProgress > 0.5 ? 0.1 : wakeOpacity;
      const wp = vessel.wakePositions;
      for (let i = 0; i < wp.length / 3; i++) {
        wp[i * 3 + 2] += dt * (4 + ship.speedKnots * 0.65);
        if (wp[i * 3 + 2] > 28) {
          wp[i * 3] = (Math.random() - 0.5) * 1.4;
          wp[i * 3 + 2] = 7.4;
        }
      }
      vessel.wakePoints.geometry.attributes.position.needsUpdate = true;

      // Port lighthouse placement
      portGroup.position.set(
        portPos.x * WORLD_UNIT_PER_NM,
        0,
        portPos.z * WORLD_UNIT_PER_NM,
      );

      // Update atmosphere, sky, fog, and sun intensity smoothly
      _tmpColorA.copy(skyColorCalm).lerp(skyColorStorm, telemetry.stormFactor);
      if (scene.background instanceof THREE.Color) {
        scene.background.copy(_tmpColorA);
      }
      sceneFog.color.copy(_tmpColorA);
      sceneFog.density = THREE.MathUtils.lerp(0.002, 0.0115, telemetry.stormFactor);

      // Lightning inside heavy storm
      if (telemetry.stormFactor > 0.52) {
        lightningTimer -= dt;
        if (lightningTimer <= 0) {
          lightningTimer = 2.6 + Math.random() * 5.0;
          lightningIntensity = 4.2 + telemetry.stormFactor * 4.5;
          onThunderFlash?.();
        }
      }
      lightningIntensity = THREE.MathUtils.damp(lightningIntensity, 0, 7.5, dt);
      lightningLight.intensity = lightningIntensity;
      lightningLight.position.set(
        shipWX + (Math.random() - 0.5) * 35,
        42,
        shipWZ - 25,
      );

      sunLight.position.set(shipWX + 80, 110, shipWZ + 60);
      sunLight.target.position.set(shipWX, 0, shipWZ);
      sunLight.intensity =
        THREE.MathUtils.lerp(2.2, 0.45, telemetry.stormFactor) +
        lightningIntensity * 0.25;
      hemiLight.intensity =
        THREE.MathUtils.lerp(1.0, 0.42, telemetry.stormFactor) +
        lightningIntensity * 0.15;

      // Update swirling 3D Tropical Cyclone cloud wall around cyclone eye
      const spinDir = hemisphere === 'north' ? 1 : -1;
      const spinSpeed = 0.22 + (cyclone.maxWindKnots / 150) * 0.18;
      _tmpColorB.setHex(0x334155).lerp(
        _tmpColorA.setHex(0x0f172a),
        telemetry.stormFactor * 0.65,
      );
      spiralCloudMat.color.copy(_tmpColorB);

      for (let i = 0; i < spiralCloudCount; i++) {
        const m = spiralMeta[i];
        const ang = m.angleOffset + elapsedSec * spinSpeed * spinDir;
        const r = m.radius * (cyclone.radiusNM / 60);
        _dummyPos.set(
          cycWX + Math.cos(ang) * r,
          m.height,
          cycWZ + Math.sin(ang) * r,
        );
        _dummyQuat.setFromAxisAngle(
          THREE.Object3D.DEFAULT_UP,
          -ang + Math.PI * 0.5,
        );
        _dummyScale.set(m.scaleXZ, m.scaleY, m.scaleXZ * 0.72);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        spiralClouds.setMatrixAt(i, _dummyMatrix);
      }
      spiralClouds.instanceMatrix.needsUpdate = true;

      // Update overhead clouds around ship
      skyCloudMat.opacity = Math.min(0.82, telemetry.cloudDensity * 0.85);
      for (let i = 0; i < skyCloudCount; i++) {
        const sc = skyCloudOffsets[i];
        _dummyPos.set(
          shipWX + sc.ox + Math.sin(elapsedSec * 0.2 + i) * 3,
          sc.oy,
          shipWZ + sc.oz + Math.cos(elapsedSec * 0.18 + i) * 3,
        );
        _dummyQuat.identity();
        _dummyScale.set(
          sc.sx * (0.4 + telemetry.cloudDensity * 0.7),
          sc.sy,
          sc.sx * 0.85,
        );
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        skyClouds.setMatrixAt(i, _dummyMatrix);
      }
      skyClouds.instanceMatrix.needsUpdate = true;

      // Update 3D Rain streaks slanted by wind
      rainMat.opacity = telemetry.rainIntensity * 0.58;
      if (telemetry.rainIntensity > 0.04) {
        const windBlowToRad = THREE.MathUtils.degToRad(
          telemetry.windFromDeg + 180,
        );
        const slantX = Math.sin(windBlowToRad) * (0.8 + telemetry.windKnots * 0.025);
        const slantZ = -Math.cos(windBlowToRad) * (0.8 + telemetry.windKnots * 0.025);
        const fallSpeed = 42 + telemetry.rainIntensity * 28;
        const rArr = rainPositions;

        for (let i = 0; i < rainCount; i++) {
          rainOffsets[i * 3 + 1] -= dt * fallSpeed;
          rainOffsets[i * 3] += slantX * dt * 10;
          rainOffsets[i * 3 + 2] += slantZ * dt * 10;

          if (rainOffsets[i * 3 + 1] < 0) {
            rainOffsets[i * 3] = (Math.random() - 0.5) * 90;
            rainOffsets[i * 3 + 1] = 38 + Math.random() * 6;
            rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * 90;
          }

          const rx = shipWX + rainOffsets[i * 3];
          const ry = rainOffsets[i * 3 + 1];
          const rz = shipWZ + rainOffsets[i * 3 + 2];

          rArr[i * 6] = rx;
          rArr[i * 6 + 1] = ry;
          rArr[i * 6 + 2] = rz;
          rArr[i * 6 + 3] = rx - slantX * 0.65;
          rArr[i * 6 + 4] = ry + 1.9;
          rArr[i * 6 + 5] = rz - slantZ * 0.65;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      // Camera choreography (Chase, Bridge 1st-person, Aerial Tactical)
      if (cameraPreset === 'bridge') {
        _targetCamPos.set(
          shipWX - fwdX * 3.4,
          ship.heaveY + 4.4,
          shipWZ - fwdZ * 3.4,
        );
        _targetLookAt.set(
          shipWX + fwdX * 38,
          ship.heaveY + 2.0 + Math.sin(ship.pitchRad) * 20,
          shipWZ + fwdZ * 38,
        );
      } else if (cameraPreset === 'aerial') {
        _targetCamPos.set(
          shipWX - fwdX * 32 + rightX * 14,
          38,
          shipWZ - fwdZ * 32 + rightZ * 14,
        );
        _targetLookAt.set(shipWX + fwdX * 14, 1.5, shipWZ + fwdZ * 14);
      } else {
        // Default Chase view: frames ship and distant cyclone horizon
        _targetCamPos.set(
          shipWX - fwdX * 22 + rightX * 7.5,
          10.5 + waveAmp * 0.85,
          shipWZ - fwdZ * 22 + rightZ * 7.5,
        );
        _targetLookAt.set(shipWX + fwdX * 12, 2.2, shipWZ + fwdZ * 12);
      }

      if (!cameraInitialized) {
        camera.position.copy(_targetCamPos);
        _currentLookAt.copy(_targetLookAt);
        cameraInitialized = true;
      } else {
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _targetCamPos.x,
          5.0,
          dt,
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _targetCamPos.y,
          5.0,
          dt,
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _targetCamPos.z,
          5.0,
          dt,
        );
        _currentLookAt.x = THREE.MathUtils.damp(
          _currentLookAt.x,
          _targetLookAt.x,
          6.0,
          dt,
        );
        _currentLookAt.y = THREE.MathUtils.damp(
          _currentLookAt.y,
          _targetLookAt.y,
          6.0,
          dt,
        );
        _currentLookAt.z = THREE.MathUtils.damp(
          _currentLookAt.z,
          _targetLookAt.z,
          6.0,
          dt,
        );
      }
      camera.lookAt(_currentLookAt);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        onContextRestored,
      );

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [liveBridgeRef, onThunderFlash]);

  return (
    <div className="relative w-full h-full bg-[#07111E]">
      <div ref={mountRef} className="w-full h-full" />
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#07111E]/95 text-slate-200 p-6 text-center z-20">
          <div className="max-w-md space-y-2">
            <h2 className="font-display text-xl font-semibold text-white">
              3D Qrafik Konteksti Bərpa Olunur
            </h2>
            <p className="text-sm text-slate-400">
              WebGL görüntüsü müvəqqəti dayandırıldı. Taktiki radar və naviqasiya
              sistemi işləməyə davam edir.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
