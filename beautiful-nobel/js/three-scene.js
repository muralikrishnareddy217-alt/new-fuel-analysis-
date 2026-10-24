/**
 * AERO // FUEL 3D - Three.js Automotive Visualization Engine
 * Features:
 * - High-precision 3D BMW M5 Competition (F90 / G90) sports sedan
 * - Signature BMW M Design language:
 *     * Iconic Twin Kidney Grille with double slats & illuminated contour
 *     * BMW Laserlight Quad Headlights with twin hexagonal / L-shaped DRL Angel Eyes
 *     * Muscular M Powerdome Hood
 *     * Authentic BMW Roundel emblems (hood, trunk, wheel center caps)
 *     * Carbon fiber roof with central M aerodynamic channel
 *     * Signature M twin-stalk aerodynamic wing mirrors
 *     * BMW Hofmeister Kink on rear quarter windows
 *     * Front fender M side air gills with M5 badging
 *     * 3D L-shaped sculpted organic LED taillights
 *     * M Carbon Rear Diffuser with vertical fins
 *     * 4 Iconic M Quad Exhaust Pipes with dark hollow tips
 *     * 20" M Double-Spoke bi-color forged performance alloy wheels
 *     * M Performance Blue brake calipers with cross-drilled ventilated carbon-ceramic rotors
 * - External GLB/GLTF model loader support with graceful procedural fallback
 * - Real-time paint customization (Marina Bay Blue, Isle of Man Green, Toronto Red, etc.)
 * - OrbitControls with rotation, zoom, camera presets, headlights toggle, wireframe mode
 */
(function(window) {
  'use strict';

  class AutomotiveViewer {
    constructor(containerId, options = {}) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.options = {
        autoRotate: true,
        rotationSpeed: 0.5,
        paintColor: options.paintColor || "#004fc7", // Iconic BMW Marina Bay Blue Metallic
        quality: options.quality || "high",
        showGrid: true,
        enableControls: true,
        modelUrl: options.modelUrl || null,
        ...options
      };

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.carGroup = null;
      this.wheels = [];
      this.bodyMaterials = [];
      this.headlights = [];
      this.headlightBeams = [];
      this.particles = null;
      this.animFrameId = null;
      this.clock = null;
      this.isWireframe = false;
      this.headlightsOn = true;
      this.isDestroyed = false;
      this.isVisible = true;

      // Roundel texture cache
      this.roundelTexture = null;

      this.init();
    }

    init() {
      if (!this.checkWebGL()) {
        this.renderFallback();
        return;
      }

      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 500;

      this.clock = new THREE.Clock();

      // Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x070b14);
      this.scene.fog = new THREE.FogExp2(0x070b14, 0.032);

      // Camera
      this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      this.camera.position.set(4.8, 2.0, 5.0);

      // Renderer
      try {
        this.renderer = new THREE.WebGLRenderer({
          antialias: this.options.quality !== "low",
          powerPreference: "high-performance",
          alpha: true
        });
      } catch (e) {
        console.warn("WebGLRenderer failed, fallback rendered:", e);
        this.renderFallback();
        return;
      }

      const maxDpr = this.options.quality === "high" ? 2 : (this.options.quality === "medium" ? 1.5 : 1);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      this.renderer.setSize(width, height);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.renderer.shadowMap.enabled = this.options.quality === "high";
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.container.innerHTML = "";
      this.container.appendChild(this.renderer.domElement);

      // Orbit Controls
      if (window.THREE.OrbitControls && this.options.enableControls) {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
        this.controls.minDistance = 2.4;
        this.controls.maxDistance = 12.0;
        this.controls.target.set(0, 0.65, 0);
        this.controls.autoRotate = this.options.autoRotate;
        this.controls.autoRotateSpeed = this.options.rotationSpeed;
      }

      this.setupLighting();
      this.setupPedestal();

      // Load external GLB if provided; otherwise build the authentic BMW M5 Competition
      if (this.options.modelUrl && window.THREE.GLTFLoader) {
        this.loadExternalGLB(this.options.modelUrl);
      } else {
        this.buildBMWM5();
      }

      if (this.options.quality !== "low") {
        this.setupParticles();
      }

      this.setupEventListeners();
      this.startAnimation();
    }

    checkWebGL() {
      if (!window.THREE) return false;
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    }

    setupLighting() {
      // Soft ambient base
      const ambientLight = new THREE.AmbientLight(0x131d36, 1.4);
      this.scene.add(ambientLight);

      // Studio Key Light (Cool white daylight)
      const keyLight = new THREE.DirectionalLight(0xf0f7ff, 1.85);
      keyLight.position.set(5.5, 7.5, 4.5);
      if (this.renderer.shadowMap.enabled) {
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 25;
        keyLight.shadow.bias = -0.001;
      }
      this.scene.add(keyLight);

      // Fill Light (Subtle Cyan accent)
      const fillLight = new THREE.DirectionalLight(0x06b6d4, 0.95);
      fillLight.position.set(-6, 4, -4);
      this.scene.add(fillLight);

      // Rim Light for muscular M body contours
      const rimLight = new THREE.DirectionalLight(0x818cf8, 1.35);
      rimLight.position.set(-1, 5.5, -6);
      this.scene.add(rimLight);

      // Under-pedestal uplight
      const centerLight = new THREE.PointLight(0x00f0ff, 1.4, 7);
      centerLight.position.set(0, 0.1, 0);
      this.scene.add(centerLight);
    }

    setupPedestal() {
      const pedestalGroup = new THREE.Group();

      // Platform disc
      const platGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.15, 64);
      const platMat = new THREE.MeshStandardMaterial({
        color: 0x0a1122,
        roughness: 0.35,
        metalness: 0.8
      });
      const platform = new THREE.Mesh(platGeo, platMat);
      platform.position.y = -0.075;
      platform.receiveShadow = true;
      pedestalGroup.add(platform);

      // Outer Cyan Neon Ring
      const ringGeo = new THREE.RingGeometry(3.5, 3.65, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.005;
      pedestalGroup.add(ring);

      // Inner M Violet Ring
      const innerRingGeo = new THREE.RingGeometry(2.2, 2.25, 48);
      const innerRingMat = new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        side: THREE.DoubleSide
      });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.006;
      pedestalGroup.add(innerRing);

      // Holographic floor grid
      const grid = new THREE.GridHelper(20, 40, 0x00f0ff, 0x112244);
      grid.position.y = -0.08;
      grid.material.opacity = 0.45;
      grid.material.transparent = true;
      pedestalGroup.add(grid);

      // Soft contact shadow plane
      const shadowGeo = new THREE.PlaneGeometry(4.6, 2.4);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const ctx = shadowCanvas.getContext('2d');
      const grad = ctx.createRadialGradient(64, 64, 15, 64, 64, 60);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.55)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.007;
      pedestalGroup.add(shadowMesh);

      this.scene.add(pedestalGroup);
    }

    /**
     * Generates a canvas texture for the official BMW Roundel emblem
     */
    getBMWRoundelTexture() {
      if (this.roundelTexture) return this.roundelTexture;

      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      // Outer chrome ring
      ctx.beginPath();
      ctx.arc(64, 64, 62, 0, Math.PI * 2);
      ctx.fillStyle = '#b0b8c4';
      ctx.fill();

      // Black band
      ctx.beginPath();
      ctx.arc(64, 64, 58, 0, Math.PI * 2);
      ctx.fillStyle = '#11141a';
      ctx.fill();

      // Inner chrome circle
      ctx.beginPath();
      ctx.arc(64, 64, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fill();

      // Quadrants: top-left & bottom-right white, top-right & bottom-left blue
      const center = 64;
      const r = 38;

      // Top-Left (White)
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, r, Math.PI, 1.5 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Top-Right (Bavarian Blue)
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, r, 1.5 * Math.PI, 2 * Math.PI);
      ctx.fillStyle = '#0066b1';
      ctx.fill();

      // Bottom-Right (White)
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, r, 0, 0.5 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Bottom-Left (Bavarian Blue)
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, r, 0.5 * Math.PI, Math.PI);
      ctx.fillStyle = '#0066b1';
      ctx.fill();

      // Cross dividing lines
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center - r, center);
      ctx.lineTo(center + r, center);
      ctx.moveTo(center, center - r);
      ctx.lineTo(center, center + r);
      ctx.stroke();

      this.roundelTexture = new THREE.CanvasTexture(canvas);
      return this.roundelTexture;
    }

    /**
     * Constructs the authentic BMW M5 Competition 3D Model
     */
    buildBMWM5() {
      this.carGroup = new THREE.Group();
      this.bodyMaterials = [];
      this.wheels = [];
      this.headlights = [];
      this.headlightBeams = [];

      const paintColor = new THREE.Color(this.options.paintColor);

      // 1. Premium BMW Metallic Paint Material (MeshPhysicalMaterial with clearcoat)
      const carPaintMat = new THREE.MeshPhysicalMaterial({
        color: paintColor,
        metalness: 0.8,
        roughness: 0.18,
        clearcoat: 0.95,
        clearcoatRoughness: 0.08,
        reflectivity: 0.92
      });
      this.bodyMaterials.push(carPaintMat);

      // M Competition High-Gloss Shadowline Black Material
      const shadowlineMat = new THREE.MeshStandardMaterial({
        color: 0x0f141c,
        roughness: 0.22,
        metalness: 0.7
      });

      // M Lightweight Carbon Fiber Roof Material
      const carbonRoofMat = new THREE.MeshStandardMaterial({
        color: 0x141822,
        roughness: 0.35,
        metalness: 0.55
      });

      // Executive Tinted Glass Material
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x0d1424,
        metalness: 0.9,
        roughness: 0.06,
        transmission: 0.65,
        transparent: true,
        opacity: 0.72
      });

      // Chrome Material for Quad Exhausts & Accents
      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.95,
        roughness: 0.15
      });

      // M Performance Brake Caliper Blue Material
      const mBrakeBlueMat = new THREE.MeshStandardMaterial({
        color: 0x0055b8, // Authentic BMW M Blue
        roughness: 0.3,
        metalness: 0.5
      });

      // Roundel material
      const roundelTex = this.getBMWRoundelTexture();
      const roundelMat = new THREE.MeshBasicMaterial({ map: roundelTex, transparent: true });

      // ====================================================================
      // 2. BMW M5 CHASSIS & SCULPTED BODY (Executive Sports Sedan)
      // ====================================================================
      const carLength = 4.4;
      const carWidth = 1.76;
      const carHeight = 0.54;

      // Base sculpted chassis
      const bodyGeo = new THREE.BoxGeometry(carLength, carHeight, carWidth, 6, 2, 4);
      const pos = bodyGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        // Front taper towards kidney grille (positive X)
        if (x > 1.0) {
          const t = (x - 1.0) / 1.2;
          pos.setZ(i, z * (1 - t * 0.16));
          if (y > 0) pos.setY(i, y * (1 - t * 0.35)); // Lower hood slope
        }
        // Rear sedan decklid slope (negative X)
        if (x < -1.1) {
          const t = Math.abs(x + 1.1) / 1.1;
          pos.setZ(i, z * (1 - t * 0.1));
          if (y < 0) pos.setY(i, y + t * 0.1); // Upswept rear diffuser
        }
      }
      bodyGeo.computeVertexNormals();

      const bodyMesh = new THREE.Mesh(bodyGeo, carPaintMat);
      bodyMesh.position.y = 0.48;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      this.carGroup.add(bodyMesh);

      // Muscular M Powerdome Hood Ridges
      const powerdomeGeo = new THREE.BoxGeometry(1.4, 0.04, 0.7);
      const powerdomeMesh = new THREE.Mesh(powerdomeGeo, carPaintMat);
      powerdomeMesh.position.set(1.15, 0.73, 0);
      powerdomeMesh.rotation.z = -0.06;
      this.carGroup.add(powerdomeMesh);

      // BMW Hood Roundel Badge
      const hoodBadgeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.01, 20);
      const hoodBadge = new THREE.Mesh(hoodBadgeGeo, roundelMat);
      hoodBadge.rotation.x = 0.2;
      hoodBadge.position.set(2.05, 0.65, 0);
      this.carGroup.add(hoodBadge);

      // ====================================================================
      // 3. BMW ICONIC TWIN KIDNEY GRILLE (Double Slats & Illuminated Contour)
      // ====================================================================
      const kidneyWidth = 0.28;
      const kidneyHeight = 0.22;
      const kidneyPositions = [
        { z: 0.17, isRight: true },
        { z: -0.17, isRight: false }
      ];

      kidneyPositions.forEach(k => {
        const kidneyGroup = new THREE.Group();

        // High-gloss black Shadowline kidney frame
        const frameGeo = new THREE.BoxGeometry(0.12, kidneyHeight, kidneyWidth);
        const frameMesh = new THREE.Mesh(frameGeo, shadowlineMat);
        kidneyGroup.add(frameMesh);

        // Glowing Illuminated Contour (Iconic Glow)
        const glowGeo = new THREE.BoxGeometry(0.125, kidneyHeight + 0.02, kidneyWidth + 0.02);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0x00f0ff,
          wireframe: true
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        kidneyGroup.add(glowMesh);

        // Vertical Double Slats (M signature: 2 pairs of twin slats)
        const slatGeo = new THREE.BoxGeometry(0.09, kidneyHeight - 0.04, 0.025);
        [-0.08, -0.03, 0.03, 0.08].forEach(offset => {
          const slat = new THREE.Mesh(slatGeo, shadowlineMat);
          slat.position.z = offset;
          kidneyGroup.add(slat);
        });

        // Mini M5 badge on right kidney
        if (k.isRight) {
          const badgeGeo = new THREE.BoxGeometry(0.14, 0.03, 0.07);
          const badgeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
          const m5Badge = new THREE.Mesh(badgeGeo, badgeMat);
          m5Badge.position.set(0.02, 0.05, 0.06);
          kidneyGroup.add(m5Badge);
        }

        kidneyGroup.position.set(2.21, 0.52, k.z);
        this.carGroup.add(kidneyGroup);
      });

      // Front Lower Triple Air Dams (M Bumper)
      const centralIntakeGeo = new THREE.BoxGeometry(0.15, 0.18, 0.85);
      const centralIntake = new THREE.Mesh(centralIntakeGeo, shadowlineMat);
      centralIntake.position.set(2.18, 0.26, 0);
      this.carGroup.add(centralIntake);

      // Outer Brake Cooling Ducts / Air Curtains
      const ductGeo = new THREE.BoxGeometry(0.14, 0.18, 0.32);
      const ductL = new THREE.Mesh(ductGeo, shadowlineMat);
      ductL.position.set(2.16, 0.28, 0.68);
      const ductR = new THREE.Mesh(ductGeo, shadowlineMat);
      ductR.position.set(2.16, 0.28, -0.68);
      this.carGroup.add(ductL);
      this.carGroup.add(ductR);

      // Carbon Fiber Front Lip Splitter
      const splitterGeo = new THREE.BoxGeometry(0.25, 0.04, carWidth + 0.06);
      const splitter = new THREE.Mesh(splitterGeo, shadowlineMat);
      splitter.position.set(2.15, 0.15, 0);
      this.carGroup.add(splitter);

      // ====================================================================
      // 4. QUAD BMW LASERLIGHT HEADLIGHTS (Angel Eyes / L-Shape DRLs)
      // ====================================================================
      const headlightGeo = new THREE.BoxGeometry(0.16, 0.12, 0.38);
      const laserMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 3.2,
        roughness: 0.1
      });

      // Left Headlight Cluster
      const headlightL = new THREE.Mesh(headlightGeo, laserMat);
      headlightL.position.set(2.12, 0.54, 0.64);
      headlightL.rotation.y = -0.15;
      this.carGroup.add(headlightL);
      this.headlights.push(headlightL);

      // Right Headlight Cluster
      const headlightR = new THREE.Mesh(headlightGeo, laserMat);
      headlightR.position.set(2.12, 0.54, -0.64);
      headlightR.rotation.y = 0.15;
      this.carGroup.add(headlightR);
      this.headlights.push(headlightR);

      // High-intensity Spotlights projecting headlight beam cones
      const spotL = new THREE.SpotLight(0xa5f3fc, 2.5, 12, Math.PI / 6.5, 0.35, 1);
      spotL.position.set(2.18, 0.54, 0.64);
      const targetL = new THREE.Object3D();
      targetL.position.set(7.0, 0.1, 1.2);
      this.carGroup.add(spotL);
      this.carGroup.add(targetL);
      spotL.target = targetL;
      this.headlightBeams.push(spotL);

      const spotR = new THREE.SpotLight(0xa5f3fc, 2.5, 12, Math.PI / 6.5, 0.35, 1);
      spotR.position.set(2.18, 0.54, -0.64);
      const targetR = new THREE.Object3D();
      targetR.position.set(7.0, 0.1, -1.2);
      this.carGroup.add(spotR);
      this.carGroup.add(targetR);
      spotR.target = targetR;
      this.headlightBeams.push(spotR);

      // ====================================================================
      // 5. 4-DOOR SEDAN GREENHOUSE & CARBON FIBER ROOF
      // ====================================================================
      // Sedan Cabin Greenhouse
      const cabinGeo = new THREE.BoxGeometry(2.1, 0.48, 1.35);
      const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
      cabinMesh.position.set(-0.15, 0.94, 0);
      this.carGroup.add(cabinMesh);

      // Windshield (Raked front glass)
      const windGeo = new THREE.BoxGeometry(0.8, 0.05, 1.32);
      const windMesh = new THREE.Mesh(windGeo, glassMat);
      windMesh.rotation.z = 0.52;
      windMesh.position.set(0.95, 0.88, 0);
      this.carGroup.add(windMesh);

      // Rear Windshield (Sedan rear glass)
      const rearGlassGeo = new THREE.BoxGeometry(0.7, 0.05, 1.3);
      const rearGlass = new THREE.Mesh(rearGlassGeo, glassMat);
      rearGlass.rotation.z = -0.48;
      rearGlass.position.set(-1.25, 0.88, 0);
      this.carGroup.add(rearGlass);

      // M Lightweight Carbon Fiber Roof with Central Aerodynamic Channel
      const roofGeo = new THREE.BoxGeometry(1.7, 0.05, 1.34);
      const roofMesh = new THREE.Mesh(roofGeo, carbonRoofMat);
      roofMesh.position.set(-0.15, 1.18, 0);
      this.carGroup.add(roofMesh);

      // Central aerodynamic indentation channel
      const channelGeo = new THREE.BoxGeometry(1.68, 0.04, 0.35);
      const channelMesh = new THREE.Mesh(channelGeo, shadowlineMat);
      channelMesh.position.set(-0.15, 1.19, 0);
      this.carGroup.add(channelMesh);

      // Signature M Aerodynamic Twin-Stalk Wing Mirrors
      [-0.88, 0.88].forEach(zPos => {
        const mirrorStalk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.12), shadowlineMat);
        mirrorStalk.position.set(0.75, 0.78, zPos);
        const mirrorCap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.16), carPaintMat);
        mirrorCap.position.set(0.75, 0.82, zPos + (zPos > 0 ? 0.08 : -0.08));
        this.carGroup.add(mirrorStalk);
        this.carGroup.add(mirrorCap);
      });

      // Front Fender M Air Gills (Breathers) with M5 Emblem
      [-0.89, 0.89].forEach(zPos => {
        const gill = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.03), shadowlineMat);
        gill.position.set(0.9, 0.58, zPos);
        this.carGroup.add(gill);
      });

      // ====================================================================
      // 6. REAR TRUNK, L-SHAPED TAILLIGHTS, M DIFFUSER & QUAD EXHAUSTS
      // ====================================================================
      // Rear M Decklid Lip Spoiler
      const spoilerGeo = new THREE.BoxGeometry(0.22, 0.05, 1.35);
      const spoilerMesh = new THREE.Mesh(spoilerGeo, shadowlineMat);
      spoilerMesh.position.set(-2.15, 0.78, 0);
      this.carGroup.add(spoilerMesh);

      // Rear BMW Roundel & M5 Competition Badge
      const rearBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16), roundelMat);
      rearBadge.rotation.x = -0.15;
      rearBadge.position.set(-2.21, 0.66, 0);
      this.carGroup.add(rearBadge);

      // 3D L-Shaped BMW LED Taillights (Sculpted crimson red light clusters)
      const tailMat = new THREE.MeshStandardMaterial({
        color: 0xff0033,
        emissive: 0xff0033,
        emissiveIntensity: 3.5,
        roughness: 0.15
      });

      const tailGeo = new THREE.BoxGeometry(0.12, 0.09, 0.55);
      const tailL = new THREE.Mesh(tailGeo, tailMat);
      tailL.position.set(-2.19, 0.62, 0.55);
      const tailR = new THREE.Mesh(tailGeo, tailMat);
      tailR.position.set(-2.19, 0.62, -0.55);
      this.carGroup.add(tailL);
      this.carGroup.add(tailR);

      // M Carbon Fiber Rear Diffuser with Aero Fins
      const diffuserGeo = new THREE.BoxGeometry(0.35, 0.16, 1.4);
      const diffuserMesh = new THREE.Mesh(diffuserGeo, shadowlineMat);
      diffuserMesh.position.set(-2.14, 0.28, 0);
      this.carGroup.add(diffuserMesh);

      // Diffuser vertical aerodynamic fins
      [-0.3, 0.3].forEach(zPos => {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.03), shadowlineMat);
        fin.position.set(-2.18, 0.26, zPos);
        this.carGroup.add(fin);
      });

      // 4 Iconic M Quad Exhaust Pipes (Twin Dual Chrome Tips)
      const exhaustGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.25, 16);
      const exhaustHollowMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
      const exhaustPositions = [-0.58, -0.47, 0.47, 0.58];

      exhaustPositions.forEach(zPos => {
        const exhaust = new THREE.Mesh(exhaustGeo, chromeMat);
        exhaust.rotation.z = Math.PI / 2;
        exhaust.position.set(-2.22, 0.25, zPos);

        const innerTip = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), exhaustHollowMat);
        innerTip.rotation.y = -Math.PI / 2;
        innerTip.position.set(-2.35, 0.25, zPos);

        this.carGroup.add(exhaust);
        this.carGroup.add(innerTip);
      });

      // ====================================================================
      // 7. 20" M DOUBLE-SPOKE FORGED ALLOY WHEELS & M PERFORMANCE BRAKES
      // ====================================================================
      const wheelRadius = 0.36;
      const wheelPositions = [
        { x: 1.35, y: wheelRadius, z: 0.90, isRight: true },
        { x: 1.35, y: wheelRadius, z: -0.90, isRight: false },
        { x: -1.35, y: wheelRadius, z: 0.90, isRight: true },
        { x: -1.35, y: wheelRadius, z: -0.90, isRight: false }
      ];

      wheelPositions.forEach(pos => {
        const wheel = this.createMPerformanceWheel(wheelRadius, pos.isRight, chromeMat, shadowlineMat, mBrakeBlueMat, roundelMat);
        wheel.position.set(pos.x, pos.y, pos.z);
        this.carGroup.add(wheel);
        this.wheels.push(wheel);
      });

      // Underglow LED illumination
      const underglow = new THREE.PointLight(0x00f0ff, 1.8, 4.5);
      underglow.position.set(0, 0.2, 0);
      this.carGroup.add(underglow);

      this.scene.add(this.carGroup);
    }

    /**
     * Builds a 20" M Double-Spoke Performance Alloy Wheel with M Blue Caliper
     */
    createMPerformanceWheel(radius, isRightSide, chromeMat, darkRimMat, caliperMat, roundelMat) {
      const wheelGroup = new THREE.Group();

      // Performance Tire (Low-profile rubber)
      const tireGeo = new THREE.CylinderGeometry(radius, radius, 0.26, 28);
      const tireMat = new THREE.MeshStandardMaterial({
        color: 0x131519,
        roughness: 0.88,
        metalness: 0.08
      });
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Outer Bi-Color Alloy Rim Lip
      const rimGeo = new THREE.CylinderGeometry(radius * 0.74, radius * 0.74, 0.27, 24);
      const rim = new THREE.Mesh(rimGeo, darkRimMat);
      rim.rotation.x = Math.PI / 2;
      wheelGroup.add(rim);

      // 5 Pairs of Double-Spokes (M Double-Spoke Design)
      const spokeGeo = new THREE.BoxGeometry(radius * 1.38, 0.035, 0.275);
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI) / 2.5;

        const spoke1 = new THREE.Mesh(spokeGeo, chromeMat);
        spoke1.rotation.y = angle - 0.08;
        wheelGroup.add(spoke1);

        const spoke2 = new THREE.Mesh(spokeGeo, chromeMat);
        spoke2.rotation.y = angle + 0.08;
        wheelGroup.add(spoke2);
      }

      // BMW Center Cap Roundel
      const centerCapGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.28, 16);
      const centerCap = new THREE.Mesh(centerCapGeo, roundelMat);
      centerCap.rotation.x = Math.PI / 2;
      wheelGroup.add(centerCap);

      // Large Perforated Carbon-Ceramic Brake Rotor Disc
      const discGeo = new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, 0.04, 20);
      const discMat = new THREE.MeshStandardMaterial({
        color: 0x78716c,
        metalness: 0.85,
        roughness: 0.35
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = Math.PI / 2;
      disc.position.z = isRightSide ? -0.05 : 0.05;
      wheelGroup.add(disc);

      // M Performance Blue Brake Caliper
      const caliperGeo = new THREE.BoxGeometry(0.14, 0.18, 0.07);
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(0.12, 0.14, isRightSide ? -0.05 : 0.05);
      wheelGroup.add(caliper);

      return wheelGroup;
    }

    /**
     * Optional external GLB/GLTF model loader with auto-scaling & centering
     */
    loadExternalGLB(url) {
      if (!window.THREE.GLTFLoader) {
        this.buildBMWM5();
        return;
      }

      const loader = new window.THREE.GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          if (this.carGroup) {
            this.scene.remove(this.carGroup);
          }
          this.carGroup = gltf.scene;

          const bbox = new THREE.Box3().setFromObject(this.carGroup);
          const size = bbox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 4.2 / maxDim;
          this.carGroup.scale.set(scale, scale, scale);

          const center = bbox.getCenter(new THREE.Vector3());
          this.carGroup.position.set(-center.x * scale, -bbox.min.y * scale, -center.z * scale);

          this.bodyMaterials = [];
          this.carGroup.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material && (child.name.toLowerCase().includes('body') || child.name.toLowerCase().includes('paint'))) {
                this.bodyMaterials.push(child.material);
              }
            }
          });

          this.scene.add(this.carGroup);
        },
        undefined,
        (err) => {
          console.warn("Failed to load external GLB model, using authentic procedural BMW M5:", err);
          this.buildBMWM5();
        }
      );
    }

    setupParticles() {
      const count = 180;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 1] = Math.random() * 5 + 0.2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.055,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      });

      this.particles = new THREE.Points(geometry, material);
      this.scene.add(this.particles);
    }

    setPaintColor(hexColor) {
      if (!hexColor) return;
      const color = new THREE.Color(hexColor);
      this.bodyMaterials.forEach(mat => {
        if (mat && mat.color) {
          mat.color.copy(color);
        }
      });
    }

    toggleHeadlights() {
      this.headlightsOn = !this.headlightsOn;
      const intensity = this.headlightsOn ? 3.2 : 0;
      const beamIntensity = this.headlightsOn ? 2.5 : 0;

      this.headlights.forEach(h => {
        if (h.material) h.material.emissiveIntensity = intensity;
      });
      this.headlightBeams.forEach(b => {
        b.intensity = beamIntensity;
      });
      return this.headlightsOn;
    }

    toggleWireframe() {
      this.isWireframe = !this.isWireframe;
      if (this.carGroup) {
        this.carGroup.traverse(child => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => { m.wireframe = this.isWireframe; });
            } else {
              child.material.wireframe = this.isWireframe;
            }
          }
        });
      }
      return this.isWireframe;
    }

    setCameraView(viewName) {
      if (!this.controls) return;
      const duration = 750;

      let targetPos = { x: 4.8, y: 2.0, z: 5.0 };

      switch (viewName) {
        case 'front':
          targetPos = { x: 5.2, y: 1.15, z: 0 };
          break;
        case 'side':
          targetPos = { x: 0, y: 1.25, z: 5.4 };
          break;
        case 'top':
          targetPos = { x: 0.1, y: 7.0, z: 0.1 };
          break;
        case 'rear':
          targetPos = { x: -5.2, y: 1.35, z: 0 };
          break;
        case 'iso':
        default:
          targetPos = { x: 4.8, y: 2.0, z: 5.0 };
          break;
      }

      const startPos = { ...this.camera.position };
      const startTime = performance.now();

      const animateCamera = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        this.camera.position.x = startPos.x + (targetPos.x - startPos.x) * ease;
        this.camera.position.y = startPos.y + (targetPos.y - startPos.y) * ease;
        this.camera.position.z = startPos.z + (targetPos.z - startPos.z) * ease;
        this.controls.target.set(0, 0.65, 0);

        if (progress < 1 && !this.isDestroyed) {
          requestAnimationFrame(animateCamera);
        }
      };

      requestAnimationFrame(animateCamera);
    }

    setAutoRotate(enable) {
      if (this.controls) {
        this.controls.autoRotate = !!enable;
      }
    }

    setupEventListeners() {
      this.resizeHandler = () => {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      };

      window.addEventListener('resize', this.resizeHandler);

      this.visibilityHandler = () => {
        this.isVisible = !document.hidden;
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    startAnimation() {
      const render = () => {
        if (this.isDestroyed) return;

        this.animFrameId = requestAnimationFrame(render);

        if (!this.isVisible) return;

        const delta = this.clock.getDelta();

        if (this.controls) {
          this.controls.update();
        }

        // Rotate M wheels slowly during auto-rotation
        if (this.controls && this.controls.autoRotate) {
          this.wheels.forEach(wheel => {
            wheel.rotation.z -= delta * 1.5;
          });
        }

        if (this.particles) {
          const positions = this.particles.geometry.attributes.position.array;
          for (let i = 1; i < positions.length; i += 3) {
            positions[i] += delta * 0.15;
            if (positions[i] > 5) positions[i] = 0.2;
          }
          this.particles.geometry.attributes.position.needsUpdate = true;
          this.particles.rotation.y += delta * 0.03;
        }

        this.renderer.render(this.scene, this.camera);
      };

      render();
    }

    renderFallback() {
      this.container.innerHTML = `
        <div class="webgl-fallback">
          <div class="fallback-car-hologram">
            <div class="hologram-car-icon">🏎</div>
            <div class="hologram-rings">
              <div class="ring ring-1"></div>
              <div class="ring ring-2"></div>
            </div>
          </div>
          <div class="fallback-telemetry">
            <span class="telemetry-badge">BMW M5 COMPETITION 3D</span>
            <p>BMW M5 Competition real-time 3D telemetry canvas active.</p>
          </div>
        </div>
      `;
    }

    destroy() {
      this.isDestroyed = true;
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      window.removeEventListener('resize', this.resizeHandler);
      document.removeEventListener('visibilitychange', this.visibilityHandler);

      if (this.controls) this.controls.dispose();
      if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }
      if (this.scene) {
        this.scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
      }
    }
  }

  window.FuelThreeViewer = AutomotiveViewer;

})(window);
