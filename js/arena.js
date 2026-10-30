/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * 3D Arena & Rendering Architecture
 * Built on Three.js (r128) with WebXR, Seated Ergonomics, & Dynamic Lighting.
 */

class ArenaScene {
  constructor() {
    this.container = document.getElementById('webgl-canvas-container');
    this.canvas = document.getElementById('webgl-canvas');
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Player Camera Rig for Seated / Standing ergonomics & 360 Locomotion
    this.cameraRig = null;
    this.seatedHeight = 1.25; // Eye height in wheelchair or seated chair (meters)
    this.standingHeight = 1.68; // Standing height (meters)
    this.targetCameraY = 1.25;
    this.targetCameraX = 0;
    this.targetCameraZ = 0;

    // 360 Degree View & Rotation Controls
    this.cameraYaw = 0; // Horizontal rotation (radians)
    this.targetYaw = 0;
    this.cameraPitch = 0; // Vertical tilt (radians)
    this.targetPitch = 0;
    this.isDraggingLook = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    // 3D Point-to-Move Locomotion
    this.navReticle = null;
    this.pointedFloorPos = new THREE.Vector3(0, 0, 0);
    this.isNavPointValid = false;
    this.navFloorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();
    this.mouseCoords = new THREE.Vector2();
    
    // Lighting references
    this.ambientLight = null;
    this.directionalLight = null;
    this.spotLight = null;

    // Environmental groups
    this.stadiumGroup = null;
    this.activeSportGroup = null;
    this.trajectoryLine = null;
    this.particleSystem = null;

    // WebXR state
    this.xrSession = null;
    this.xrControllers = [];

    this.isReady = false;
    this.init();
  }

  init() {
    try {
      // 1. Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x080c14);
      this.scene.fog = new THREE.FogExp2(0x080c14, 0.018);

      // 2. Camera & Camera Rig
      const aspect = window.innerWidth / window.innerHeight;
      this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 150);
      
      this.cameraRig = new THREE.Group();
      this.cameraRig.name = "PlayerCameraRig";
      this.cameraRig.add(this.camera);
      this.scene.add(this.cameraRig);

      // Apply initial seated/standing height
      this.updatePlayerHeight();

      // 3. Renderer with antialias, shadows, and WebXR support
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputEncoding = THREE.sRGBEncoding;

      // Enable WebXR
      this.renderer.xr.enabled = true;
      this.initWebXRControllers();

      // 4. Lights
      this.setupLighting();

      // 5. Build Inclusive Stadium Architecture
      this.buildStadium();

      // 6. 3D Holographic Navigation Reticle for 360 Point-to-Move
      this.setupNavReticle();

      // 7. Tactical Regulation Court Hotspots
      this.setupTacticalHotspots();

      // 8. 360-Degree Camera & Navigation Controls
      this.setup360Controls();

      // 8. Build Trajectory Visualizer & Particles
      this.setupTrajectoryVisualizer();
      this.setupParticleSystem();

      // 9. Window resize handler
      window.addEventListener('resize', () => this.onWindowResize());

      // 10. Listen to Accessibility changes (e.g. seated mode toggle)
      if (window.a11y) {
        window.a11y.subscribe((key, val) => {
          if (key === 'seatedMode') {
            this.updatePlayerHeight();
          }
        });
      }

      // 11. Start Main Render Loop
      this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
      this.isReady = true;

      console.log("Beyond Barriers 3D Arena Initialized successfully.");
    } catch (err) {
      console.error("Failed to initialize 3D Arena:", err);
      this.showInitFallback(err);
    }
  }

  updatePlayerHeight(smooth = true) {
    const isSeated = window.a11y ? window.a11y.get('seatedMode') : true;
    this.targetCameraY = isSeated ? this.seatedHeight : this.standingHeight;
    
    if (this.cameraRig) {
      if (!smooth) {
        this.cameraRig.position.set(0, this.targetCameraY, 0);
      }
      this.camera.position.set(0, 0, 0);
    }
  }

  setupLighting() {
    // Ambient fill light (rich deep blue/navy tint)
    this.ambientLight = new THREE.AmbientLight(0x283548, 1.2);
    this.scene.add(this.ambientLight);

    // Hemispheric light for sky/ground contrast
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.8);
    hemiLight.position.set(0, 30, 0);
    this.scene.add(hemiLight);

    // Main stadium floodlight casting soft shadows
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.4);
    this.directionalLight.position.set(10, 22, 12);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 60;
    this.directionalLight.shadow.camera.left = -20;
    this.directionalLight.shadow.camera.right = 20;
    this.directionalLight.shadow.camera.top = 20;
    this.directionalLight.shadow.camera.bottom = -20;
    this.directionalLight.shadow.bias = -0.0005;
    this.scene.add(this.directionalLight);

    // Overhead dynamic spotlight over the active action zone
    this.spotLight = new THREE.SpotLight(0x38bdf8, 2.5, 40, Math.PI / 4, 0.4, 1);
    this.spotLight.position.set(0, 18, -4);
    this.spotLight.target.position.set(0, 0, -8);
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);
  }

  buildStadium() {
    this.stadiumGroup = new THREE.Group();
    this.stadiumGroup.name = "StadiumArchitecture";

    // 1. Sleek polished indoor stadium floor
    const floorGeo = new THREE.PlaneGeometry(64, 64, 32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.25
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.stadiumGroup.add(floor);

    // 2. Full 360-Degree Stadium Outer Enclosure Walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.85,
      metalness: 0.15
    });

    // North wall (behind hoop / goal)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(64, 20, 1), wallMat);
    northWall.position.set(0, 10, -30);
    this.stadiumGroup.add(northWall);

    // South wall (behind player's starting spot) - Full 360 enclosure!
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(64, 20, 1), wallMat);
    southWall.position.set(0, 10, 30);
    this.stadiumGroup.add(southWall);

    // West wall (left wing)
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(1, 20, 64), wallMat);
    westWall.position.set(-30, 10, 0);
    this.stadiumGroup.add(westWall);

    // East wall (right wing)
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(1, 20, 64), wallMat);
    eastWall.position.set(30, 10, 0);
    this.stadiumGroup.add(eastWall);

    // 3. 360-Degree Grandstands & Bleacher Tiers all around the arena
    this.build360Grandstands();

    // 4. Overhead Arena Scoreboard Cube (Suspended in center of 360 roof)
    this.buildCenterHungScoreboard();

    // 5. Accessible Central Player Pod / Starting Platform
    const podGeo = new THREE.CylinderGeometry(2.6, 2.8, 0.08, 32);
    const podMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.3
    });
    const playerPod = new THREE.Mesh(podGeo, podMat);
    playerPod.position.set(0, 0.04, 0);
    playerPod.receiveShadow = true;
    this.stadiumGroup.add(playerPod);

    // Glowing accessibility pod ring
    const ringGeo = new THREE.RingGeometry(2.5, 2.68, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.09, 0);
    this.stadiumGroup.add(ring);

    this.scene.add(this.stadiumGroup);
  }

  build360Grandstands() {
    const tierMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const seatMatA = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 }); // Cyan seats
    const seatMatB = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 }); // Dark seats

    // Helper to generate a tiered grandstand section
    const createStand = (width, depth, tiers, x, y, z, rotY) => {
      const standGroup = new THREE.Group();
      for (let i = 0; i < tiers; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(width, 0.6, depth / tiers), tierMat);
        step.position.set(0, (i + 1) * 0.6, -i * (depth / tiers * 0.9));
        standGroup.add(step);

        // Spectator silhouettes / seat accents
        const seatRow = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.95, 0.25, 0.4),
          i % 2 === 0 ? seatMatA : seatMatB
        );
        seatRow.position.set(0, (i + 1) * 0.6 + 0.2, -i * (depth / tiers * 0.9));
        standGroup.add(seatRow);
      }
      standGroup.position.set(x, y, z);
      standGroup.rotation.y = rotY;
      this.stadiumGroup.add(standGroup);
    };

    // North Grandstand (Behind Hoop/Goal)
    createStand(36, 12, 6, 0, 0.2, -26, 0);
    // South Grandstand (Behind Player's Starting Position) - True 360 experience!
    createStand(36, 12, 6, 0, 0.2, 26, Math.PI);
    // West Grandstand (Left)
    createStand(36, 12, 6, -26, 0.2, 0, Math.PI / 2);
    // East Grandstand (Right)
    createStand(36, 12, 6, 26, 0.2, 0, -Math.PI / 2);

    // 360 LED Ribbon Banner running around upper tier
    const ribbonGeo = new THREE.BoxGeometry(54, 1.2, 0.2);
    const ribbonMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    
    const ribNorth = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribNorth.position.set(0, 7.5, -28.5);
    this.stadiumGroup.add(ribNorth);

    const ribSouth = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribSouth.position.set(0, 7.5, 28.5);
    this.stadiumGroup.add(ribSouth);

    const ribWest = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 54), ribbonMat);
    ribWest.position.set(-28.5, 7.5, 0);
    this.stadiumGroup.add(ribWest);

    const ribEast = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 54), ribbonMat);
    ribEast.position.set(28.5, 7.5, 0);
    this.stadiumGroup.add(ribEast);

    // South Entrance Arch (Where players enter)
    const archGeo = new THREE.BoxGeometry(8, 6, 1.5);
    const archMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(0, 3, 29);
    this.stadiumGroup.add(arch);
  }

  buildCenterHungScoreboard() {
    // 360 4-Sided Giant Video Cube hanging from arena center
    const cubeGroup = new THREE.Group();
    cubeGroup.position.set(0, 14.5, -3);

    const frameGeo = new THREE.BoxGeometry(7, 4.2, 7);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    cubeGroup.add(frame);

    // 4 Glow Screen Faces
    const screenGeo = new THREE.PlaneGeometry(6.4, 3.6);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x0369a1 });

    // North face
    const sn = new THREE.Mesh(screenGeo, screenMat);
    sn.position.set(0, 0, 3.52);
    cubeGroup.add(sn);

    // South face
    const ss = new THREE.Mesh(screenGeo, screenMat);
    ss.rotation.y = Math.PI;
    ss.position.set(0, 0, -3.52);
    cubeGroup.add(ss);

    // East face
    const se = new THREE.Mesh(screenGeo, screenMat);
    se.rotation.y = Math.PI / 2;
    se.position.set(3.52, 0, 0);
    cubeGroup.add(se);

    // West face
    const sw = new THREE.Mesh(screenGeo, screenMat);
    sw.rotation.y = -Math.PI / 2;
    sw.position.set(-3.52, 0, 0);
    cubeGroup.add(sw);

    // Support cables hanging from ceiling
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    const cableOffsets = [
      [-3, 3], [3, 3], [-3, -3], [3, -3]
    ];
    cableOffsets.forEach(([cx, cz]) => {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 8, 8), cableMat);
      cable.position.set(cx, 5.5, cz);
      cubeGroup.add(cable);
    });

    this.stadiumGroup.add(cubeGroup);
  }

  setupTrajectoryVisualizer() {
    // Dynamic trajectory arc using curve
    const maxPoints = 50;
    const positions = new Float32Array(maxPoints * 3);
    const trajectoryGeo = new THREE.BufferGeometry();
    trajectoryGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const trajectoryMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      scale: 1,
      dashSize: 0.3,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.85
    });

    this.trajectoryLine = new THREE.Line(trajectoryGeo, trajectoryMat);
    this.trajectoryLine.computeLineDistances();
    this.trajectoryLine.visible = false;
    this.scene.add(this.trajectoryLine);
  }

  // Update predicted trajectory curve
  updateTrajectory(points) {
    if (!this.trajectoryLine || !points || points.length === 0) {
      if (this.trajectoryLine) this.trajectoryLine.visible = false;
      return;
    }

    const posAttr = this.trajectoryLine.geometry.attributes.position;
    const count = Math.min(points.length, posAttr.count);

    for (let i = 0; i < count; i++) {
      posAttr.setXYZ(i, points[i].x, points[i].y, points[i].z);
    }
    this.trajectoryLine.geometry.setDrawRange(0, count);
    posAttr.needsUpdate = true;
    this.trajectoryLine.computeLineDistances();
    this.trajectoryLine.visible = true;
  }

  hideTrajectory() {
    if (this.trajectoryLine) this.trajectoryLine.visible = false;
  }

  setupParticleSystem() {
    const particleCount = 150;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    this.particleVelocities = [];

    const palette = [
      new THREE.Color(0x38bdf8),
      new THREE.Color(0x10b981),
      new THREE.Color(0xf59e0b),
      new THREE.Color(0xc084fc)
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = -100; // start off-screen
      positions[i * 3 + 2] = 0;

      const col = palette[i % palette.length];
      colors[i * 3 + 0] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      this.particleVelocities.push(new THREE.Vector3());
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.visible = false;
    this.scene.add(this.particleSystem);
  }

  // Trigger celebration particle explosion at a 3D coordinate
  spawnCelebration(pos, count = 80) {
    if (!this.particleSystem) return;
    const positions = this.particleSystem.geometry.attributes.position;
    this.particleSystem.visible = true;

    for (let i = 0; i < count; i++) {
      positions.setXYZ(i, pos.x, pos.y, pos.z);
      
      const speed = 2.5 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.2) * Math.PI;

      this.particleVelocities[i].set(
        Math.cos(theta) * Math.cos(phi) * speed,
        Math.sin(phi) * speed + 2.5,
        Math.sin(theta) * Math.cos(phi) * speed
      );
    }
    positions.needsUpdate = true;
    this.particlesActive = true;
    this.particleTimer = 1.4;
  }

  updateParticles(delta) {
    if (!this.particlesActive || !this.particleSystem) return;

    this.particleTimer -= delta;
    if (this.particleTimer <= 0) {
      this.particlesActive = false;
      this.particleSystem.visible = false;
      return;
    }

    const positions = this.particleSystem.geometry.attributes.position;
    const gravity = -9.8 * delta;

    for (let i = 0; i < positions.count; i++) {
      const v = this.particleVelocities[i];
      v.y += gravity;
      positions.setXYZ(
        i,
        positions.getX(i) + v.x * delta,
        positions.getY(i) + v.y * delta,
        positions.getZ(i) + v.z * delta
      );
    }
    positions.needsUpdate = true;
  }

  /* -------------------------------------------------------------
     360 DEGREE POINT-TO-MOVE LOCOMOTION & NAVIGATION RETICLE
     ------------------------------------------------------------- */
  setupNavReticle() {
    this.navReticle = new THREE.Group();
    this.navReticle.name = "NavReticle";

    // 1. Outer pulsing neon ring
    const outerRingGeo = new THREE.RingGeometry(0.85, 0.98, 32);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.navOuterRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    this.navOuterRing.rotation.x = -Math.PI / 2;
    this.navReticle.add(this.navOuterRing);

    // 2. Inner disc target with crosshair accent
    const innerDiscGeo = new THREE.CircleGeometry(0.68, 32);
    const innerDiscMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const innerDisc = new THREE.Mesh(innerDiscGeo, innerDiscMat);
    innerDisc.rotation.x = -Math.PI / 2;
    this.navReticle.add(innerDisc);

    // 3. Central glowing waypoint cylinder beam
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 0.6;
    this.navReticle.add(beam);

    // 4. Directional chevron pointing towards destination
    const chevronGeo = new THREE.ConeGeometry(0.18, 0.35, 16);
    const chevronMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const chevron = new THREE.Mesh(chevronGeo, chevronMat);
    chevron.position.y = 1.35;
    chevron.rotation.x = Math.PI;
    this.navReticle.add(chevron);

    this.navReticle.position.set(0, 0.03, 0);
    this.navReticle.visible = false;
    this.scene.add(this.navReticle);
  }

  /* -------------------------------------------------------------
     TACTICAL REGULATION COURT HOTSPOTS (NEVER RANDOM)
     ------------------------------------------------------------- */
  setupTacticalHotspots() {
    this.tacticalHotspotsGroup = new THREE.Group();
    this.tacticalHotspotsGroup.name = "TacticalHotspots";

    const spots = [
      { id: 'left', x: -3.2, z: -1.5, color: 0x06b6d4 },
      { id: 'home', x: 0, z: 0, color: 0xf59e0b },
      { id: 'right', x: 3.2, z: -1.5, color: 0x06b6d4 }
    ];

    this.hotspotMeshes = {};

    spots.forEach(sp => {
      const g = new THREE.Group();
      g.position.set(sp.x, 0.025, sp.z);

      // Outer ring
      const ringGeo = new THREE.RingGeometry(0.7, 0.85, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: sp.color, side: THREE.DoubleSide, transparent: true, opacity: sp.id === 'home' ? 0.9 : 0.45 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      g.add(ring);

      // Inner disc
      const discGeo = new THREE.CircleGeometry(0.65, 32);
      const discMat = new THREE.MeshBasicMaterial({ color: sp.color, side: THREE.DoubleSide, transparent: true, opacity: sp.id === 'home' ? 0.3 : 0.1 });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      g.add(disc);

      this.tacticalHotspotsGroup.add(g);
      this.hotspotMeshes[sp.id] = { group: g, ring: ring, disc: disc };
    });

    this.scene.add(this.tacticalHotspotsGroup);
  }

  setTacticalSpot(spotId) {
    const spots = {
      'home': { x: 0, z: 0, yaw: 0, label: 'Home Spot (Top of Key)' },
      'left': { x: -3.2, z: -1.5, yaw: 0.32, label: 'Left Wing (3-Point)' },
      'right': { x: 3.2, z: -1.5, yaw: -0.32, label: 'Right Wing (3-Point)' }
    };
    const spot = spots[spotId] || spots['home'];
    this.currentSpotId = spotId;

    this.moveToPosition(spot.x, spot.z, spot.yaw, spot.label);

    // Update active highlight on 3D floor hotspots
    if (this.hotspotMeshes) {
      Object.keys(this.hotspotMeshes).forEach(k => {
        const item = this.hotspotMeshes[k];
        const isActive = (k === spotId);
        if (item.disc) item.disc.material.opacity = isActive ? 0.45 : 0.12;
        if (item.ring) item.ring.material.opacity = isActive ? 0.95 : 0.45;
        if (item.group) item.group.scale.set(isActive ? 1.15 : 1.0, 1.0, isActive ? 1.15 : 1.0);
      });
    }

    // Update DOM buttons
    const btnHome = document.getElementById('btn-pos-home');
    const btnLeft = document.getElementById('btn-pos-left');
    const btnRight = document.getElementById('btn-pos-right');
    if (btnHome) btnHome.classList.toggle('active', spotId === 'home');
    if (btnLeft) btnLeft.classList.toggle('active', spotId === 'left');
    if (btnRight) btnRight.classList.toggle('active', spotId === 'right');

    if (window.app && window.app.inTutorial && window.app.onTutorialAction) {
      window.app.onTutorialAction('move');
    }
  }

  setup360Controls() {
    const canvas = this.canvas || window;

    // Right-click drag OR middle-click to look around 360 deg freely on desktop
    window.addEventListener('mousedown', (e) => {
      if (e.button === 2 || e.button === 1 || e.shiftKey) {
        this.isDraggingLook = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      // 1. If dragging look around: rotate view
      if (this.isDraggingLook) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;

        this.targetYaw -= dx * 0.005;
        this.targetPitch -= dy * 0.005;
        this.targetPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetPitch));
        return;
      }

      // 2. Otherwise: update point-to-move reticle on floor
      this.updatePointerFloor(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2 || e.button === 1 || e.shiftKey) {
        this.isDraggingLook = false;
      }
    });

    // Disable default context menu so right-click is reserved for looking around in 360
    window.addEventListener('contextmenu', (e) => {
      // Don't pop up context menu over canvas
      if (e.target && e.target.id === 'webgl-canvas') {
        e.preventDefault();
      }
    });

    // Point-to-move keyboard shortcuts:
    // 'C' -> Recenter to base pod
    // 'Q' -> Snap Turn Left 45 deg
    // Dedicated WASD navigation support
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;

      if (e.code === 'KeyC') {
        this.recenterPlayer();
      } else if (e.code === 'KeyQ') {
        this.snapTurn(Math.PI / 4); // 45 deg Left
      }
    });
  }

  // Update floor intersection for point-to-move reticle
  updatePointerFloor(clientX, clientY) {
    if (!this.camera || !this.navReticle) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mouseCoords.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseCoords.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseCoords, this.camera);

    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.navFloorPlane, intersection)) {
      // Bounds: within court / stadium playable perimeter
      const minX = -12.0, maxX = 12.0;
      const minZ = -22.0, maxZ = 12.0;

      if (intersection.x >= minX && intersection.x <= maxX && intersection.z >= minZ && intersection.z <= maxZ) {
        this.pointedFloorPos.copy(intersection);
        this.navReticle.position.set(intersection.x, 0.03, intersection.z);
        this.navReticle.visible = true;
        this.isNavPointValid = true;

        if (this.navTextTag) {
          this.navTextTag.rotation.y = this.cameraYaw;
        }
      } else {
        this.navReticle.visible = false;
        this.isNavPointValid = false;
      }
    }
  }

  // Move / Teleport player camera rig smoothly to pointed 3D space
  moveToPointedPosition() {
    if (!this.isNavPointValid) return;
    this.moveToPosition(this.pointedFloorPos.x, this.pointedFloorPos.z);
  }

  moveToPosition(targetX, targetZ, targetYaw = 0, label = 'Court Position') {
    // Clamped target position inside stadium boundaries
    const clampedX = Math.max(-12.0, Math.min(12.0, targetX));
    const clampedZ = Math.max(-20.0, Math.min(10.0, targetZ));

    this.targetCameraX = clampedX;
    this.targetCameraZ = clampedZ;
    this.targetYaw = targetYaw;
    this.targetPitch = 0;

    if (window.soundEngine) {
      window.soundEngine.playTeleportWhoosh();
    }

    if (this.navReticle) {
      // Pulse animation
      this.navReticle.scale.set(1.4, 1.4, 1.4);
      setTimeout(() => {
        if (this.navReticle) this.navReticle.scale.set(1.0, 1.0, 1.0);
      }, 250);
    }

    // Notify active sport so ball, hands, and defender positions update immediately
    if (window.app && window.app.activeSport && window.app.activeSport.onPlayerMoved) {
      window.app.activeSport.onPlayerMoved(clampedX, clampedZ);
    }
  }

  recenterPlayer() {
    this.setTacticalSpot('home');
  }

  snapTurn(angleRadians) {
    this.targetYaw += angleRadians;
    if (window.soundEngine) {
      window.soundEngine.playUiClick();
    }
  }

  /* -------------------------------------------------------------
     WEBXR VR SUPPORT & CONTROLLERS
     ------------------------------------------------------------- */
  initWebXRControllers() {
    // Controller 0 (Right / Primary)
    const controller0 = this.renderer.xr.getController(0);
    controller0.addEventListener('selectstart', () => {
      // If pointing at floor and reticle is active, move there!
      if (this.isNavPointValid && this.navReticle && this.navReticle.visible) {
        this.moveToPointedPosition();
      } else if (window.inputManager) {
        if (window.a11y && window.a11y.get('simplifiedMotion')) {
          window.inputManager.toggleSimplifiedAction();
        } else {
          window.inputManager.startCharging();
        }
      }
    });
    controller0.addEventListener('selectend', () => {
      if (window.inputManager && (!window.a11y || !window.a11y.get('simplifiedMotion'))) {
        window.inputManager.releaseAction();
      }
    });
    // Grip squeeze -> Point-to-move glide!
    controller0.addEventListener('squeezestart', () => {
      this.moveToPointedPosition();
    });
    this.scene.add(controller0);

    // Controller 1 (Left / Secondary)
    const controller1 = this.renderer.xr.getController(1);
    controller1.addEventListener('selectstart', () => {
      // Snap turn 45 deg
      this.snapTurn(Math.PI / 4);
    });
    controller1.addEventListener('squeezestart', () => {
      // Recenter to key
      this.recenterPlayer();
    });
    this.scene.add(controller1);

    // Add visual controller rays
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5)
    ]);
    const rayMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
    const ray0 = new THREE.Line(rayGeo, rayMat);
    controller0.add(ray0);

    this.xrControllers = [controller0, controller1];
  }

  async enterVR() {
    if (!navigator.xr) {
      alert("WebXR is not supported on this browser. Try on Meta Quest Browser, Chrome, or Edge with a compatible headset.");
      return;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      if (!supported) {
        alert("Immersive VR is not supported on your current device. You can enjoy the full experience in Desktop Mode!");
        return;
      }

      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });

      this.renderer.xr.setSession(session);
      this.xrSession = session;

      session.addEventListener('end', () => {
        this.xrSession = null;
      });
    } catch (err) {
      console.error("Failed to start WebXR session:", err);
      alert("Could not start VR session: " + err.message);
    }
  }

  /* -------------------------------------------------------------
     RENDER LOOP & RESIZE
     ------------------------------------------------------------- */
  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(time, frame) {
    const rawDelta = Math.min(this.clock.getDelta(), 0.1);

    // Smooth physical camera elevation animation for Seated vs Standing mode
    if (this.cameraRig) {
      if (Math.abs(this.cameraRig.position.y - this.targetCameraY) > 0.001) {
        this.cameraRig.position.y += (this.targetCameraY - this.cameraRig.position.y) * 4.5 * rawDelta;
      }
      
      // Smooth 360 locomotion position glide (X & Z)
      this.cameraRig.position.x += (this.targetCameraX - this.cameraRig.position.x) * 5.0 * rawDelta;
      this.cameraRig.position.z += (this.targetCameraZ - this.cameraRig.position.z) * 5.0 * rawDelta;

      // Smooth 360 camera rotation (yaw & pitch)
      if (!this.renderer.xr.isPresenting) {
        this.cameraYaw += (this.targetYaw - this.cameraYaw) * 10.0 * rawDelta;
        this.cameraPitch += (this.targetPitch - this.cameraPitch) * 10.0 * rawDelta;
        this.cameraRig.rotation.y = this.cameraYaw;
        this.camera.rotation.x = this.cameraPitch;
      } else {
        // In WebXR, apply snap-turn yaw offset to cameraRig
        this.cameraYaw += (this.targetYaw - this.cameraYaw) * 10.0 * rawDelta;
        this.cameraRig.rotation.y = this.cameraYaw;
      }
    }

    // Animate point-to-move reticle pulse
    if (this.navReticle && this.navReticle.visible) {
      const pulse = 1.0 + Math.sin(time * 0.006) * 0.06;
      this.navReticle.scale.set(pulse, 1.0, pulse);
    }

    // Apply Game Pace multiplier (0.7x Relaxed vs 1.0x Standard vs 1.25x Fast)
    const paceMult = window.a11y ? window.a11y.getGamePaceMultiplier() : 1.0;
    const gameDelta = rawDelta * paceMult;

    // Update Input Manager (power charging & aim)
    if (window.inputManager) {
      window.inputManager.update(gameDelta);
    }

    // Update particles with game pace
    this.updateParticles(gameDelta);

    // Update active sport physics and game loop with game pace
    if (window.app && window.app.activeSport) {
      window.app.activeSport.update(gameDelta);
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }

  showInitFallback(error) {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:16px 24px;border-radius:8px;font-weight:bold;z-index:9999;max-width:90%;box-shadow:0 8px 24px rgba(0,0,0,0.5);';
    banner.innerHTML = `<h3>Renderer Notice</h3><p>3D initialization encountered: ${error.message}</p><button onclick="location.reload()" style="margin-top:8px;padding:6px 16px;background:#fff;color:#000;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Retry</button>`;
    document.body.appendChild(banner);
  }
}
