/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * Archery Olympic Bullseye Mode with Real Sticking Physics & Continuous Nocking
 */

class ArcherySport extends SportBase {
  constructor(arena) {
    super(arena, {
      name: 'Archery',
      key: 'archery',
      description: 'Draw bowstring tension, steady your crosshairs, and strike the gold bullseye!'
    });

    this.targetPos = new THREE.Vector3(0, 1.45, -12.0);
    this.targetRadius = 0.65;
    
    this.arrowInitialPos = new THREE.Vector3(0, 1.2, -0.6);
    this.arrowPos = new THREE.Vector3().copy(this.arrowInitialPos);
    this.arrowVel = new THREE.Vector3();
    this.isArrowFlying = false;
    this.hasHitTarget = false;
    this.flightTimer = 0;

    this.targetGroup = null;
    this.bowGroup = null;
    this.arrowMesh = null;
    this.stuckArrows = [];

    this.buildRangeAndBow();
  }

  buildRangeAndBow() {
    this.targetGroup = new THREE.Group();
    this.targetGroup.position.copy(this.targetPos);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 12);
    
    const legLeft = new THREE.Mesh(legGeo, legMat);
    legLeft.position.set(-0.55, -0.4, 0.2);
    legLeft.rotation.z = -0.25;
    this.targetGroup.add(legLeft);

    const legRight = new THREE.Mesh(legGeo, legMat);
    legRight.position.set(0.55, -0.4, 0.2);
    legRight.rotation.z = 0.25;
    this.targetGroup.add(legRight);

    const legBack = new THREE.Mesh(legGeo, legMat);
    legBack.position.set(0, -0.4, -0.5);
    legBack.rotation.x = -0.3;
    this.targetGroup.add(legBack);

    const ringSpecs = [
      { radius: 0.60, color: 0xf8fafc },
      { radius: 0.48, color: 0x1e293b },
      { radius: 0.36, color: 0x0284c7 },
      { radius: 0.24, color: 0xd97706 },
      { radius: 0.12, color: 0xfacc15 }
    ];

    ringSpecs.forEach(r => {
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(r.radius, 32),
        new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.4, side: THREE.DoubleSide })
      );
      disc.position.z = (0.62 - r.radius) * 0.02;
      this.targetGroup.add(disc);
    });

    this.group.add(this.targetGroup);

    // 3D Compound Bow
    this.bowGroup = new THREE.Group();
    const curvePoints = [];
    for (let i = 0; i <= 20; i++) {
      const t = (i / 20) * 2 - 1;
      curvePoints.push(new THREE.Vector3(-0.08 * (1 - t * t), t * 0.45, 0));
    }
    const bowCurve = new THREE.CatmullRomCurve3(curvePoints);
    const bowGeo = new THREE.TubeGeometry(bowCurve, 20, 0.015, 8, false);
    const bowMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5, roughness: 0.2 });
    const bowMesh = new THREE.Mesh(bowGeo, bowMat);
    this.bowGroup.add(bowMesh);

    const stringGeo = new THREE.BufferGeometry().setFromPoints([
      curvePoints[0],
      new THREE.Vector3(0.08, 0, 0),
      curvePoints[curvePoints.length - 1]
    ]);
    const stringMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    this.bowString = new THREE.Line(stringGeo, stringMat);
    this.bowGroup.add(this.bowString);

    this.bowGroup.position.set(-0.25, 1.25, -0.6);
    this.bowGroup.rotation.set(0, 0.15, -0.1);
    this.group.add(this.bowGroup);

    // Arrow
    this.arrowMesh = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.75, 12), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.3 }));
    shaft.rotation.x = Math.PI / 2;
    this.arrowMesh.add(shaft);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 }));
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.4;
    this.arrowMesh.add(tip);

    const vaneMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide });
    for (let f = 0; f < 3; f++) {
      const vane = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.1), vaneMat);
      vane.rotation.z = (f * Math.PI * 2) / 3;
      vane.position.z = 0.32;
      this.arrowMesh.add(vane);
    }

    this.arrowMesh.position.copy(this.arrowInitialPos);
    this.group.add(this.arrowMesh);
  }

  onEnter() {
    this.resetArrow();
  }

  onRestart() {
    this.stuckArrows.forEach(a => this.group.remove(a));
    this.stuckArrows = [];
    this.resetArrow();
  }

  resetArrow() {
    this.isArrowFlying = false;
    this.hasHitTarget = false;
    this.flightTimer = 0;

    const isSeated = window.a11y ? window.a11y.get('seatedMode') : true;
    this.arrowInitialPos.set(0, isSeated ? 1.15 : 1.5, -0.6);
    this.arrowPos.copy(this.arrowInitialPos);
    this.arrowVel.set(0, 0, 0);

    if (this.arrowMesh) {
      this.arrowMesh.position.copy(this.arrowPos);
      this.arrowMesh.rotation.set(0, 0, 0);
    }

    this.state = 'ready';
    this.updatePreviewTrajectory(window.inputManager ? window.inputManager.power : 0.7, 0, 0);
  }

  handleActionStart() {
    if (this.isArrowFlying) return;
    this.state = 'aiming';
  }

  handleActionRelease(power, aimX, aimY) {
    if (this.isArrowFlying) return;
    this.releaseArrow(power, aimX, aimY);
  }

  handleActionTrigger() {
    if (this.isArrowFlying) {
      this.resetArrow();
    } else {
      const p = window.inputManager ? window.inputManager.power : 0.8;
      const ax = window.inputManager ? window.inputManager.aimX : 0;
      const ay = window.inputManager ? window.inputManager.aimY : 0;
      this.releaseArrow(p, ax, ay);
    }
  }

  handleRetry() {
    this.resetArrow();
    if (window.soundEngine) window.soundEngine.playUiClick();
  }

  releaseArrow(power, aimX, aimY) {
    this.isArrowFlying = true;
    this.state = 'active';
    this.flightTimer = 0;

    const forwardDist = Math.abs(this.targetPos.z - this.arrowPos.z);
    const flightTime = 0.55;
    const baseVz = -forwardDist / flightTime;
    const assistMultiplier = window.a11y ? window.a11y.getAimAssistanceMultiplier() : 0.65;
    const aimSpread = (1.0 - assistMultiplier * 0.75);

    this.arrowVel.x = (aimX * 2.8) * aimSpread;
    this.arrowVel.y = ((this.targetPos.y - this.arrowPos.y) + 0.5 * 9.8 * flightTime * flightTime) / flightTime + (aimY * 1.2 * aimSpread);
    this.arrowVel.z = baseVz * (0.85 + power * 0.35);

    if (window.soundEngine) window.soundEngine.playArcheryRelease();
    if (this.arena) this.arena.hideTrajectory();
  }

  updatePreviewTrajectory(power, aimX, aimY) {
    if (this.isArrowFlying || !this.arena) return;

    const assist = window.a11y ? window.a11y.get('aimAssistance') : 'high';
    if (assist === 'off') {
      this.arena.hideTrajectory();
      return;
    }

    const points = [];
    const simPos = new THREE.Vector3().copy(this.arrowPos);
    const forwardDist = Math.abs(this.targetPos.z - this.arrowPos.z);
    const flightTime = 0.55;
    const baseVz = -forwardDist / flightTime;
    const assistMultiplier = window.a11y ? window.a11y.getAimAssistanceMultiplier() : 0.65;
    const aimSpread = (1.0 - assistMultiplier * 0.75);

    const simVel = new THREE.Vector3(
      (aimX * 2.8) * aimSpread,
      ((this.targetPos.y - this.arrowPos.y) + 0.5 * 9.8 * flightTime * flightTime) / flightTime + (aimY * 1.2 * aimSpread),
      baseVz * (0.85 + power * 0.35)
    );

    const dt = 0.025;
    for (let i = 0; i < 28; i++) {
      points.push(simPos.clone());
      simVel.y -= 9.8 * dt;
      simPos.x += simVel.x * dt;
      simPos.y += simVel.y * dt;
      simPos.z += simVel.z * dt;
      if (simPos.z < this.targetPos.z) break;
    }

    this.arena.updateTrajectory(points);
  }

  update(delta) {
    this.tickMatch(delta);
    if (!this.isArrowFlying) {
      if (window.inputManager) {
        this.updatePreviewTrajectory(
          window.inputManager.power,
          window.inputManager.aimX,
          window.inputManager.aimY
        );
      }
      return;
    }

    this.flightTimer += delta;
    this.arrowVel.y -= 9.8 * delta;
    this.arrowPos.addScaledVector(this.arrowVel, delta);

    if (this.arrowMesh) {
      this.arrowMesh.position.copy(this.arrowPos);
      if (this.arrowVel.lengthSq() > 0.1) {
        this.arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), this.arrowVel.clone().normalize());
      }
    }

    if (this.arrowPos.z <= this.targetPos.z) {
      this.checkTargetHit();
    } else if (this.flightTimer > 2.0) {
      this.finishArrow(false);
    }
  }

  checkTargetHit() {
    this.isArrowFlying = false;
    const hitX = this.arrowPos.x;
    const hitY = this.arrowPos.y;
    const distFromCenter = Math.hypot(hitX - this.targetPos.x, hitY - this.targetPos.y);

    const diffMods = window.a11y ? window.a11y.getDifficultyModifiers() : { targetSizeScale: 1.3 };
    const maxRadius = this.targetRadius * diffMods.targetSizeScale;

    if (distFromCenter <= maxRadius) {
      this.hasHitTarget = true;
      let ringPoints = 20;
      let ringLabel = 'WHITE RING';
      let isBullseye = false;

      if (distFromCenter <= 0.13 * diffMods.targetSizeScale) {
        ringPoints = 100;
        ringLabel = 'GOLD BULLSEYE!';
        isBullseye = true;
      } else if (distFromCenter <= 0.25 * diffMods.targetSizeScale) {
        ringPoints = 80;
        ringLabel = 'RED RING';
      } else if (distFromCenter <= 0.38 * diffMods.targetSizeScale) {
        ringPoints = 60;
        ringLabel = 'BLUE RING';
      } else if (distFromCenter <= 0.50 * diffMods.targetSizeScale) {
        ringPoints = 40;
        ringLabel = 'BLACK RING';
      }

      if (window.soundEngine) window.soundEngine.playArcheryHit(isBullseye);
      if (this.arena) this.arena.spawnCelebration(this.arrowPos, isBullseye ? 90 : 50);

      const stuckArrow = this.arrowMesh.clone();
      stuckArrow.position.copy(this.arrowPos);
      this.group.add(stuckArrow);
      this.stuckArrows.push(stuckArrow);

      this.registerOutcome(true, ringPoints, `${ringLabel}! +${ringPoints}`);
    } else {
      if (window.soundEngine) window.soundEngine.playArcheryHit(false);
      this.registerOutcome(false, 0, 'ARROW MISSED TARGET');
    }

    // Auto-nock new arrow in 0.8s
    setTimeout(() => this.resetArrow(), 800);
  }

  finishArrow(hit) {
    this.isArrowFlying = false;
    if (!hit) {
      this.registerOutcome(false, 0, 'SHOT WIDE');
    }
    setTimeout(() => this.resetArrow(), 800);
  }
}
