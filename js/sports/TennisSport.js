/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * Tennis Rally Mode with 3D Animated Opponent & Continuous Play
 */

class TennisSport extends SportBase {
  constructor(arena) {
    super(arena, {
      name: 'Tennis',
      key: 'tennis',
      description: 'Rally serves back and forth over the net with the animated 3D opponent.'
    });

    this.netZ = -5.0;
    this.netHeight = 0.92;
    this.launcherPos = new THREE.Vector3(0, 0.8, -11.5);
    
    this.ballRadius = 0.12;
    this.ballPos = new THREE.Vector3();
    this.ballVel = new THREE.Vector3();
    this.isBallActive = false;
    this.ballPhase = 'incoming';
    
    this.hasHitBall = false;
    this.hasScored = false;

    this.racketGroup = null;
    this.courtTargets = [];
    this.opponent = null;

    this.buildCourtAndRacket();
    this.buildOpponent();
  }

  buildCourtAndRacket() {
    const courtMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 });
    const court = new THREE.Mesh(new THREE.PlaneGeometry(8, 16), courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.01, -5.5);
    court.receiveShadow = true;
    this.group.add(court);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.08), lineMat);
    bl.rotation.x = -Math.PI / 2;
    bl.position.set(0, 0.02, -13);
    this.group.add(bl);

    const netGeo = new THREE.PlaneGeometry(8.5, this.netHeight);
    const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.55 });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(0, this.netHeight / 2, this.netZ);
    this.group.add(net);

    const tape = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    tape.position.set(0, this.netHeight, this.netZ);
    this.group.add(tape);

    const targetConfigs = [
      { x: -2.2, z: -10.5, pts: 100 },
      { x: 2.2, z: -10.5, pts: 100 },
      { x: 0, z: -8.0, pts: 60 }
    ];

    targetConfigs.forEach(cfg => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.8, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(cfg.x, 0.03, cfg.z);
      this.group.add(ring);
      this.courtTargets.push({ pos: new THREE.Vector3(cfg.x, 0.03, cfg.z), radius: 0.8, points: cfg.pts });
    });

    // 3D Tennis Racket
    this.racketGroup = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.35, 12), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 }));
    handle.position.set(0, -0.2, 0);
    this.racketGroup.add(handle);

    const headFrame = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 12, 24), new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.4, roughness: 0.3 }));
    headFrame.scale.set(1, 1.25, 1);
    this.racketGroup.add(headFrame);

    const strings = new THREE.Mesh(new THREE.CircleGeometry(0.17, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.4 }));
    strings.scale.set(1, 1.25, 1);
    this.racketGroup.add(strings);

    this.racketGroup.position.set(0.35, 1.1, -0.6);
    this.racketGroup.rotation.set(0.2, -0.4, 0.3);
    this.group.add(this.racketGroup);

    const ballMat = new THREE.MeshStandardMaterial({ color: 0xccff00, roughness: 0.8 });
    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(this.ballRadius, 24, 24), ballMat);
    this.ballMesh.castShadow = true;
    this.group.add(this.ballMesh);
  }

  buildOpponent() {
    this.opponent = new HumanoidCharacter({
      name: 'TennisOpponent',
      role: 'tennis_opponent',
      jerseyColor: 0x2563eb,
      shortsColor: 0xffffff,
      scale: 1.05
    });
    this.opponent.group.position.set(0, 0, -11.0);
    this.group.add(this.opponent.group);
  }

  onEnter() {
    this.serveBall();
  }

  onRestart() {
    this.serveBall();
  }

  serveBall() {
    this.isBallActive = true;
    this.ballPhase = 'incoming';
    this.hasHitBall = false;
    this.hasScored = false;

    this.ballPos.copy(this.launcherPos);
    const strikeZone = new THREE.Vector3(0.25, 1.15, -0.8);
    const flightTime = 1.35;
    
    this.ballVel.set(
      (strikeZone.x - this.ballPos.x) / flightTime,
      (strikeZone.y - this.ballPos.y + 0.5 * 9.8 * flightTime * flightTime) / flightTime,
      (strikeZone.z - this.ballPos.z) / flightTime
    );

    this.ballMesh.position.copy(this.ballPos);
    this.state = 'ready';
  }

  handleActionStart() {}

  handleActionRelease(power, aimX, aimY) {
    this.attemptSwing(power, aimX, aimY);
  }

  handleActionTrigger() {
    const p = window.inputManager ? window.inputManager.power : 0.75;
    const ax = window.inputManager ? window.inputManager.aimX : 0;
    const ay = window.inputManager ? window.inputManager.aimY : 0;
    this.attemptSwing(p, ax, ay);
  }

  handleRetry() {
    this.serveBall();
    if (window.soundEngine) window.soundEngine.playUiClick();
  }

  attemptSwing(power, aimX, aimY) {
    if (!this.isBallActive || this.ballPhase !== 'incoming' || this.hasHitBall) return;

    if (this.racketGroup) {
      this.racketGroup.rotation.y = 0.8;
      setTimeout(() => {
        if (this.racketGroup) this.racketGroup.rotation.set(0.2, -0.4, 0.3);
      }, 250);
    }

    const distToStrike = Math.abs(this.ballPos.z - (-0.8));
    const diffMods = window.a11y ? window.a11y.getDifficultyModifiers() : { timingWindowMs: 700 };
    const timingTolerance = (diffMods.timingWindowMs / 1000) * 4.5;

    if (distToStrike <= timingTolerance) {
      this.hasHitBall = true;
      this.ballPhase = 'returned';

      if (window.soundEngine) window.soundEngine.playRacketHit();

      const assist = window.a11y ? window.a11y.getAimAssistanceMultiplier() : 0.65;
      const targetDist = 9.0;
      const returnTime = 1.1;

      this.ballVel.x = (aimX * 3.2) * (1.0 - assist * 0.7);
      this.ballVel.y = 3.6 + (aimY + 1) * 1.5;
      this.ballVel.z = -targetDist / returnTime * (0.8 + power * 0.4);

      if (this.arena) this.arena.spawnCelebration(this.ballPos, 40);
    } else {
      if (window.soundEngine) window.soundEngine.playUiClick();
    }
  }

  update(delta) {
    this.tickMatch(delta);
    const aimX = window.inputManager ? window.inputManager.aimX : 0;
    if (this.opponent) {
      this.opponent.update(delta, aimX, this.hasHitBall);
    }

    if (!this.isBallActive) return;

    this.ballVel.y -= 9.8 * delta;
    this.ballPos.addScaledVector(this.ballVel, delta);
    this.ballMesh.position.copy(this.ballPos);

    if (this.ballPos.y <= this.ballRadius) {
      this.ballPos.y = this.ballRadius;
      this.ballVel.y = -this.ballVel.y * 0.65;

      if (this.ballPhase === 'returned' && !this.hasScored) {
        this.checkBounceOutcome();
      }
    }

    if (this.ballPhase === 'incoming' && this.ballPos.z > 0.5) {
      this.isBallActive = false;
      this.registerOutcome(false, 0, 'BALL PASSED (SWING EARLIER)');
      setTimeout(() => this.serveBall(), 900);
    }
  }

  checkBounceOutcome() {
    this.hasScored = true;
    this.isBallActive = false;

    const insideCourt = Math.abs(this.ballPos.x) <= 3.8 && this.ballPos.z <= this.netZ && this.ballPos.z >= -13.0;

    if (!insideCourt) {
      this.registerOutcome(false, 0, 'OUT OF BOUNDS');
    } else {
      let targetHit = null;
      for (const t of this.courtTargets) {
        if (this.ballPos.distanceTo(t.pos) <= t.radius) {
          targetHit = t;
          break;
        }
      }

      const pts = targetHit ? targetHit.points : 50;
      const msg = targetHit ? `TARGET ACE! +${pts}` : `IN PLAY! +${pts}`;

      if (this.arena) this.arena.spawnCelebration(this.ballPos, 70);
      this.registerOutcome(true, pts, msg);
    }

    setTimeout(() => this.serveBall(), 1000);
  }
}
