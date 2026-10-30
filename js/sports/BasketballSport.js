/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * Basketball Match Mode: Full 3v3 Court Match with Passing, Misses, Rebounds, Opponent Counters & Championship Win
 * Blue Team (#0 You, #7 Wing, #11 Point) vs Red Team (#23 Guard, #34 Center, #15 Wing Stalker)
 */

class BasketballSport extends SportBase {
  constructor(arena) {
    super(arena, {
      name: 'Basketball',
      key: 'basketball',
      description: 'Full 3v3 Match: Shoot over defenders, pass to open teammates for assists, battle for rebounds, and win the match!'
    });

    this.hoopPosition = new THREE.Vector3(0, 2.90, -6.5);
    this.rimRadius = 0.38;
    this.backboardSize = { width: 1.8, height: 1.2, depth: 0.08 };
    this.backboardZ = -6.85;

    this.ballRadius = 0.22;
    this.ballInitialPos = new THREE.Vector3(0, 1.05, -0.65);
    this.ballPos = new THREE.Vector3().copy(this.ballInitialPos);
    this.ballVel = new THREE.Vector3();
    this.ballPrevPos = new THREE.Vector3();
    
    this.isBallInAir = false;
    this.isPassing = false;
    this.hasScoredThisShot = false;
    this.hasHitBackboard = false;
    this.bouncesCount = 0;
    this.shotTimer = 0;

    // Team players (3v3 Match)
    this.teammates = []; // #7 Wing (right), #11 Point/Cutter (left)
    this.defenders = []; // #23 Perimeter, #34 Paint Center, #15 Wing Stalker
    this.activeReceiver = null;
    this.isOpponentAttacking = false;

    this.ballMesh = null;
    this.hoopGroup = null;
    this.courtLines = null;
    this.playerHandsGroup = null;

    this.buildCourtAndHoop();
    this.buildPlayerHands();
    this.buildMatchPlayers();
  }

  buildCourtAndHoop() {
    // Hardwood Court
    const courtMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.35, metalness: 0.15 });
    const court = new THREE.Mesh(new THREE.PlaneGeometry(16, 20), courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.01, -6);
    court.receiveShadow = true;
    this.group.add(court);

    // Court Lines (Paint, Free-Throw Key, 3-Point Arc)
    this.courtLines = new THREE.Group();
    const keyGeo = new THREE.PlaneGeometry(3.6, 5.8);
    const keyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
    const keyMesh = new THREE.Mesh(keyGeo, keyMat);
    keyMesh.rotation.x = -Math.PI / 2;
    keyMesh.position.set(0, 0.015, -4.5);
    keyMesh.receiveShadow = true;
    this.courtLines.add(keyMesh);

    const ftLine = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ftLine.rotation.x = -Math.PI / 2;
    ftLine.position.set(0, 0.02, -1.8);
    this.courtLines.add(ftLine);

    const arcPoints = [];
    const arcRadius = 4.8;
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI;
      arcPoints.push(new THREE.Vector3(Math.cos(angle) * arcRadius, 0.02, this.hoopPosition.z + Math.sin(angle) * arcRadius));
    }
    const arcLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPoints), new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    this.courtLines.add(arcLine);
    this.group.add(this.courtLines);

    // Hoop & Backboard
    this.hoopGroup = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 4.0, 16), poleMat);
    pole.position.set(0, 2.0, this.backboardZ - 0.7);
    pole.castShadow = true;
    this.hoopGroup.add(pole);

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 16), poleMat);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(0, 3.1, this.backboardZ - 0.35);
    this.hoopGroup.add(arm);

    const bbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.65, roughness: 0.1, metalness: 0.1 });
    const backboard = new THREE.Mesh(new THREE.BoxGeometry(this.backboardSize.width, this.backboardSize.height, this.backboardSize.depth), bbMat);
    backboard.position.set(0, 3.15, this.backboardZ);
    backboard.castShadow = true;
    this.hoopGroup.add(backboard);

    const sqMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
    sqMesh.position.set(0, 3.0, this.backboardZ + 0.045);
    this.hoopGroup.add(sqMesh);

    const rimMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.5 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(this.rimRadius, 0.024, 12, 32), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.copy(this.hoopPosition);
    rim.castShadow = true;
    this.hoopGroup.add(rim);

    const netMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, wireframe: true, transparent: true, opacity: 0.75 });
    this.netMesh = new THREE.Mesh(new THREE.CylinderGeometry(this.rimRadius, 0.22, 0.55, 16, 6, true), netMat);
    this.netMesh.position.set(this.hoopPosition.x, this.hoopPosition.y - 0.28, this.hoopPosition.z);
    this.hoopGroup.add(this.netMesh);
    this.group.add(this.hoopGroup);

    // Regulation Basketball
    const ballCanvas = document.createElement('canvas');
    ballCanvas.width = 512; ballCanvas.height = 256;
    const bCtx = ballCanvas.getContext('2d');
    bCtx.fillStyle = '#ea580c'; bCtx.fillRect(0, 0, 512, 256);
    bCtx.strokeStyle = '#1e1b18'; bCtx.lineWidth = 8;
    bCtx.beginPath(); bCtx.moveTo(0, 128); bCtx.lineTo(512, 128); bCtx.moveTo(256, 0); bCtx.lineTo(256, 256); bCtx.stroke();
    bCtx.beginPath(); bCtx.arc(128, 128, 70, 0, Math.PI * 2); bCtx.arc(384, 128, 70, 0, Math.PI * 2); bCtx.stroke();
    const ballTex = new THREE.CanvasTexture(ballCanvas);
    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(this.ballRadius, 32, 32), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.6, metalness: 0.1 }));
    this.ballMesh.castShadow = true;
    this.ballMesh.position.copy(this.ballInitialPos);
    this.group.add(this.ballMesh);
  }

  buildPlayerHands() {
    this.playerHandsGroup = new THREE.Group();
    this.playerHandsGroup.name = "PlayerAvatarGroup";
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.6 });
    const jerseyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 }); // Blue Team Jersey #0
    const shortsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.85 });

    // 1. Player Head & Face (Player #0 - YOU, facing forward toward basket at -Z)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.42, 0);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), skinMat);
    head.scale.set(1, 1.15, 1);
    headGroup.add(head);

    // Full hair covering crown, sides, and back
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.126, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.75),
      hairMat
    );
    hair.position.y = 0.02;
    headGroup.add(hair);

    const hairBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.118, 0.08, 0.11, 16, 1, false, Math.PI * 0.45, Math.PI * 1.1),
      hairMat
    );
    hairBack.position.set(0, -0.04, 0.02);
    headGroup.add(hairBack);

    // Team Headband
    const sweatband = new THREE.Mesh(
      new THREE.TorusGeometry(0.122, 0.018, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 }) // Cyan Team Headband
    );
    sweatband.rotation.x = Math.PI / 2;
    sweatband.position.y = 0.04;
    headGroup.add(sweatband);

    // Expressive Athletic Face (Facing forward at -Z)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), eyeMat);
    leftEye.position.set(-0.042, 0.01, -0.11);
    headGroup.add(leftEye);
    const leftGlint = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), glintMat);
    leftGlint.position.set(-0.038, 0.015, -0.125);
    headGroup.add(leftGlint);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), eyeMat);
    rightEye.position.set(0.042, 0.01, -0.11);
    headGroup.add(rightEye);
    const rightGlint = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), glintMat);
    rightGlint.position.set(0.046, 0.015, -0.125);
    headGroup.add(rightGlint);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.03, 8), skinMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, -0.015, -0.125);
    headGroup.add(nose);

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.008, 0.01), new THREE.MeshBasicMaterial({ color: 0x7f1d1d }));
    mouth.position.set(0, -0.05, -0.105);
    headGroup.add(mouth);

    this.playerHandsGroup.add(headGroup);

    // 2. Neck & Jersey Torso (Player #0)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.1, 12), skinMat);
    neck.position.set(0, 0.28, 0);
    this.playerHandsGroup.add(neck);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.24), jerseyMat);
    chest.position.set(0, 0.02, 0);
    chest.castShadow = true;
    this.playerHandsGroup.add(chest);

    // White Team Stripe on Jersey
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.08, 0.25),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    stripe.position.set(0, 0.06, 0);
    this.playerHandsGroup.add(stripe);

    // 3. Lower Body (Pelvis, Shorts, Legs, Shoes)
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.22), shortsMat);
    pelvis.position.set(0, -0.28, 0);
    this.playerHandsGroup.add(pelvis);

    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.44, 12), shortsMat);
    leftLeg.position.set(-0.10, -0.56, 0);
    this.playerHandsGroup.add(leftLeg);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.20), shoeMat);
    leftShoe.position.set(-0.10, -0.80, -0.04);
    this.playerHandsGroup.add(leftShoe);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.44, 12), shortsMat);
    rightLeg.position.set(0.10, -0.56, 0);
    this.playerHandsGroup.add(rightLeg);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.20), shoeMat);
    rightShoe.position.set(0.10, -0.80, -0.04);
    this.playerHandsGroup.add(rightShoe);

    // 4. Athletic Arms & Shooting Hands holding the ball
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.24, 0.15, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.28, 12), skinMat);
    leftArmMesh.rotation.x = -0.5; leftArmMesh.position.set(0, -0.10, -0.10); leftArm.add(leftArmMesh);
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.04), skinMat);
    leftHand.position.set(0.04, -0.18, -0.24); leftArm.add(leftHand);
    this.playerHandsGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.24, 0.15, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.28, 12), skinMat);
    rightArmMesh.rotation.x = -0.5; rightArmMesh.position.set(0, -0.10, -0.10); rightArm.add(rightArmMesh);
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.04), skinMat);
    rightHand.position.set(-0.04, -0.18, -0.24); rightArm.add(rightHand);
    this.playerHandsGroup.add(rightArm);

    this.playerHandsGroup.position.set(0, 0.85, 0);
    this.group.add(this.playerHandsGroup);
  }

  // Build Full 3v3 Match: 2 Teammates (Blue) + 3 Opponents (Red)
  buildMatchPlayers() {
    // Teammate 1: Wing Shooter #7 (Right side) - Angled toward hoop (-2.42 rad)
    const t1 = new HumanoidCharacter({
      name: 'Wing_#7',
      role: 'basketball_teammate',
      jerseyColor: 0x0284c7, // Cyan/Blue
      shortsColor: 0x0f172a,
      scale: 1.05,
      baseRotationY: -2.42
    });
    t1.group.position.set(2.8, 0, -3.8);
    t1.baseX = 2.8; t1.baseZ = -3.8;
    this.teammates.push(t1);
    this.group.add(t1.group);

    // Teammate 2: Point / Corner Cutter #11 (Left side) - Angled toward hoop (2.36 rad)
    const t2 = new HumanoidCharacter({
      name: 'Point_#11',
      role: 'basketball_teammate',
      jerseyColor: 0x0284c7,
      shortsColor: 0x0f172a,
      scale: 1.05,
      baseRotationY: 2.36
    });
    t2.group.position.set(-2.8, 0, -4.2);
    t2.baseX = -2.8; t2.baseZ = -4.2;
    this.teammates.push(t2);
    this.group.add(t2.group);

    // Defender 1: Primary On-Ball Guard #23 (Guards player directly) - Facing player (0 rad)
    const d1 = new HumanoidCharacter({
      name: 'Guard_#23',
      role: 'basketball_onball_defender',
      jerseyColor: 0xdc2626, // Red
      shortsColor: 0x111827,
      scale: 1.06,
      baseRotationY: 0
    });
    d1.group.position.set(0, 0, -3.2);
    d1.baseX = 0; d1.baseZ = -3.2;
    this.defenders.push(d1);
    this.group.add(d1.group);

    // Defender 2: Paint Center #34 (Rim Protector) - Facing out from paint (-0.23 rad)
    const d2 = new HumanoidCharacter({
      name: 'Center_#34',
      role: 'basketball_center',
      jerseyColor: 0xdc2626,
      shortsColor: 0x111827,
      scale: 1.10,
      baseRotationY: -0.23
    });
    d2.group.position.set(1.2, 0, -5.0);
    d2.baseX = 1.2; d2.baseZ = -5.0;
    this.defenders.push(d2);
    this.group.add(d2.group);

    // Defender 3: Wing Stalker #15 (Shades passing lanes) - Denies Wing (#11) (-1.77 rad)
    const d3 = new HumanoidCharacter({
      name: 'Stalker_#15',
      role: 'basketball_wing_defender',
      jerseyColor: 0xdc2626,
      shortsColor: 0x111827,
      scale: 1.05,
      baseRotationY: -1.77
    });
    d3.group.position.set(-1.8, 0, -4.0);
    d3.baseX = -1.8; d3.baseZ = -4.0;
    this.defenders.push(d3);
    this.group.add(d3.group);
  }

  onEnter() {
    this.resetBall();
    this.updatePreviewTrajectory(window.inputManager ? window.inputManager.power : 0.65, 0, 0);
  }

  onRestart() {
    this.isOpponentAttacking = false;
    this.resetBall(true);
  }

  onPlayerMoved(x, z) {
    // Dynamic defensive slide: Defender #23 repositions between player and hoop
    const def = this.defenders[0];
    if (def) {
      const hoopX = this.hoopPosition.x;
      const hoopZ = this.hoopPosition.z;
      const defX = x + (hoopX - x) * 0.35;
      const defZ = z + (hoopZ - z) * 0.35;
      def.baseX = defX;
      def.baseZ = defZ;
      def.group.position.x = defX;
      def.group.position.z = defZ;
      const angleToPlayer = Math.atan2(x - defX, z - defZ);
      def.group.rotation.y = angleToPlayer;
      def.baseRotationY = angleToPlayer;
    }

    // Teammates angle naturally toward player and basket
    if (this.teammates && this.teammates[0]) {
      const t1 = this.teammates[0];
      const angle = Math.atan2((x * 0.3) - t1.group.position.x, (z * 0.3 - 7.0 * 0.7) - t1.group.position.z);
      t1.group.rotation.y = angle;
      t1.baseRotationY = angle;
    }
    if (this.teammates && this.teammates[1]) {
      const t2 = this.teammates[1];
      const angle = Math.atan2((x * 0.3) - t2.group.position.x, (z * 0.3 - 7.0 * 0.7) - t2.group.position.z);
      t2.group.rotation.y = angle;
      t2.baseRotationY = angle;
    }

    // Defenders in paint face player
    if (this.defenders && this.defenders[1]) {
      const d2 = this.defenders[1];
      d2.group.rotation.y = Math.atan2(x - d2.group.position.x, z - d2.group.position.z);
    }

    if (!this.isBallInAir && !this.isOpponentAttacking) {
      this.resetBall(false);
    }
  }

  resetBall(autoReturnPlayer = false) {
    this.isBallInAir = false;
    this.isPassing = false;
    this.hasScoredThisShot = false;
    this.hasHitBackboard = false;
    this.bouncesCount = 0;
    this.shotTimer = 0;
    this.activeReceiver = null;
    this.possession = 'player';

    // Reset all AI teammates and defenders to tactical positions
    if (this.teammates) this.teammates.forEach(tm => tm.resetToBasePosition());
    if (this.defenders) this.defenders.forEach(df => df.resetToBasePosition());

    // If requested, smoothly return player camera rig to Regulation Home Spot
    if (autoReturnPlayer && this.arena && this.arena.setTacticalSpot) {
      this.arena.setTacticalSpot('home');
    }

    const isSeated = window.a11y ? window.a11y.get('seatedMode') : true;
    const playerX = this.arena && this.arena.cameraRig ? this.arena.cameraRig.position.x : 0;
    const playerZ = this.arena && this.arena.cameraRig ? this.arena.cameraRig.position.z : 0;
    const playerYaw = this.arena ? this.arena.cameraYaw : 0;

    const fwdX = -Math.sin(playerYaw);
    const fwdZ = -Math.cos(playerYaw);

    this.ballInitialPos.set(
      playerX + fwdX * 0.65,
      isSeated ? 0.95 : 1.35,
      playerZ + fwdZ * 0.65
    );
    this.ballPos.copy(this.ballInitialPos);
    this.ballVel.set(0, 0, 0);

    if (this.ballMesh) {
      this.ballMesh.position.copy(this.ballPos);
      this.ballMesh.rotation.set(0, 0, 0);
      this.ballMesh.visible = true;
    }

    if (this.playerHandsGroup) {
      this.playerHandsGroup.visible = true;
      this.playerHandsGroup.position.set(
        playerX + fwdX * 0.65,
        isSeated ? 0.85 : 1.25,
        playerZ + fwdZ * 0.65
      );
      this.playerHandsGroup.rotation.set(0, playerYaw, 0);
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
    this.shoot(power, aimX, aimY);
  }

  handleActionTrigger() {
    if (this.isOpponentAttacking) return;
    if (this.isBallInAir) {
      this.resetBall();
    } else {
      const power = window.inputManager ? window.inputManager.power : 0.68;
      const aimX = window.inputManager ? window.inputManager.aimX : 0;
      const aimY = window.inputManager ? window.inputManager.aimY : 0;
      this.shoot(power, aimX, aimY);
    }
  }

  /* -------------------------------------------------------------
     INTERACTIVE PASSING SYSTEM (Left / Right / Directional)
     ------------------------------------------------------------- */
  handlePass(direction) {
    if (this.isBallInAir || this.isOpponentAttacking) return;

    let receiver = null;
    if (direction === 'left') {
      receiver = this.teammates[1]; // #11 on Left
    } else if (direction === 'right') {
      receiver = this.teammates[0]; // #7 on Right
    } else {
      // Pick based on aim direction
      const aimX = window.inputManager ? window.inputManager.aimX : 0;
      receiver = aimX < 0 ? this.teammates[1] : this.teammates[0];
    }

    if (!receiver) return;

    if (window.app && window.app.inTutorial && window.app.onTutorialAction) {
      window.app.onTutorialAction('pass');
    }

    // Check passing lane for defensive interception
    // If player passes directly toward Defender #23 or #15 without clearing angle
    const targetX = receiver.group.position.x;
    const defenderInterception = this.checkPassInterception(targetX);

    if (defenderInterception) {
      this.executeInterception(defenderInterception, receiver);
      return;
    }

    // Clean Pass to Open Teammate!
    this.activeReceiver = receiver;
    this.isBallInAir = true;
    this.isPassing = true;
    this.possession = 'teammate';
    this.shotTimer = 0;

    if (this.playerHandsGroup) {
      this.playerHandsGroup.rotation.x = -0.35;
      setTimeout(() => { if (this.playerHandsGroup) this.playerHandsGroup.rotation.x = 0; }, 350);
    }

    const targetPos = new THREE.Vector3(
      receiver.group.position.x,
      1.25,
      receiver.group.position.z
    );

    const flightTime = 0.65;
    this.ballVel.set(
      (targetPos.x - this.ballPos.x) / flightTime,
      (targetPos.y - this.ballPos.y + 0.5 * 9.8 * flightTime * flightTime) / flightTime,
      (targetPos.z - this.ballPos.z) / flightTime
    );

    if (window.soundEngine) window.soundEngine.playBasketballBounce();
    if (this.arena) this.arena.hideTrajectory();

    // Receiver catches cleanly and immediately rises up for a jump shot!
    receiver.triggerCatchAndShoot(() => {
      this.executeTeammateShot(receiver);
    });

    if (window.a11y) {
      window.a11y.announce(`Passed cleanly to ${receiver.name}! Teammate rising for the shot!`);
    }
  }

  checkPassInterception(targetX) {
    // Interception happens if aiming right into defender's path
    for (const def of this.defenders) {
      const defX = def.group.position.x;
      // If defender is standing close to passing ray between player (0,0,-0.65) and receiver (targetX, -4)
      if (Math.sign(defX) === Math.sign(targetX) && Math.abs(defX - targetX * 0.5) < 0.35) {
        // Intercepted!
        return def;
      }
    }
    return null;
  }

  executeInterception(defender, intendedReceiver) {
    this.isBallInAir = true;
    this.isPassing = false;
    this.possession = 'opponent';

    if (this.playerHandsGroup) {
      this.playerHandsGroup.rotation.x = 0.1;
    }

    // Defender swats the ball!
    defender.triggerInterception();
    if (window.soundEngine) {
      window.soundEngine.playDeflection();
      setTimeout(() => window.soundEngine.playWhistle(), 150);
    }

    this.showFeedback('TURNOVER', '', false);

    // Ball bounces away toward defender
    this.ballVel.set(defender.group.position.x * 0.8, 2.5, -2.5);

    setTimeout(() => {
      this.startOpponentCounterAttack();
    }, 900);
  }

  // Teammate executes shot towards hoop
  executeTeammateShot(teammate) {
    this.isPassing = false;
    this.hasScoredThisShot = false;
    
    this.ballPos.set(teammate.group.position.x, 2.1, teammate.group.position.z);
    
    const forwardDist = Math.abs(this.hoopPosition.z - this.ballPos.z);
    const heightDiff = this.hoopPosition.y - this.ballPos.y;
    const flightTime = 1.05;
    
    // Contested vs Open: high chance of basket from good pass
    const accuracyNoise = (Math.random() - 0.45) * 0.08;
    this.ballVel.set(
      (this.hoopPosition.x - this.ballPos.x + accuracyNoise) / flightTime,
      (heightDiff + 0.5 * 9.8 * flightTime * flightTime) / flightTime,
      (this.hoopPosition.z - this.ballPos.z) / flightTime
    );

    if (window.soundEngine) window.soundEngine.playBasketballBounce();
  }

  calculateShotVelocity(power, aimX, aimY) {
    const dx = this.hoopPosition.x - this.ballPos.x;
    const dz = this.hoopPosition.z - this.ballPos.z;
    const forwardDist = Math.hypot(dx, dz);
    const heightDiff = this.hoopPosition.y - this.ballPos.y;

    // Target flight time scales dynamically with distance from hoop
    const targetFlightTime = Math.max(0.85, Math.min(1.8, forwardDist * 0.18 + 0.45));
    const baseHorizVel = forwardDist / targetFlightTime;
    const baseVy = (heightDiff + 0.5 * 9.8 * targetFlightTime * targetFlightTime) / targetFlightTime;

    const dirX = dx / (forwardDist || 1);
    const dirZ = dz / (forwardDist || 1);

    // Perpendicular vector for horizontal aiming spread
    const perpX = -dirZ;
    const perpZ = dirX;

    const assistMultiplier = window.a11y ? window.a11y.getAimAssistanceMultiplier() : 0.65;
    const aimOffset = (aimX * 0.75) * (1.0 - assistMultiplier * 0.75);
    const powerScale = 0.85 + power * 0.35;

    return new THREE.Vector3(
      dirX * baseHorizVel * powerScale + perpX * aimOffset,
      baseVy * powerScale + (aimY * 1.4 * (1.0 - assistMultiplier * 0.6)),
      dirZ * baseHorizVel * powerScale + perpZ * aimOffset
    );
  }

  shoot(power, aimX, aimY) {
    this.isBallInAir = true;
    this.isPassing = false;
    this.state = 'active';
    this.possession = 'player';
    this.shotTimer = 0;
    this.stats.shotsAttempted++;

    if (window.app && window.app.inTutorial && window.app.onTutorialAction) {
      window.app.onTutorialAction('shoot');
    }

    if (this.playerHandsGroup) {
      this.playerHandsGroup.rotation.x = -0.45;
      setTimeout(() => { if (this.playerHandsGroup) this.playerHandsGroup.rotation.x = 0; }, 500);
    }

    const vel = this.calculateShotVelocity(power, aimX, aimY);
    this.ballVel.copy(vel);

    if (window.soundEngine) window.soundEngine.playBasketballBounce();
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
    const simVel = this.calculateShotVelocity(power, aimX, aimY);

    const dt = 0.04;
    for (let i = 0; i < 35; i++) {
      points.push(simPos.clone());
      simVel.y -= 9.8 * dt;
      simPos.x += simVel.x * dt;
      simPos.y += simVel.y * dt;
      simPos.z += simVel.z * dt;
      if (simPos.y < 0.1 || simPos.z < this.backboardZ - 1.0) break;
    }

    this.arena.updateTrajectory(points);
  }

  update(delta) {
    // Tick Match Clock & Shot Clock
    this.tickMatch(delta);

    const im = window.inputManager;
    const aimX = im ? im.aimX : 0;
    const aimY = im ? im.aimY : 0;

    // Update all teammates & defenders animations
    this.teammates.forEach(tm => tm.update(delta, aimX, this.isBallInAir));
    this.defenders.forEach(df => df.update(delta, aimX, this.isBallInAir));

    // Live Hover & Selection Feedback (Affordances & Signifiers)
    const reticleEl = document.getElementById('reticle-indicator');
    const badgeEl = document.getElementById('reticle-target-badge');

    if (!this.isBallInAir && !this.isOpponentAttacking) {
      if (Math.abs(aimX) < 0.24 && aimY > -0.22) {
        // Targeted on Hoop Rim!
        if (reticleEl) {
          reticleEl.classList.add('locked-hoop');
          reticleEl.classList.remove('locked-teammate');
        }
        if (badgeEl) badgeEl.textContent = "HOOP LOCKED [SHOOT]";
        if (this.rimMesh) {
          this.rimMesh.material.color.setHex(0xfbbf24);
          this.rimMesh.material.emissive.setHex(0x78350f);
        }
        if (im && im.isGazeTargeting) {
          im.tickGazeDwell(delta, 'hoop', () => {
            this.handleActionRelease(0.74, im.aimX, im.aimY);
          });
        }
      } else if (aimX > 0.32) {
        // Targeted on Wing Teammate #7 (Right side)
        if (reticleEl) {
          reticleEl.classList.add('locked-teammate');
          reticleEl.classList.remove('locked-hoop');
        }
        if (badgeEl) badgeEl.textContent = "PASS WING #7 [E/F]";
        if (this.rimMesh) {
          this.rimMesh.material.color.setHex(0xf97316);
          this.rimMesh.material.emissive.setHex(0x000000);
        }
        if (im && im.isGazeTargeting) {
          im.tickGazeDwell(delta, 'pass_right', () => {
            this.handlePass('right');
          });
        }
      } else if (aimX < -0.32) {
        // Targeted on Point Teammate #11 (Left side)
        if (reticleEl) {
          reticleEl.classList.add('locked-teammate');
          reticleEl.classList.remove('locked-hoop');
        }
        if (badgeEl) badgeEl.textContent = "PASS POINT #11 [E/F]";
        if (this.rimMesh) {
          this.rimMesh.material.color.setHex(0xf97316);
          this.rimMesh.material.emissive.setHex(0x000000);
        }
        if (im && im.isGazeTargeting) {
          im.tickGazeDwell(delta, 'pass_left', () => {
            this.handlePass('left');
          });
        }
      } else {
        // Ready / Centered
        if (reticleEl) {
          reticleEl.classList.remove('locked-hoop', 'locked-teammate');
        }
        if (badgeEl) badgeEl.textContent = "AIM READY";
        if (this.rimMesh) {
          this.rimMesh.material.color.setHex(0xf97316);
          this.rimMesh.material.emissive.setHex(0x000000);
        }
        if (im && im.isGazeTargeting) {
          im.resetGazeDwell();
        }
      }

      // Smooth physical height adaptation for seated vs standing
      const isSeated = window.a11y ? window.a11y.get('seatedMode') : true;
      const targetHandsY = isSeated ? 0.85 : 1.25;
      const targetBallY = isSeated ? 0.95 : 1.35;
      this.ballInitialPos.y += (targetBallY - this.ballInitialPos.y) * 4.0 * delta;

      const playerX = this.arena && this.arena.cameraRig ? this.arena.cameraRig.position.x : 0;
      const playerZ = this.arena && this.arena.cameraRig ? this.arena.cameraRig.position.z : 0;
      const playerYaw = this.arena ? this.arena.cameraYaw : 0;
      const fwdX = -Math.sin(playerYaw);
      const fwdZ = -Math.cos(playerYaw);
      const rightX = Math.cos(playerYaw);
      const rightZ = -Math.sin(playerYaw);

      this.ballInitialPos.x = playerX + fwdX * 0.65;
      this.ballInitialPos.z = playerZ + fwdZ * 0.65;

      if (window.inputManager) {
        this.updatePreviewTrajectory(
          window.inputManager.power,
          window.inputManager.aimX,
          window.inputManager.aimY
        );

        if (this.playerHandsGroup && this.ballMesh) {
          const offsetX = window.inputManager.aimX * 0.08;
          const offsetY = window.inputManager.aimY * 0.05;
          this.ballPos.set(
            this.ballInitialPos.x + rightX * offsetX,
            this.ballInitialPos.y + offsetY,
            this.ballInitialPos.z + rightZ * offsetX
          );
          this.ballMesh.position.copy(this.ballPos);

          this.playerHandsGroup.position.set(
            this.ballInitialPos.x,
            this.ballInitialPos.y - 0.1,
            this.ballInitialPos.z
          );
          this.playerHandsGroup.rotation.y = playerYaw;
        }
      }
      return;
    }

    this.shotTimer += delta;
    this.ballPrevPos.copy(this.ballPos);

    this.ballVel.y -= 9.8 * delta;
    this.ballPos.x += this.ballVel.x * delta;
    this.ballPos.y += this.ballVel.y * delta;
    this.ballPos.z += this.ballVel.z * delta;

    if (this.ballMesh) {
      this.ballMesh.rotation.x += this.ballVel.z * delta * 1.2;
      this.ballMesh.position.copy(this.ballPos);
    }

    // Swish & Rim Checks
    if (!this.isPassing && !this.isOpponentAttacking) {
      this.checkHoopPass();
      this.checkBackboardCollision();
      this.checkRimCollision();
    }

    // Floor Bounce
    if (this.ballPos.y <= this.ballRadius) {
      this.ballPos.y = this.ballRadius;
      this.ballVel.y = -this.ballVel.y * 0.65;
      this.ballVel.x *= 0.8;
      this.ballVel.z *= 0.8;
      this.bouncesCount++;

      if (Math.abs(this.ballVel.y) > 0.8 && window.soundEngine) {
        window.soundEngine.playBasketballBounce();
      }

      if (this.bouncesCount >= 3 || this.shotTimer > 3.2) {
        this.handleShotResolution();
      }
    }
  }

  checkHoopPass() {
    if (this.hasScoredThisShot) return;

    if (this.ballPrevPos.y >= this.hoopPosition.y && this.ballPos.y < this.hoopPosition.y) {
      const distToRimCenter = Math.hypot(
        this.ballPos.x - this.hoopPosition.x,
        this.ballPos.z - this.hoopPosition.z
      );

      const diffMods = window.a11y ? window.a11y.getDifficultyModifiers() : { targetSizeScale: 1.3 };
      const effectiveRadius = this.rimRadius * diffMods.targetSizeScale;

      if (distToRimCenter <= effectiveRadius) {
        this.hasScoredThisShot = true;
        const isAssist = !!this.activeReceiver;
        const pts = isAssist ? 2 : 3;
        const msg = isAssist ? '+2 ASSIST' : '+3 SWISH';

        if (window.soundEngine) window.soundEngine.playSwish();
        if (this.arena) this.arena.spawnCelebration(this.hoopPosition, 100);

        this.awardScore('home', pts, msg, isAssist);
      }
    }
  }

  checkBackboardCollision() {
    if (this.hasHitBackboard) return;

    const bbMinX = -this.backboardSize.width / 2;
    const bbMaxX = this.backboardSize.width / 2;
    const bbMinY = 3.15 - this.backboardSize.height / 2;
    const bbMaxY = 3.15 + this.backboardSize.height / 2;

    if (this.ballPos.z - this.ballRadius <= this.backboardZ && this.ballPrevPos.z - this.ballRadius > this.backboardZ) {
      if (this.ballPos.x >= bbMinX && this.ballPos.x <= bbMaxX && this.ballPos.y >= bbMinY && this.ballPos.y <= bbMaxY) {
        this.hasHitBackboard = true;
        this.ballPos.z = this.backboardZ + this.ballRadius;
        this.ballVel.z = -this.ballVel.z * 0.55;
        this.ballVel.y += 0.8;

        if (window.soundEngine) window.soundEngine.playRimClank();
      }
    }
  }

  checkRimCollision() {
    const distToRim = Math.hypot(this.ballPos.x - this.hoopPosition.x, this.ballPos.z - this.hoopPosition.z);
    if (Math.abs(this.ballPos.y - this.hoopPosition.y) < this.ballRadius * 0.8) {
      if (Math.abs(distToRim - this.rimRadius) < this.ballRadius * 0.6) {
        this.ballVel.x = (this.ballPos.x - this.hoopPosition.x) * 3.5;
        this.ballVel.z = (this.ballPos.z - this.hoopPosition.z) * 3.5;
        this.ballVel.y = Math.abs(this.ballVel.y) * 0.7;
        if (window.soundEngine) window.soundEngine.playRimClank();
      }
    }
  }

  handleShotResolution() {
    if (this.hasScoredThisShot) {
      // Made shot! Turn ball over to Red team for counter-attack
      setTimeout(() => {
        this.startOpponentCounterAttack();
      }, 700);
    } else {
      // Shot Missed! Loose ball rebound battle!
      this.triggerReboundScramble();
    }
  }

  /* -------------------------------------------------------------
     REBOUND BATTLE & LOOSE BALL SCRAMBLE
     ------------------------------------------------------------- */
  triggerReboundScramble() {
    this.registerMiss('SHOT CLANKED OFF THE RIM!');
    this.possession = 'loose_ball';

    const blueWinsRebound = Math.random() < 0.60;

    // Natural, non-simultaneous rebound contest:
    if (blueWinsRebound) {
      // Blue Teammate #7 cuts into the paint and leaps to grab the board
      const tm = this.teammates[0];
      if (tm) {
        setTimeout(() => tm.triggerReboundJump(), 120);
      }
    } else {
      // Red Center #34 leaps alone to secure the defensive rebound
      const def = this.defenders[1];
      if (def) {
        setTimeout(() => def.triggerReboundJump(), 160);
      }
    }

    setTimeout(() => {
      if (blueWinsRebound) {
        this.stats.rebounds++;
        this.showFeedback('REBOUND', '', true);
        if (window.soundEngine) window.soundEngine.playSuccessChime();

        // Pass immediately back to player hands
        this.resetBall();
        this.shotClock = 18.0;
        this.updateHUD();
      } else {
        this.showFeedback('RED REBOUND', '', false);
        this.startOpponentCounterAttack();
      }
    }, 850);
  }

  /* -------------------------------------------------------------
     OPPONENT AI COUNTER-ATTACK
     ------------------------------------------------------------- */
  startOpponentCounterAttack() {
    if (!this.isMatchActive) return;
    this.isOpponentAttacking = true;
    this.possession = 'opponent';
    this.isBallInAir = false;

    if (this.playerHandsGroup) this.playerHandsGroup.visible = false;

    const attacker = this.defenders[0]; // #23 handles ball
    attacker.group.position.set(0, 0, -3.5);

    // Ball moves to opponent hands
    this.ballPos.set(0, 1.1, -3.2);
    if (this.ballMesh) this.ballMesh.position.copy(this.ballPos);

    this.showFeedback('DEFENSE', '', false);

    // Opponent dribbles and pulls up for a jumper
    setTimeout(() => {
      attacker.triggerOpponentShot(() => {
        this.executeOpponentShot(attacker);
      });
    }, 1100);
  }

  executeOpponentShot(attacker) {
    this.isBallInAir = true;
    this.ballPos.set(attacker.group.position.x, 2.1, attacker.group.position.z);

    const forwardDist = Math.abs(this.hoopPosition.z - this.ballPos.z);
    const heightDiff = this.hoopPosition.y - this.ballPos.y;
    const flightTime = 1.05;

    // AI shot accuracy (50% made, 50% missed)
    const aiScores = Math.random() < 0.50;
    const aimOffset = aiScores ? 0 : (Math.random() > 0.5 ? 0.35 : -0.35);

    this.ballVel.set(
      (this.hoopPosition.x - this.ballPos.x + aimOffset) / flightTime,
      (heightDiff + 0.5 * 9.8 * flightTime * flightTime) / flightTime,
      (this.hoopPosition.z - this.ballPos.z) / flightTime
    );

    if (window.soundEngine) window.soundEngine.playBasketballBounce();

    setTimeout(() => {
      if (aiScores) {
        if (window.soundEngine) {
          window.soundEngine.playSwish();
          setTimeout(() => window.soundEngine.playWhistle(), 200);
        }
        this.awardScore('away', 2, 'RED +2');
      } else {
        if (window.soundEngine) {
          window.soundEngine.playRimClank();
          window.soundEngine.playBounce();
        }
        this.stats.rebounds++;
        this.showFeedback('DEFENSIVE REBOUND', 'BLUE BALL', true);
      }

      setTimeout(() => {
        this.isOpponentAttacking = false;
        // Keep player at their current selected tactical spot (never forcibly reset position!)
        this.resetBall(false);
      }, 1000);
    }, 1100);
  }

  onShotClockViolation() {
    this.startOpponentCounterAttack();
  }

  handleRetry() {
    // Keep player at their current court position without moving them
    this.resetBall(false);
    if (window.soundEngine) window.soundEngine.playUiClick();
  }
}

window.BasketballSport = BasketballSport;
