/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * Badminton Precision Mode with 3D Animated Opponent & Continuous Play
 */

class BadmintonSport extends SportBase {
  constructor(arena) {
    super(arena, {
      name: 'Badminton',
      key: 'badminton',
      description: 'Smash and drop-shot the shuttlecock over the high net against the 3D opponent.'
    });

    this.netZ = -4.5;
    this.netHeight = 1.52;
    this.launcherPos = new THREE.Vector3(0, 2.2, -9.5);

    this.shuttlePos = new THREE.Vector3();
    this.shuttleVel = new THREE.Vector3();
    this.isShuttleActive = false;
    this.shuttlePhase = 'incoming';
    this.hasHit = false;
    this.hasScored = false;

    this.shuttleMesh = null;
    this.courtTargets = [];
    this.opponent = null;

    this.buildCourtAndShuttle();
    this.buildOpponent();
  }

  buildCourtAndShuttle() {
    const courtMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.6 });
    const court = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 13.4), courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.01, -4.5);
    court.receiveShadow = true;
    this.group.add(court);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const shortServiceLine = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 0.06), lineMat);
    shortServiceLine.rotation.x = -Math.PI / 2;
    shortServiceLine.position.set(0, 0.02, -6.5);
    this.group.add(shortServiceLine);

    const netGeo = new THREE.PlaneGeometry(6.4, 0.76);
    const netMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true, transparent: true, opacity: 0.6 });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(0, this.netHeight - 0.38, this.netZ);
    this.group.add(net);

    const tape = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.07, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    tape.position.set(0, this.netHeight, this.netZ);
    this.group.add(tape);

    const targetConfigs = [
      { x: -1.8, z: -8.5, pts: 100 },
      { x: 1.8, z: -8.5, pts: 100 },
      { x: 0, z: -6.2, pts: 70 }
    ];

    targetConfigs.forEach(cfg => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.65, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(cfg.x, 0.03, cfg.z);
      this.group.add(ring);
      this.courtTargets.push({ pos: new THREE.Vector3(cfg.x, 0.03, cfg.z), radius: 0.65, points: cfg.pts });
    });

    this.shuttleMesh = new THREE.Group();
    const cork = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
    cork.rotation.x = Math.PI;
    this.shuttleMesh.add(cork);

    const feather = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.035, 0.1, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xf8fafc, wireframe: true, transparent: true, opacity: 0.85 }));
    feather.position.set(0, 0.05, 0);
    this.shuttleMesh.add(feather);
    this.group.add(this.shuttleMesh);
  }

  buildOpponent() {
    this.opponent = new HumanoidCharacter({
      name: 'BadmintonOpponent',
      role: 'badminton_opponent',
      jerseyColor: 0x14b8a6, // Teal opponent kit
      shortsColor: 0x1e293b,
      scale: 1.05
    });
    this.opponent.group.position.set(0, 0, -9.0);
    this.group.add(this.opponent.group);
  }

  onEnter() {
    this.serveShuttle();
  }

  onRestart() {
    this.serveShuttle();
  }

  serveShuttle() {
    this.isShuttleActive = true;
    this.shuttlePhase = 'incoming';
    this.hasHit = false;
    this.hasScored = false;

    this.shuttlePos.copy(this.launcherPos);
    const target = new THREE.Vector3(0.1, 1.45, -0.7);
    const flightTime = 1.45;

    this.shuttleVel.set(
      (target.x - this.shuttlePos.x) / flightTime,
      (target.y - this.shuttlePos.y + 0.5 * 6.5 * flightTime * flightTime) / flightTime,
      (target.z - this.shuttlePos.z) / flightTime
    );

    this.shuttleMesh.position.copy(this.shuttlePos);
    this.state = 'ready';
  }

  handleActionStart() {}

  handleActionRelease(power, aimX, aimY) {
    this.attemptHit(power, aimX, aimY);
  }

  handleActionTrigger() {
    const p = window.inputManager ? window.inputManager.power : 0.75;
    const ax = window.inputManager ? window.inputManager.aimX : 0;
    const ay = window.inputManager ? window.inputManager.aimY : 0;
    this.attemptHit(p, ax, ay);
  }

  handleRetry() {
    this.serveShuttle();
    if (window.soundEngine) window.soundEngine.playUiClick();
  }

  attemptHit(power, aimX, aimY) {
    if (!this.isShuttleActive || this.shuttlePhase !== 'incoming' || this.hasHit) return;

    const distToStrike = Math.abs(this.shuttlePos.z - (-0.7));
    const diffMods = window.a11y ? window.a11y.getDifficultyModifiers() : { timingWindowMs: 700 };
    const timingTolerance = (diffMods.timingWindowMs / 1000) * 4.0;

    if (distToStrike <= timingTolerance) {
      this.hasHit = true;
      this.shuttlePhase = 'returned';

      if (window.soundEngine) window.soundEngine.playBadmintonShuttleHit();

      const assist = window.a11y ? window.a11y.getAimAssistanceMultiplier() : 0.65;
      this.shuttleVel.x = (aimX * 3.5) * (1.0 - assist * 0.7);
      this.shuttleVel.y = 2.4 + (aimY + 1) * 1.8;
      this.shuttleVel.z = -7.5 * (0.8 + power * 0.5);

      if (this.arena) this.arena.spawnCelebration(this.shuttlePos, 50);
    } else {
      if (window.soundEngine) window.soundEngine.playUiClick();
    }
  }

  update(delta) {
    this.tickMatch(delta);
    const aimX = window.inputManager ? window.inputManager.aimX : 0;
    if (this.opponent) {
      this.opponent.update(delta, aimX, this.hasHit);
    }

    if (!this.isShuttleActive) return;

    this.shuttleVel.x *= 0.97;
    this.shuttleVel.z *= 0.97;
    this.shuttleVel.y -= 7.5 * delta;

    this.shuttlePos.addScaledVector(this.shuttleVel, delta);
    this.shuttleMesh.position.copy(this.shuttlePos);

    if (this.shuttleVel.lengthSq() > 0.05) {
      this.shuttleMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        this.shuttleVel.clone().normalize()
      );
    }

    if (this.shuttlePos.y <= 0.05) {
      this.shuttlePos.y = 0.05;
      if (this.shuttlePhase === 'returned' && !this.hasScored) {
        this.checkLandingOutcome();
      }
    }

    if (this.shuttlePhase === 'incoming' && this.shuttlePos.z > 0.6) {
      this.isShuttleActive = false;
      this.registerOutcome(false, 0, 'SHUTTLE MISSED');
      setTimeout(() => this.serveShuttle(), 850);
    }
  }

  checkLandingOutcome() {
    this.hasScored = true;
    this.isShuttleActive = false;

    const insideCourt = Math.abs(this.shuttlePos.x) <= 3.05 && this.shuttlePos.z <= this.netZ && this.shuttlePos.z >= -11.0;

    if (!insideCourt) {
      this.registerOutcome(false, 0, 'OUT OF COURT');
    } else {
      let hitTarget = null;
      for (const t of this.courtTargets) {
        if (this.shuttlePos.distanceTo(t.pos) <= t.radius) {
          hitTarget = t;
          break;
        }
      }

      const pts = hitTarget ? hitTarget.points : 50;
      const msg = hitTarget ? `SMASH TARGET! +${pts}` : `COURT POINT! +${pts}`;

      if (this.arena) this.arena.spawnCelebration(this.shuttlePos, 70);
      this.registerOutcome(true, pts, msg);
    }

    setTimeout(() => this.serveShuttle(), 950);
  }
}
