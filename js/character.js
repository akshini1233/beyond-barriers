/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * Articulated 3D Humanoid Character Generator
 * Supports Defenders, Goalkeepers, Opponents, and Team-Play Teammates with Passing & Scoring AI.
 */

class HumanoidCharacter {
  constructor(options = {}) {
    this.name = options.name || 'Athlete';
    this.role = options.role || 'teammate'; // 'teammate', 'defender', 'goalkeeper', 'tennis_opponent', 'badminton_opponent'
    this.jerseyColor = options.jerseyColor || (this.role === 'teammate' ? 0x0284c7 : 0xdc2626); // Blue team / Red opponents
    this.shortsColor = options.shortsColor || 0x0f172a;
    this.skinColor = options.skinColor || 0xd4a373;
    this.hairColor = options.hairColor || 0x1e1b18;
    this.scale = options.scale || 1.0;
    
    this.group = new THREE.Group();
    this.group.name = `Character_${this.name}`;

    this.nodes = {};
    this.animTime = Math.random() * 10;
    this.actionState = 'idle'; // 'idle', 'calling_pass', 'catching', 'shooting', 'defending', 'jumping', 'diving'
    
    this.lateralPos = 0;
    this.targetLateralPos = 0;
    this.jumpHeight = 0;
    this.jumpVelocity = 0;

    // Teammate state
    this.hasBall = false;
    this.isOpen = true;
    this.callPassTimer = 0;

    this.baseX = options.baseX !== undefined ? options.baseX : 0;
    this.baseZ = options.baseZ !== undefined ? options.baseZ : 0;
    this.baseRotationY = options.baseRotationY !== undefined ? options.baseRotationY : 0;
    this.hasSetBasePos = false;

    this.buildBody();
    this.group.rotation.y = this.baseRotationY;
  }

  buildBody() {
    const skinMat = new THREE.MeshStandardMaterial({ color: this.skinColor, roughness: 0.7, metalness: 0.1 });
    const jerseyMat = new THREE.MeshStandardMaterial({ color: this.jerseyColor, roughness: 0.5, metalness: 0.1 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: this.shortsColor, roughness: 0.6 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

    // Hips
    const hips = new THREE.Group();
    hips.position.y = 0.95;
    this.nodes.hips = hips;
    this.group.add(hips);

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.22), shortsMat);
    pelvis.castShadow = true;
    hips.add(pelvis);

    // Spine / Chest
    const spine = new THREE.Group();
    spine.position.y = 0.12;
    this.nodes.spine = spine;
    hips.add(spine);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.24), jerseyMat);
    chest.position.y = 0.22;
    chest.castShadow = true;
    spine.add(chest);

    // Jersey Team Stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.08, 0.25),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    stripe.position.y = 0.26;
    spine.add(stripe);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.1, 12), skinMat);
    neck.position.y = 0.46;
    spine.add(neck);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.58;
    this.nodes.head = headGroup;
    spine.add(headGroup);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), skinMat);
    head.scale.set(1, 1.15, 1);
    head.castShadow = true;
    headGroup.add(head);

    // Full athletic hair covering crown, sides, and back of head
    const hairMat = new THREE.MeshStandardMaterial({ color: this.hairColor, roughness: 0.85 });
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.126, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.75),
      hairMat
    );
    hair.position.y = 0.02;
    headGroup.add(hair);

    // Back-of-head tapered neckline hair
    const hairBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.118, 0.08, 0.11, 16, 1, false, Math.PI * 0.45, Math.PI * 1.1),
      hairMat
    );
    hairBack.position.set(0, -0.04, -0.02);
    headGroup.add(hairBack);

    const sweatband = new THREE.Mesh(
      new THREE.TorusGeometry(0.122, 0.018, 8, 24),
      new THREE.MeshBasicMaterial({ color: this.role.includes('teammate') ? 0x38bdf8 : 0xef4444 })
    );
    sweatband.rotation.x = Math.PI / 2;
    sweatband.position.y = 0.04;
    headGroup.add(sweatband);

    // Expressive Athletic Facial Features (Eyes, Eyebrows, Nose, Mouth, Ears)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), eyeMat);
    leftEye.position.set(-0.042, 0.01, 0.11);
    headGroup.add(leftEye);
    const leftGlint = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), eyePupilMat);
    leftGlint.position.set(-0.038, 0.015, 0.125);
    headGroup.add(leftGlint);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), eyeMat);
    rightEye.position.set(0.042, 0.01, 0.11);
    headGroup.add(rightEye);
    const rightGlint = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), eyePupilMat);
    rightGlint.position.set(0.046, 0.015, 0.125);
    headGroup.add(rightGlint);

    // Eyebrows
    const browMat = new THREE.MeshBasicMaterial({ color: this.hairColor || 0x0f172a });
    const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.015), browMat);
    leftBrow.position.set(-0.042, 0.038, 0.112);
    leftBrow.rotation.z = 0.1;
    headGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.015), browMat);
    rightBrow.position.set(0.042, 0.038, 0.112);
    rightBrow.rotation.z = -0.1;
    headGroup.add(rightBrow);

    // Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.03, 8), skinMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.015, 0.125);
    headGroup.add(nose);

    // Mouth
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.008, 0.01), mouthMat);
    mouth.position.set(0, -0.05, 0.105);
    headGroup.add(mouth);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.025, 8, 8);
    earGeo.scale(0.5, 1, 0.6);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.125, 0, 0);
    headGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.125, 0, 0);
    headGroup.add(rightEar);

    // ARMS
    const leftShoulder = new THREE.Group();
    leftShoulder.position.set(-0.24, 0.38, 0);
    this.nodes.leftShoulder = leftShoulder;
    spine.add(leftShoulder);

    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.28, 12), skinMat);
    leftUpperArm.position.y = -0.14;
    leftUpperArm.castShadow = true;
    leftShoulder.add(leftUpperArm);

    const leftElbow = new THREE.Group();
    leftElbow.position.y = -0.28;
    this.nodes.leftElbow = leftElbow;
    leftShoulder.add(leftElbow);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 12), skinMat);
    leftForearm.position.y = -0.13;
    leftForearm.castShadow = true;
    leftElbow.add(leftForearm);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.04), skinMat);
    leftHand.position.y = -0.28;
    this.nodes.leftHand = leftHand;
    leftElbow.add(leftHand);

    const rightShoulder = new THREE.Group();
    rightShoulder.position.set(0.24, 0.38, 0);
    this.nodes.rightShoulder = rightShoulder;
    spine.add(rightShoulder);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.28, 12), skinMat);
    rightUpperArm.position.y = -0.14;
    rightUpperArm.castShadow = true;
    rightShoulder.add(rightUpperArm);

    const rightElbow = new THREE.Group();
    rightElbow.position.y = -0.28;
    this.nodes.rightElbow = rightElbow;
    rightShoulder.add(rightElbow);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 12), skinMat);
    rightForearm.position.y = -0.13;
    rightForearm.castShadow = true;
    rightElbow.add(rightForearm);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.04), skinMat);
    rightHand.position.y = -0.28;
    this.nodes.rightHand = rightHand;
    rightElbow.add(rightHand);

    // LEGS
    const leftHip = new THREE.Group();
    leftHip.position.set(-0.11, -0.06, 0);
    this.nodes.leftHip = leftHip;
    hips.add(leftHip);

    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.42, 12), shortsMat);
    leftThigh.position.y = -0.21;
    leftThigh.castShadow = true;
    leftHip.add(leftThigh);

    const leftKnee = new THREE.Group();
    leftKnee.position.y = -0.42;
    this.nodes.leftKnee = leftKnee;
    leftHip.add(leftKnee);

    const leftShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.40, 12), skinMat);
    leftShin.position.y = -0.20;
    leftShin.castShadow = true;
    leftKnee.add(leftShin);

    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.20), shoeMat);
    leftFoot.position.set(0, -0.42, 0.05);
    leftFoot.castShadow = true;
    leftKnee.add(leftFoot);

    const rightHip = new THREE.Group();
    rightHip.position.set(0.11, -0.06, 0);
    this.nodes.rightHip = rightHip;
    hips.add(rightHip);

    const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.42, 12), shortsMat);
    rightThigh.position.y = -0.21;
    rightThigh.castShadow = true;
    rightHip.add(rightThigh);

    const rightKnee = new THREE.Group();
    rightKnee.position.y = -0.42;
    this.nodes.rightKnee = rightKnee;
    rightHip.add(rightKnee);

    const rightShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.40, 12), skinMat);
    rightShin.position.y = -0.20;
    rightShin.castShadow = true;
    rightKnee.add(rightShin);

    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.20), shoeMat);
    rightFoot.position.set(0, -0.42, 0.05);
    rightFoot.castShadow = true;
    rightKnee.add(rightFoot);

    this.group.scale.set(this.scale, this.scale, this.scale);
  }

  smoothRotate(node, targetX, targetY, targetZ, speed, delta) {
    if (!node) return;
    const factor = Math.min(1.0, (speed || 8.0) * delta);
    node.rotation.x += (targetX - node.rotation.x) * factor;
    node.rotation.y += (targetY - node.rotation.y) * factor;
    node.rotation.z += (targetZ - node.rotation.z) * factor;
  }

  // Smoothly restore character to their tactical regulation court position
  resetToBasePosition() {
    this.actionState = 'idle';
    this.jumpHeight = 0;
    this.jumpVelocity = 0;
    if (this.baseX !== undefined && this.baseZ !== undefined) {
      this.group.position.x = this.baseX;
      this.group.position.z = this.baseZ;
    }
    this.group.position.y = 0;
    this.group.rotation.set(0, this.baseRotationY || 0, 0);
    if (this.nodes.hips) this.nodes.hips.position.y = 0.95;
  }

  update(delta, playerAimX = 0, isBallInAir = false) {
    if (!this.hasSetBasePos && this.group.position.z !== 0) {
      this.baseX = this.group.position.x;
      this.baseZ = this.group.position.z;
      this.hasSetBasePos = true;
    }

    this.animTime += delta;
    const t = this.animTime;

    // Universal smooth jump gravity
    if (this.jumpVelocity !== 0 || this.jumpHeight > 0) {
      this.jumpHeight += this.jumpVelocity * delta;
      this.jumpVelocity -= 12.0 * delta;
      if (this.jumpHeight <= 0) {
        this.jumpHeight = 0;
        this.jumpVelocity = 0;
        if (this.actionState === 'rebounding' || this.actionState === 'shooting' || this.actionState === 'countering') {
          this.actionState = 'idle';
        }
      }
    }

    if (this.role.includes('teammate')) {
      this.updateTeammate(delta, t, isBallInAir);
    } else if (this.role === 'football_defender') {
      this.updateFootballDefender(delta, playerAimX, isBallInAir, t);
    } else if (this.role.includes('defender')) {
      this.updateBasketballDefender(delta, playerAimX, isBallInAir, t);
    } else if (this.role === 'goalkeeper') {
      this.updateFootballGoalkeeper(delta, playerAimX, isBallInAir, t);
    } else if (this.role === 'tennis_opponent' || this.role === 'badminton_opponent') {
      this.updateRallyOpponent(delta, playerAimX, isBallInAir, t);
    }
  }

  // Teammate: runs to get open, calls for the ball with waving hands, catches and shoots!
  updateTeammate(delta, t, isBallInAir) {
    const bounce = Math.abs(Math.sin(t * 3.0)) * 0.04;
    this.nodes.hips.position.y = 0.95 + bounce + this.jumpHeight;

    if (this.actionState === 'shooting') {
      // Follow-through release pose
      this.smoothRotate(this.nodes.leftShoulder, 2.4, 0, -0.2, 8.0, delta);
      this.smoothRotate(this.nodes.rightShoulder, 2.6, 0, 0.2, 8.0, delta);
      this.smoothRotate(this.nodes.rightElbow, 0.1, 0, 0, 8.0, delta);
      this.smoothRotate(this.nodes.leftElbow, 0.2, 0, 0, 8.0, delta);
      this.smoothRotate(this.nodes.head, -0.25, 0, 0, 6.0, delta);
      return;
    }

    if (this.actionState === 'catching') {
      // Two-handed chest catch
      this.smoothRotate(this.nodes.leftShoulder, 1.2, 0, 0.3, 10.0, delta);
      this.smoothRotate(this.nodes.rightShoulder, 1.2, 0, -0.3, 10.0, delta);
      this.smoothRotate(this.nodes.leftElbow, 0.9, 0, 0, 10.0, delta);
      this.smoothRotate(this.nodes.rightElbow, 0.9, 0, 0, 10.0, delta);
      return;
    }

    if (this.actionState === 'rebounding') {
      // Leaping up with both arms outstretched for offensive board
      this.smoothRotate(this.nodes.leftShoulder, Math.PI - 0.2, 0, -0.2, 9.0, delta);
      this.smoothRotate(this.nodes.rightShoulder, Math.PI - 0.2, 0, 0.2, 9.0, delta);
      this.smoothRotate(this.nodes.leftElbow, 0.1, 0, 0, 9.0, delta);
      this.smoothRotate(this.nodes.rightElbow, 0.1, 0, 0, 9.0, delta);
      this.smoothRotate(this.nodes.head, -0.35, 0, 0, 6.0, delta);
      return;
    }

    if (isBallInAir) {
      // Ball is in the air! Teammate stops waving, gets into ready athletic posture, and tracks the shot!
      this.smoothRotate(this.nodes.leftShoulder, 0.5, 0, -0.3, 6.0, delta);
      this.smoothRotate(this.nodes.rightShoulder, 0.5, 0, 0.3, 6.0, delta);
      this.smoothRotate(this.nodes.leftElbow, 0.4, 0, 0, 6.0, delta);
      this.smoothRotate(this.nodes.rightElbow, 0.4, 0, 0, 6.0, delta);
      this.smoothRotate(this.nodes.head, -0.28, 0, 0, 6.0, delta);

      const kneeBend = 0.28;
      this.nodes.leftHip.rotation.x = -kneeBend;
      this.nodes.rightHip.rotation.x = -kneeBend;
      this.nodes.leftKnee.rotation.x = kneeBend * 1.4;
      this.nodes.rightKnee.rotation.x = kneeBend * 1.4;
      return;
    }

    // Default: Signaling / calling for the pass ("OPEN!") with calm, natural athletic wave
    // Ensure teammate smoothly glides back to base position if displaced by rebound
    if (this.baseX !== undefined && this.baseZ !== undefined) {
      if (Math.abs(this.group.position.x - this.baseX) > 0.02) {
        this.group.position.x += (this.baseX - this.group.position.x) * 4.0 * delta;
      }
      if (Math.abs(this.group.position.z - this.baseZ) > 0.02) {
        this.group.position.z += (this.baseZ - this.group.position.z) * 4.0 * delta;
      }
    }

    this.smoothRotate(this.nodes.head, 0, 0, 0, 5.0, delta);
    const wave = Math.sin(t * 3.5) * 0.25;
    this.smoothRotate(this.nodes.rightShoulder, 1.8 + wave, 0, 0.4, 7.0, delta);
    this.smoothRotate(this.nodes.rightElbow, 0.6, 0, 0, 7.0, delta);
    this.smoothRotate(this.nodes.leftShoulder, 0.8, 0, -0.3, 7.0, delta);
    this.smoothRotate(this.nodes.leftElbow, 0.5, 0, 0, 7.0, delta);

    const kneeBend = 0.22 + Math.sin(t * 3.0) * 0.03;
    this.nodes.leftHip.rotation.x = -kneeBend;
    this.nodes.rightHip.rotation.x = -kneeBend;
    this.nodes.leftKnee.rotation.x = kneeBend * 1.3;
    this.nodes.rightKnee.rotation.x = kneeBend * 1.3;

    // Billboarding overhead pass tag towards camera
    if (this.nodes.overheadTag) {
      if (window.app && window.app.arena && window.app.arena.cameraRig) {
        const camPos = window.app.arena.cameraRig.position;
        const dx = camPos.x - this.group.position.x;
        const dz = camPos.z - this.group.position.z;
        this.nodes.overheadTag.rotation.y = Math.atan2(dx, dz);
      } else {
        this.nodes.overheadTag.rotation.y = 0;
      }
    }
  }

  // Trigger Teammate Catch & Immediate Shot/Goal
  triggerCatchAndShoot(onShootCallback) {
    this.actionState = 'catching';
    setTimeout(() => {
      this.actionState = 'shooting';
      this.jumpVelocity = 4.2;
      if (onShootCallback) onShootCallback();
    }, 380);
  }

  // Trigger Rebound Contest Jump (Arms outstretched above head)
  triggerReboundJump(onPeakCallback) {
    this.actionState = 'rebounding';
    this.jumpVelocity = 4.8;
    this.jumpHeight = 0.05;

    setTimeout(() => {
      if (onPeakCallback) onPeakCallback();
    }, 320);
  }

  // Trigger Defensive Interception / Swat
  triggerInterception(onInterceptCallback) {
    this.actionState = 'intercepting';
    if (onInterceptCallback) onInterceptCallback();
    setTimeout(() => {
      this.actionState = 'idle';
    }, 700);
  }

  // Trigger Opponent Counter-Attack Drive & Shot
  triggerOpponentShot(onShootCallback) {
    this.actionState = 'countering';
    this.jumpVelocity = 3.8;
    this.jumpHeight = 0.05;

    setTimeout(() => {
      if (onShootCallback) onShootCallback();
    }, 450);
  }

  updateBasketballDefender(delta, playerAimX, isBallInAir, t) {
    this.nodes.hips.position.y = 0.95 + this.jumpHeight;

    const isOnBallGuard = this.role === 'basketball_onball_defender' || this.name.includes('#23') || (this.baseX === 0 && this.baseZ > -3.8);
    const isCenter = this.role === 'basketball_center' || this.name.includes('#34');

    if (isOnBallGuard) {
      if (!isBallInAir) {
        // Active defensive slide stance: shadows player's aim horizontally
        const targetX = this.baseX + playerAimX * 0.9;
        this.group.position.x += (targetX - this.group.position.x) * 4.0 * delta;

        const armWave = Math.sin(t * 3.5) * 0.18;
        this.smoothRotate(this.nodes.leftShoulder, 1.9 + armWave, 0, -0.4, 7.0, delta);
        this.smoothRotate(this.nodes.rightShoulder, 2.1 - armWave, 0, 0.4, 7.0, delta);
        this.smoothRotate(this.nodes.leftElbow, 0.6, 0, 0, 7.0, delta);
        this.smoothRotate(this.nodes.rightElbow, 0.6, 0, 0, 7.0, delta);
        this.smoothRotate(this.nodes.head, 0, 0, 0, 5.0, delta);
      } else {
        // Ball in air! Freeze lateral sliding so defender doesn't jitter with mouse post-shot!
        // Smoothly contest shot with arms high and eyes tracking the ball
        this.smoothRotate(this.nodes.leftShoulder, Math.PI - 0.25, 0, -0.2, 8.0, delta);
        this.smoothRotate(this.nodes.rightShoulder, Math.PI - 0.25, 0, 0.2, 8.0, delta);
        this.smoothRotate(this.nodes.leftElbow, 0.1, 0, 0, 8.0, delta);
        this.smoothRotate(this.nodes.rightElbow, 0.1, 0, 0, 8.0, delta);
        this.smoothRotate(this.nodes.head, -0.32, 0, 0, 6.0, delta);
      }
    } else if (isCenter) {
      // Paint Protector Center #34: Anchored under basket
      const subtleBob = Math.sin(t * 2.0) * 0.03;
      this.group.position.x = this.baseX + subtleBob;

      if (this.jumpHeight > 0) {
        // Rebound leap reaching high for board
        this.smoothRotate(this.nodes.leftShoulder, Math.PI - 0.15, 0, -0.2, 9.0, delta);
        this.smoothRotate(this.nodes.rightShoulder, Math.PI - 0.15, 0, 0.2, 9.0, delta);
        this.smoothRotate(this.nodes.leftElbow, 0.1, 0, 0, 9.0, delta);
        this.smoothRotate(this.nodes.rightElbow, 0.1, 0, 0, 9.0, delta);
        this.smoothRotate(this.nodes.head, -0.35, 0, 0, 6.0, delta);
      } else {
        // Rim protection stance
        this.smoothRotate(this.nodes.leftShoulder, 1.4, 0, -0.5, 7.0, delta);
        this.smoothRotate(this.nodes.rightShoulder, 1.4, 0, 0.5, 7.0, delta);
        this.smoothRotate(this.nodes.leftElbow, 0.8, 0, 0, 7.0, delta);
        this.smoothRotate(this.nodes.rightElbow, 0.8, 0, 0, 7.0, delta);
        this.smoothRotate(this.nodes.head, isBallInAir ? -0.25 : 0, 0, 5.0, delta);
      }
    } else {
      // Perimeter Wing Defender #15: Shadows assigned man in denial stance
      const stalkShift = Math.sin(t * 1.8) * 0.06;
      this.group.position.x = this.baseX + stalkShift;
      this.smoothRotate(this.nodes.leftShoulder, 1.2, 0, -0.3, 6.0, delta);
      this.smoothRotate(this.nodes.rightShoulder, 1.5, 0, 0.3, 6.0, delta);
      this.smoothRotate(this.nodes.leftElbow, 0.6, 0, 0, 6.0, delta);
      this.smoothRotate(this.nodes.rightElbow, 0.6, 0, 0, 6.0, delta);
      this.smoothRotate(this.nodes.head, isBallInAir ? -0.25 : 0, 0, 5.0, delta);
    }

    const kneeBend = 0.30 + Math.sin(t * 2.5) * 0.03;
    this.nodes.leftHip.rotation.x = -kneeBend;
    this.nodes.rightHip.rotation.x = -kneeBend;
    this.nodes.leftKnee.rotation.x = kneeBend * 1.5;
    this.nodes.rightKnee.rotation.x = kneeBend * 1.5;
    this.nodes.spine.rotation.x = 0.15;
  }

  updateFootballDefender(delta, playerAimX, isBallInAir, t) {
    // Football Defenders stay firmly planted on the grass, shuffling laterally to block passing lanes
    this.nodes.hips.position.y = 0.95;

    const shuffle = Math.sin(t * 1.8 + (this.baseX > 0 ? 0 : Math.PI)) * 0.3;
    this.group.position.x = this.baseX + shuffle;

    // Athletic soccer posture (knees bent, arms slightly out for balance)
    this.smoothRotate(this.nodes.leftShoulder, 0.5, 0, -0.4, 6.0, delta);
    this.smoothRotate(this.nodes.rightShoulder, 0.5, 0, 0.4, 6.0, delta);
    this.smoothRotate(this.nodes.leftElbow, 0.7, 0, 0, 6.0, delta);
    this.smoothRotate(this.nodes.rightElbow, 0.7, 0, 0, 6.0, delta);
    this.smoothRotate(this.nodes.head, isBallInAir ? -0.25 : 0, 0, 5.0, delta);

    const kneeBend = 0.25 + Math.abs(Math.sin(t * 3.5)) * 0.04;
    this.nodes.leftHip.rotation.x = -kneeBend;
    this.nodes.rightHip.rotation.x = -kneeBend;
    this.nodes.leftKnee.rotation.x = kneeBend * 1.3;
    this.nodes.rightKnee.rotation.x = kneeBend * 1.3;
  }

  updateFootballGoalkeeper(delta, playerAimX, isBallInAir, t) {
    if (!isBallInAir) {
      const hop = Math.abs(Math.sin(t * 4.5)) * 0.05;
      this.nodes.hips.position.y = 0.95 + hop;
      
      const targetLateral = Math.max(-2.2, Math.min(2.2, playerAimX * 1.6));
      this.group.position.x += (targetLateral - this.group.position.x) * 3.0 * delta;
      this.group.position.y += (0 - this.group.position.y) * 5.0 * delta;
      this.group.rotation.z += (0 - this.group.rotation.z) * 5.0 * delta;

      this.smoothRotate(this.nodes.leftShoulder, 0.6, 0, -0.6, 8.0, delta);
      this.smoothRotate(this.nodes.rightShoulder, 0.6, 0, 0.6, 8.0, delta);
      this.smoothRotate(this.nodes.leftElbow, 0.8, 0, 0, 8.0, delta);
      this.smoothRotate(this.nodes.rightElbow, 0.8, 0, 0, 8.0, delta);
      this.smoothRotate(this.nodes.head, 0, 0, 0, 5.0, delta);

      this.nodes.leftHip.rotation.x = -0.35;
      this.nodes.rightHip.rotation.x = -0.35;
      this.nodes.leftKnee.rotation.x = 0.6;
      this.nodes.rightKnee.rotation.x = 0.6;
    } else {
      // Clamped, smooth dive towards goal corner
      const diveDir = Math.sign(playerAimX) || 1;
      const targetDiveX = Math.max(-2.3, Math.min(2.3, diveDir * 2.1));
      this.group.position.x += (targetDiveX - this.group.position.x) * 3.5 * delta;
      this.group.position.y += (0.85 - this.group.position.y) * 4.0 * delta;
      this.group.rotation.z += (-diveDir * 0.65 - this.group.rotation.z) * 4.0 * delta;

      this.smoothRotate(this.nodes.leftShoulder, Math.PI - 0.4, 0, -0.4, 8.0, delta);
      this.smoothRotate(this.nodes.rightShoulder, Math.PI - 0.4, 0, 0.4, 8.0, delta);
      this.smoothRotate(this.nodes.head, -0.3, 0, 0, 6.0, delta);
    }
  }

  updateRallyOpponent(delta, playerAimX, isBallInAir, t) {
    this.targetLateralPos = Math.max(-2.8, Math.min(2.8, playerAimX * 2.0));
    this.lateralPos += (this.targetLateralPos - this.lateralPos) * 3.0 * delta;
    this.group.position.x = this.lateralPos;

    const runBounce = Math.abs(Math.sin(t * 6.0)) * 0.08;
    this.nodes.hips.position.y = 0.95 + runBounce;

    const swing = Math.sin(t * 2.8) * 1.0;
    this.smoothRotate(this.nodes.rightShoulder, swing, 0, 0.3, 7.0, delta);
    this.smoothRotate(this.nodes.rightElbow, 0.7, 0, 0, 7.0, delta);
    this.smoothRotate(this.nodes.leftShoulder, -swing * 0.5, 0, -0.3, 7.0, delta);
    this.smoothRotate(this.nodes.head, isBallInAir ? -0.2 : 0, 0, 5.0, delta);
  }
}

window.HumanoidCharacter = HumanoidCharacter;
