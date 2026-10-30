/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * Football / Soccer Team Match Mode: Passing, Teammate Crosses, Volleys, Diving Goalkeeper & Match Win
 * Blue Team (#10 Winger, #9 Striker, You) vs Red Team (#4 Defender, #5 Defender, #1 Goalkeeper)
 */

class FootballSport extends SportBase {
  constructor(arena) {
    super(arena, {
      name: 'Football / Soccer',
      key: 'football',
      description: 'Full Match: Pass to open wingers, strike on goal, beat the keeper, and lead Blue Team to victory!'
    });

    this.goalWidth = 5.2;
    this.goalHeight = 2.2;
    this.goalDepth = 1.8;
    this.goalZ = -10.5;

    this.ballRadius = 0.22;
    this.ballInitialPos = new THREE.Vector3(0, 0.22, -1.6);
    this.ballPos = new THREE.Vector3().copy(this.ballInitialPos);
    this.ballVel = new THREE.Vector3();
    this.ballPrevPos = new THREE.Vector3();
    
    this.isBallInAir = false;
    this.isPassing = false;
    this.hasScored = false;
    this.shotTimer = 0;
    this.isOpponentAttacking = false;

    this.targets = [];
    this.teammates = [];
    this.defenders = [];
    this.goalkeeper = null;
    this.activeReceiver = null;

    this.buildPitchAndGoal();
    this.buildMatchPlayers();
  }

  buildPitchAndGoal() {
    const pitchMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(16, 20), pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(0, 0.01, -6);
    pitch.receiveShadow = true;
    this.group.add(pitch);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), lineMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0.02, this.ballInitialPos.z);
    this.group.add(spot);

    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
    const postRadius = 0.06;

    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, this.goalHeight, 16), postMat);
    leftPost.position.set(-this.goalWidth / 2, this.goalHeight / 2, this.goalZ);
    this.group.add(leftPost);

    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, this.goalHeight, 16), postMat);
    rightPost.position.set(this.goalWidth / 2, this.goalHeight / 2, this.goalZ);
    this.group.add(rightPost);

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, this.goalWidth, 16), postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, this.goalHeight, this.goalZ);
    this.group.add(crossbar);

    const netGeo = new THREE.BoxGeometry(this.goalWidth, this.goalHeight, this.goalDepth);
    const netMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, wireframe: true, transparent: true, opacity: 0.35 });
    const netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set(0, this.goalHeight / 2, this.goalZ - this.goalDepth / 2);
    this.group.add(netMesh);

    // Corner Target Discs
    const targetConfigs = [
      { id: 'top-left', x: -this.goalWidth / 2 + 0.6, y: this.goalHeight - 0.5, pts: 1 },
      { id: 'top-right', x: this.goalWidth / 2 - 0.6, y: this.goalHeight - 0.5, pts: 1 },
      { id: 'bottom-left', x: -this.goalWidth / 2 + 0.6, y: 0.55, pts: 1 },
      { id: 'bottom-right', x: this.goalWidth / 2 - 0.6, y: 0.55, pts: 1 }
    ];

    targetConfigs.forEach(cfg => {
      const targetGroup = new THREE.Group();
      targetGroup.position.set(cfg.x, cfg.y, this.goalZ);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }));
      targetGroup.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      targetGroup.add(disc);
      this.targets.push({ id: cfg.id, pos: new THREE.Vector3(cfg.x, cfg.y, this.goalZ), radius: 0.45, points: cfg.pts, mesh: targetGroup });
      this.group.add(targetGroup);
    });

    const ballCanvas = document.createElement('canvas');
    ballCanvas.width = 256; ballCanvas.height = 128;
    const bCtx = ballCanvas.getContext('2d');
    bCtx.fillStyle = '#ffffff'; bCtx.fillRect(0, 0, 256, 128);
    bCtx.fillStyle = '#0f172a';
    for (let x = 32; x < 256; x += 64) {
      for (let y = 32; y < 128; y += 64) {
        bCtx.beginPath(); bCtx.arc(x, y, 16, 0, Math.PI * 2); bCtx.fill();
      }
    }
    const ballTex = new THREE.CanvasTexture(ballCanvas);
    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(this.ballRadius, 32, 32), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.5 }));
    this.ballMesh.castShadow = true;
    this.ballMesh.position.copy(this.ballInitialPos);
    this.group.add(this.ballMesh);
  }

  buildMatchPlayers() {
    // Teammate 1: Striker #9 (Right Wing) - Facing toward goal (-2.69 rad)
    const t1 = new HumanoidCharacter({
      name: 'Striker_#9',
      role: 'football_teammate',
      jerseyColor: 0x0284c7,
      shortsColor: 0x0f172a,
      scale: 1.05,
      baseRotationY: -2.69
    });
    t1.group.position.set(2.8, 0, -6.2);
    t1.baseX = 2.8; t1.baseZ = -6.2;
    this.teammates.push(t1);
    this.group.add(t1.group);

    // Teammate 2: Winger #10 (Left Wing) - Facing toward goal (2.72 rad)
    const t2 = new HumanoidCharacter({
      name: 'Winger_#10',
      role: 'football_teammate',
      jerseyColor: 0x0284c7,
      shortsColor: 0x0f172a,
      scale: 1.05,
      baseRotationY: 2.72
    });
    t2.group.position.set(-2.8, 0, -5.8);
    t2.baseX = -2.8; t2.baseZ = -5.8;
    this.teammates.push(t2);
    this.group.add(t2.group);

    // Defender 1: Center-back #4 - Facing offensive player (0 rad)
    const d1 = new HumanoidCharacter({
      name: 'Defender_#4',
      role: 'football_defender',
      jerseyColor: 0xdc2626,
      shortsColor: 0x111827,
      scale: 1.08,
      baseRotationY: 0
    });
    d1.group.position.set(1.4, 0, -7.5);
    d1.baseX = 1.4; d1.baseZ = -7.5;
    this.defenders.push(d1);
    this.group.add(d1.group);

    // Defender 2: Full-back #5 - Facing offensive player (0 rad)
    const d2 = new HumanoidCharacter({
      name: 'Defender_#5',
      role: 'football_defender',
      jerseyColor: 0xdc2626,
      shortsColor: 0x111827,
      scale: 1.05,
      baseRotationY: 0
    });
    d2.group.position.set(-1.4, 0, -7.2);
    d2.baseX = -1.4; d2.baseZ = -7.2;
    this.defenders.push(d2);
    this.group.add(d2.group);

    // Goalkeeper #1 - Facing the penalty box / player (0 rad)
    this.goalkeeper = new HumanoidCharacter({
      name: 'Goalkeeper_#1',
      role: 'goalkeeper',
      jerseyColor: 0x059669, // Green jersey
      shortsColor: 0x0f172a,
      scale: 1.08,
      baseRotationY: 0
    });
    this.goalkeeper.group.position.set(0, 0, this.goalZ + 0.3);
    this.goalkeeper.baseX = 0;
    this.goalkeeper.baseZ = this.goalZ + 0.3;
    this.group.add(this.goalkeeper.group);
  }

  onEnter() {
    this.resetBall(true);
  }

  onRestart() {
    this.isOpponentAttacking = false;
    this.resetBall(true);
  }

  onPlayerMoved(x, z) {
    if (!this.isBallInAir && !this.isOpponentAttacking) {
      this.resetBall(false);
    }
  }

  resetBall(autoReturnPlayer = false) {
    this.isBallInAir = false;
    this.isPassing = false;
    this.hasScored = false;
    this.shotTimer = 0;
    this.activeReceiver = null;
    this.possession = 'player';

    // Reset teammates, defenders, and goalkeeper
    if (this.teammates) this.teammates.forEach(tm => tm.resetToBasePosition());
    if (this.defenders) this.defenders.forEach(df => df.resetToBasePosition());

    if (autoReturnPlayer && this.arena && this.arena.setTacticalSpot) {
      this.arena.setTacticalSpot('home');
    }

    const playerX = this.arena && this.arena.cameraRig ? this.arena.cameraRig.position.x : 0;
    const playerZ = this.arena && this.arena.cameraRig ? this.arena.cameraRig.position.z : 0;
    const playerYaw = this.arena ? this.arena.cameraYaw : 0;
    const fwdX = -Math.sin(playerYaw);
    const fwdZ = -Math.cos(playerYaw);

    this.ballInitialPos.set(playerX + fwdX * 0.8, 0.22, playerZ + fwdZ * 0.8);
    this.ballPos.copy(this.ballInitialPos);
    this.ballVel.set(0, 0, 0);

    if (this.ballMesh) {
      this.ballMesh.position.copy(this.ballPos);
      this.ballMesh.rotation.set(0, 0, 0);
      this.ballMesh.visible = true;
    }

    if (this.goalkeeper) {
      this.goalkeeper.group.position.set(0, 0, this.goalZ + 0.3);
      this.goalkeeper.group.rotation.set(0, 0, 0);
    }

    this.state = 'ready';
    this.updatePreviewTrajectory(window.inputManager ? window.inputManager.power : 0.65, 0, 0);
  }

  handleActionStart() {
    if (this.isBallInAir || this.isOpponentAttacking) return;
    this.state = 'aiming';
  }

  handleActionRelease(power, aimX, aimY) {
    if (this.isBallInAir || this.isOpponentAttacking) return;
    this.kick(power, aimX, aimY);
  }

  handleActionTrigger() {
    if (this.isOpponentAttacking) return;
    if (this.isBallInAir) {
      this.resetBall();
    } else {
      const p = window.inputManager ? window.inputManager.power : 0.7;
      const ax = window.inputManager ? window.inputManager.aimX : 0;
      const ay = window.inputManager ? window.inputManager.aimY : 0;
      this.kick(p, ax, ay);
    }
  }

  /* -------------------------------------------------------------
     FOOTBALL PASSING & TEAMMATE VOLLEY
     ------------------------------------------------------------- */
  handlePass(direction) {
    if (this.isBallInAir || this.isOpponentAttacking) return;

    let receiver = null;
    if (direction === 'left') {
      receiver = this.teammates[1]; // #10 Winger
    } else if (direction === 'right') {
      receiver = this.teammates[0]; // #9 Striker
    } else {
      const aimX = window.inputManager ? window.inputManager.aimX : 0;
      receiver = aimX < 0 ? this.teammates[1] : this.teammates[0];
    }

    if (!receiver) return;

    this.activeReceiver = receiver;
    this.isBallInAir = true;
    this.isPassing = true;
    this.possession = 'teammate';
    this.shotTimer = 0;

    const targetPos = new THREE.Vector3(
      receiver.group.position.x,
      0.35,
      receiver.group.position.z
    );

    const flightTime = 0.65;
    this.ballVel.set(
      (targetPos.x - this.ballPos.x) / flightTime,
      (targetPos.y - this.ballPos.y + 0.5 * 9.8 * flightTime * flightTime) / flightTime,
      (targetPos.z - this.ballPos.z) / flightTime
    );

    if (window.soundEngine) window.soundEngine.playFootballKick();
    if (this.arena) this.arena.hideTrajectory();

    // Receiver connects with volley on goal!
    receiver.triggerCatchAndShoot(() => {
      this.executeTeammateVolley(receiver);
    });

    if (window.a11y) {
      window.a11y.announce(`Crossed to ${receiver.name}! Connecting with volley strike!`);
    }
  }

  executeTeammateVolley(teammate) {
    this.isPassing = false;
    this.hasScored = false;
    this.ballPos.set(teammate.group.position.x, 0.45, teammate.group.position.z);

    const flightTime = 0.65;
    const targetX = teammate.group.position.x > 0 ? -1.8 : 1.8;
    this.ballVel.set(
      (targetX - this.ballPos.x) / flightTime,
      (1.4 - this.ballPos.y + 0.5 * 9.8 * flightTime * flightTime) / flightTime,
      (this.goalZ - this.ballPos.z) / flightTime
    );

    if (window.soundEngine) window.soundEngine.playFootballKick();
  }

  handleRetry() {
    this.resetBall();
    if (window.soundEngine) window.soundEngine.playUiClick();
  }

  calculateKickVelocity(power, aimX, aimY) {
    const dx = 0 - this.ballPos.x;
    const dz = this.goalZ - this.ballPos.z;
    const forwardDist = Math.hypot(dx, dz);
    const flightTime = Math.max(0.7, Math.min(1.4, forwardDist * 0.1 + 0.3));
    const baseHorizVel = forwardDist / flightTime;

    const dirX = dx / (forwardDist || 1);
    const dirZ = dz / (forwardDist || 1);
    const perpX = -dirZ;
    const perpZ = dirX;

    const assistMultiplier = window.a11y ? window.a11y.getAimAssistanceMultiplier() : 0.65;
    const aimSpread = (1.0 - assistMultiplier * 0.75);
    const speedScale = 0.8 + power * 0.45;

    return new THREE.Vector3(
      dirX * baseHorizVel * speedScale + perpX * (aimX * 3.8 * aimSpread),
      1.8 + (aimY + 1) * 2.8 * (0.8 + power * 0.5),
      dirZ * baseHorizVel * speedScale + perpZ * (aimX * 3.8 * aimSpread)
    );
  }

  kick(power, aimX, aimY) {
    this.isBallInAir = true;
    this.isPassing = false;
    this.state = 'active';
    this.possession = 'player';
    this.shotTimer = 0;
    this.stats.shotsAttempted++;

    this.ballVel.copy(this.calculateKickVelocity(power, aimX, aimY));

    if (window.soundEngine) window.soundEngine.playFootballKick();
    if (this.arena) this.arena.hideTrajectory();
  }

  updatePreviewTrajectory(power, aimX, aimY) {
    if (this.isBallInAir || !this.arena || this.isOpponentAttacking) return;

    const assist = window.a11y ? window.a11y.get('aimAssistance') : 'high';
    if (assist === 'off') {
      this.arena.hideTrajectory();
      return;
    }

    const points = [];
    const simPos = new THREE.Vector3().copy(this.ballPos);
    const simVel = this.calculateKickVelocity(power, aimX, aimY);

    const dt = 0.035;
    for (let i = 0; i < 30; i++) {
      points.push(simPos.clone());
      simVel.y -= 9.8 * dt;
      simPos.x += simVel.x * dt;
      simPos.y += simVel.y * dt;
      simPos.z += simVel.z * dt;
      if (simPos.y < 0.22 || simPos.z < this.goalZ - 1.5) break;
    }

    this.arena.updateTrajectory(points);
  }

  update(delta) {
    this.tickMatch(delta);

    const aimX = window.inputManager ? window.inputManager.aimX : 0;

    if (this.goalkeeper) this.goalkeeper.update(delta, aimX, this.isBallInAir);
    this.teammates.forEach(tm => tm.update(delta, aimX, this.isBallInAir));
    this.defenders.forEach(df => df.update(delta, aimX, this.isBallInAir));

    if (!this.isBallInAir && !this.isOpponentAttacking) {
      if (window.inputManager) {
        this.updatePreviewTrajectory(
          window.inputManager.power,
          window.inputManager.aimX,
          window.inputManager.aimY
        );
      }
      return;
    }

    this.shotTimer += delta;
    this.ballVel.y -= 9.8 * delta;
    this.ballPos.addScaledVector(this.ballVel, delta);

    if (this.ballMesh) {
      this.ballMesh.position.copy(this.ballPos);
      this.ballMesh.rotation.x += this.ballVel.z * delta * 2;
    }

    if (!this.isPassing && !this.isOpponentAttacking) {
      this.checkGoalAndTargets();
    }

    if (this.ballPos.y <= this.ballRadius) {
      this.ballPos.y = this.ballRadius;
      this.ballVel.y = -this.ballVel.y * 0.4;
      this.ballVel.x *= 0.85;
      this.ballVel.z *= 0.85;
    }

    if (this.shotTimer > 2.8) {
      this.handleShotResolution();
    }
  }

  checkGoalAndTargets() {
    if (this.hasScored) return;

    for (const target of this.targets) {
      const dist = this.ballPos.distanceTo(target.pos);
      const diffMods = window.a11y ? window.a11y.getDifficultyModifiers() : { targetSizeScale: 1.3 };
      if (dist < (target.radius * diffMods.targetSizeScale + this.ballRadius)) {
        this.hasScored = true;
        if (window.soundEngine) window.soundEngine.playGoalCheer();
        if (this.arena) this.arena.spawnCelebration(target.pos, 100);
        this.awardScore('home', 1, `CORNER BULLSEYE GOAL! +1`);
        return;
      }
    }

    if (this.ballPos.z <= this.goalZ && this.ballPos.z >= this.goalZ - 1.0) {
      const insideGoalX = Math.abs(this.ballPos.x) < (this.goalWidth / 2 - 0.1);
      const insideGoalY = this.ballPos.y > 0.1 && this.ballPos.y < this.goalHeight;

      if (insideGoalX && insideGoalY) {
        this.hasScored = true;
        const isAssist = !!this.activeReceiver;
        const msg = isAssist ? 'TEAM VOLLEY GOAL! ASSIST! +1' : 'GOAL SCORED! +1';

        if (window.soundEngine) window.soundEngine.playGoalCheer();
        if (this.arena) this.arena.spawnCelebration(this.ballPos, 80);
        this.awardScore('home', 1, msg, isAssist);
      }
    }
  }

  handleShotResolution() {
    if (this.hasScored) {
      setTimeout(() => this.startOpponentCounterAttack(), 700);
    } else {
      this.registerMiss('SHOT SAVED OR WIDE!');
      setTimeout(() => this.startOpponentCounterAttack(), 800);
    }
  }

  startOpponentCounterAttack() {
    if (!this.isMatchActive) return;
    this.isOpponentAttacking = true;
    this.possession = 'opponent';
    this.isBallInAir = false;

    this.showFeedback('RED COUNTER-ATTACK!', 'WATCH OUT FOR INCOMING STRIKE', false);

    // Ball moves to midfield
    this.ballPos.set(0, 0.22, -6.5);
    if (this.ballMesh) this.ballMesh.position.copy(this.ballPos);

    setTimeout(() => {
      // Opponent launches strike towards our half
      this.isBallInAir = true;
      this.ballVel.set((Math.random() - 0.5) * 3, 2.5, 5.0);

      const aiScores = Math.random() < 0.35; // 35% chance opponent scores
      setTimeout(() => {
        if (aiScores) {
          if (window.soundEngine) window.soundEngine.playCrowdGroan();
          this.awardScore('away', 1, 'RED TEAM SCORES A COUNTER GOAL!');
        } else {
          if (window.soundEngine) window.soundEngine.playFootballKick();
          this.showFeedback('KEEPER SAVES!', 'BLUE REPOSSESSION', true);
        }

        setTimeout(() => {
          this.isOpponentAttacking = false;
          this.resetBall();
        }, 1100);
      }, 1000);
    }, 900);
  }
}

window.FootballSport = FootballSport;
