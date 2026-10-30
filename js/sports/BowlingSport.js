/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * Bowling 10-Pin Strike Mode with Realistic Pin Physics & Auto-Rack
 */

class BowlingSport extends SportBase {
  constructor(arena) {
    super(arena, {
      name: 'Bowling',
      key: 'bowling',
      description: 'Line up your roll down the hardwood lane and knock down all 10 pins!'
    });

    this.laneWidth = 1.15;
    this.laneLength = 16.0;
    this.pinDeckZ = -14.0;
    
    this.ballRadius = 0.16;
    this.ballInitialPos = new THREE.Vector3(0, 0.16, -0.8);
    this.ballPos = new THREE.Vector3().copy(this.ballInitialPos);
    this.ballVel = new THREE.Vector3();
    this.isBallRolling = false;
    this.inGutter = false;
    this.rollTimer = 0;

    this.pins = [];
    this.ballMesh = null;

    this.buildLaneAndPins();
  }

  buildLaneAndPins() {
    const laneCanvas = document.createElement('canvas');
    laneCanvas.width = 128; laneCanvas.height = 1024;
    const lCtx = laneCanvas.getContext('2d');
    lCtx.fillStyle = '#fde68a'; lCtx.fillRect(0, 0, 128, 1024);
    lCtx.fillStyle = '#d97706';
    for (let x = 0; x < 128; x += 16) lCtx.fillRect(x, 0, 2, 1024);
    lCtx.fillStyle = '#92400e';
    for (let i = 1; i <= 5; i++) {
      const ax = i * 21;
      lCtx.beginPath(); lCtx.moveTo(ax, 300); lCtx.lineTo(ax - 6, 320); lCtx.lineTo(ax + 6, 320); lCtx.fill();
    }

    const laneTex = new THREE.CanvasTexture(laneCanvas);
    const laneMat = new THREE.MeshStandardMaterial({ map: laneTex, roughness: 0.25, metalness: 0.1 });
    const laneMesh = new THREE.Mesh(new THREE.PlaneGeometry(this.laneWidth, this.laneLength), laneMat);
    laneMesh.rotation.x = -Math.PI / 2;
    laneMesh.position.set(0, 0.01, -this.laneLength / 2);
    laneMesh.receiveShadow = true;
    this.group.add(laneMesh);

    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const gutterGeo = new THREE.BoxGeometry(0.25, 0.12, this.laneLength);
    const leftGutter = new THREE.Mesh(gutterGeo, gutterMat);
    leftGutter.position.set(-this.laneWidth / 2 - 0.125, -0.04, -this.laneLength / 2);
    this.group.add(leftGutter);
    const rightGutter = new THREE.Mesh(gutterGeo, gutterMat);
    rightGutter.position.set(this.laneWidth / 2 + 0.125, -0.04, -this.laneLength / 2);
    this.group.add(rightGutter);

    this.rackPins();

    const ballGeo = new THREE.SphereGeometry(this.ballRadius, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.2, metalness: 0.4 });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.castShadow = true;
    this.ballMesh.position.copy(this.ballInitialPos);
    this.group.add(this.ballMesh);
  }

  rackPins() {
    this.pins.forEach(p => this.group.remove(p.mesh));
    this.pins = [];

    const pinConfigs = [
      { id: 1, x: 0, z: this.pinDeckZ },
      { id: 2, x: -0.16, z: this.pinDeckZ - 0.3 },
      { id: 3, x: 0.16, z: this.pinDeckZ - 0.3 },
      { id: 4, x: -0.32, z: this.pinDeckZ - 0.6 },
      { id: 5, x: 0, z: this.pinDeckZ - 0.6 },
      { id: 6, x: 0.32, z: this.pinDeckZ - 0.6 },
      { id: 7, x: -0.48, z: this.pinDeckZ - 0.9 },
      { id: 8, x: -0.16, z: this.pinDeckZ - 0.9 },
      { id: 9, x: 0.16, z: this.pinDeckZ - 0.9 },
      { id: 10, x: 0.48, z: this.pinDeckZ - 0.9 }
    ];

    pinConfigs.forEach(cfg => {
      const pinGroup = new THREE.Group();
      const bodyGeo = new THREE.CylinderGeometry(0.04, 0.065, 0.38, 16);
      const pinMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const body = new THREE.Mesh(bodyGeo, pinMat);
      body.castShadow = true;
      body.position.y = 0.19;
      pinGroup.add(body);

      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.04, 16), stripeMat);
      stripe.position.y = 0.27;
      pinGroup.add(stripe);

      pinGroup.position.set(cfg.x, 0, cfg.z);
      this.group.add(pinGroup);

      this.pins.push({
        id: cfg.id,
        initialPos: new THREE.Vector3(cfg.x, 0, cfg.z),
        pos: new THREE.Vector3(cfg.x, 0, cfg.z),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(0, 0, 0),
        rotVel: new THREE.Vector3(),
        mesh: pinGroup,
        isFallen: false,
        radius: 0.08
      });
    });
  }

  onEnter() {
    this.resetBall();
    this.rackPins();
  }

  onRestart() {
    this.rackPins();
    this.resetBall();
  }

  resetBall() {
    this.isBallRolling = false;
    this.inGutter = false;
    this.rollTimer = 0;
    this.ballPos.copy(this.ballInitialPos);
    this.ballVel.set(0, 0, 0);

    if (this.ballMesh) {
      this.ballMesh.position.copy(this.ballPos);
      this.ballMesh.rotation.set(0, 0, 0);
    }

    this.state = 'ready';
    this.updatePreviewTrajectory(window.inputManager ? window.inputManager.power : 0.65, 0, 0);
  }

  handleActionStart() {
    if (this.isBallRolling) return;
    this.state = 'aiming';
  }

  handleActionRelease(power, aimX, aimY) {
    if (this.isBallRolling) return;
    this.roll(power, aimX, aimY);
  }

  handleActionTrigger() {
    if (this.isBallRolling) {
      this.resetBall();
    } else {
      const p = window.inputManager ? window.inputManager.power : 0.7;
      const ax = window.inputManager ? window.inputManager.aimX : 0;
      const ay = window.inputManager ? window.inputManager.aimY : 0;
      this.roll(p, ax, ay);
    }
  }

  handleRetry() {
    this.rackPins();
    this.resetBall();
    if (window.soundEngine) window.soundEngine.playUiClick();
  }

  roll(power, aimX, aimY) {
    this.isBallRolling = true;
    this.inGutter = false;
    this.state = 'active';
    this.rollTimer = 0;

    const assist = window.a11y ? window.a11y.getAimAssistanceMultiplier() : 0.65;
    const speed = 7.5 + power * 6.0;

    this.ballVel.x = (aimX * 1.8) * (1.0 - assist * 0.75);
    this.ballVel.y = 0;
    this.ballVel.z = -speed;

    if (window.soundEngine) window.soundEngine.playBowlingRoll();
    if (this.arena) this.arena.hideTrajectory();
  }

  updatePreviewTrajectory(power, aimX, aimY) {
    if (this.isBallRolling || !this.arena) return;

    const assist = window.a11y ? window.a11y.get('aimAssistance') : 'high';
    if (assist === 'off') {
      this.arena.hideTrajectory();
      return;
    }

    const points = [];
    const simPos = new THREE.Vector3().copy(this.ballPos);
    const assistMultiplier = window.a11y ? window.a11y.getAimAssistanceMultiplier() : 0.65;
    const vx = (aimX * 1.8) * (1.0 - assistMultiplier * 0.75);
    const vz = -(7.5 + power * 6.0);
    const dt = 0.05;

    for (let i = 0; i < 25; i++) {
      points.push(simPos.clone());
      simPos.x += vx * dt;
      simPos.z += vz * dt;
      if (simPos.z < this.pinDeckZ) break;
    }

    this.arena.updateTrajectory(points);
  }

  update(delta) {
    this.tickMatch(delta);
    if (!this.isBallRolling) {
      if (window.inputManager) {
        this.updatePreviewTrajectory(
          window.inputManager.power,
          window.inputManager.aimX,
          window.inputManager.aimY
        );
      }
      return;
    }

    this.rollTimer += delta;
    this.ballPos.x += this.ballVel.x * delta;
    this.ballPos.z += this.ballVel.z * delta;

    if (!this.inGutter && Math.abs(this.ballPos.x) > this.laneWidth / 2) {
      this.inGutter = true;
      this.ballVel.x = 0;
      this.ballPos.y = 0.06;
    }

    if (this.ballMesh) {
      this.ballMesh.position.copy(this.ballPos);
      this.ballMesh.rotation.x += this.ballVel.z * delta * 2;
    }

    this.checkPinCollisions(delta);
    this.updateFallenPins(delta);

    if (this.ballPos.z < this.pinDeckZ - 2.5 || this.rollTimer > 3.0) {
      this.finishRoll();
    }
  }

  checkPinCollisions(delta) {
    if (this.inGutter) return;

    let pinsHitThisFrame = 0;
    const diffMods = window.a11y ? window.a11y.getDifficultyModifiers() : { magnetismRadius: 0.4 };

    for (const pin of this.pins) {
      if (!pin.isFallen) {
        const dist = Math.hypot(this.ballPos.x - pin.pos.x, this.ballPos.z - pin.pos.z);
        if (dist < (this.ballRadius + pin.radius + diffMods.magnetismRadius * 0.15)) {
          pin.isFallen = true;
          pinsHitThisFrame++;
          pin.vel.set((pin.pos.x - this.ballPos.x) * 4.0 + (Math.random() - 0.5) * 2, 1.5, this.ballVel.z * 0.45);
          pin.rotVel.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
        }
      }
    }

    for (let i = 0; i < this.pins.length; i++) {
      const p1 = this.pins[i];
      if (p1.isFallen && p1.vel.lengthSq() > 0.5) {
        for (let j = 0; j < this.pins.length; j++) {
          if (i === j) continue;
          const p2 = this.pins[j];
          if (!p2.isFallen) {
            const d = Math.hypot(p1.pos.x - p2.pos.x, p1.pos.z - p2.pos.z);
            if (d < 0.28) {
              p2.isFallen = true;
              pinsHitThisFrame++;
              p2.vel.set(p1.vel.x * 0.7, 1.2, p1.vel.z * 0.7);
              p2.rotVel.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
            }
          }
        }
      }
    }

    if (pinsHitThisFrame > 0 && window.soundEngine) {
      window.soundEngine.playBowlingPinCrash();
      if (this.arena) this.arena.spawnCelebration(this.ballPos, 60);
    }
  }

  updateFallenPins(delta) {
    for (const pin of this.pins) {
      if (pin.isFallen) {
        pin.pos.addScaledVector(pin.vel, delta);
        pin.mesh.position.copy(pin.pos);
        pin.mesh.rotation.x += pin.rotVel.x * delta;
        pin.mesh.rotation.z += pin.rotVel.z * delta;
        pin.vel.multiplyScalar(0.92);
      }
    }
  }

  finishRoll() {
    this.isBallRolling = false;
    const fallenCount = this.pins.filter(p => p.isFallen).length;

    let points = fallenCount * 15;
    let message = `${fallenCount} PINS DOWN!`;

    if (fallenCount === 10) {
      points = 200;
      message = 'STRIKE! 10 PINS! +200';
    } else if (fallenCount === 0) {
      message = this.inGutter ? 'GUTTER BALL' : 'MISS';
    }

    this.registerOutcome(fallenCount > 0, points, message);

    // Auto-rack and reset cleanly in 1s without modals!
    setTimeout(() => {
      this.rackPins();
      this.resetBall();
    }, 1100);
  }
}
