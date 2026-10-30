/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * Shared Accessible Input Manager
 * Bridges Mouse, Touch, Keyboard, Gamepad, WebXR Controllers & Gaze Targeting
 * into a single unified event & state interface.
 */

class InputManager {
  constructor() {
    // Current Aim & Action State
    this.aimX = 0; // -1 (left) to +1 (right)
    this.aimY = 0; // -1 (down) to +1 (up)
    this.power = 0.5; // 0.0 to 1.0
    this.isCharging = false;
    this.chargeDirection = 1;
    this.isOscillating = false; // For simplified one-touch auto-oscillation

    // Adaptive Trigger Mode: 'tap' (instant calibrated, zero fatigue), 'hold' (charge & release), 'oscillate' (2-tap auto-timing)
    this.triggerMode = 'tap';
    this.sessionDuration = 60; // 30, 60, 120, or 0 (practice)

    // Gaze Targeting Dwell State
    this.isGazeTargeting = false;
    this.gazeDwellTime = 0.0;
    this.gazeTargetDuration = 0.8; // 0.8 seconds to confirm action
    this.gazeCurrentTarget = null;
    
    // Callbacks registered by active sport
    this.onActionStart = null;
    this.onActionRelease = null;
    this.onActionTrigger = null;
    this.onPauseToggle = null;
    this.onRetry = null;
    
    // Pointer state
    this.isPointerDown = false;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    
    // Keyboard state
    this.keys = {};
    
    // XR Controller pointers
    this.xrControllers = [];
    this.activeXrRay = null;

    this.initKeyboard();
    this.initMouseAndTouch();
    this.initGamepadPolling();
  }

  // Bind an active sport's action delegates
  bindSport(sport) {
    if (!sport) {
      this.onActionStart = null;
      this.onActionRelease = null;
      this.onActionTrigger = null;
      this.onPass = null;
      this.onRetry = null;
      return;
    }

    this.onActionStart = () => sport.handleActionStart();
    this.onActionRelease = (power, aimX, aimY) => sport.handleActionRelease(power, aimX, aimY);
    this.onActionTrigger = () => sport.handleActionTrigger();
    this.onPass = (direction) => sport.handlePass ? sport.handlePass(direction) : null;
    this.onRetry = () => sport.handleRetry();
  }

  /* -------------------------------------------------------------
     POINTER / MOUSE / TOUCH INPUT (Adaptive Triggers)
     ------------------------------------------------------------- */
  initMouseAndTouch() {
    const canvas = document.getElementById('webgl-canvas') || window;

    window.addEventListener('pointerdown', (e) => {
      // Ignore right-clicks (reserved for 360 camera look-drag)
      if (e.button === 2 || e.button === 1 || e.shiftKey) {
        return;
      }

      // Ignore clicks on UI elements marked interactive
      if (e.target && e.target.closest && (e.target.closest('.interactive') || e.target.closest('button') || e.target.closest('select') || e.target.closest('input'))) {
        return;
      }

      this.isPointerDown = true;
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;

      if (window.soundEngine) window.soundEngine.ensureContext();

      // Dispatch based on Adaptive Trigger mode
      if (this.triggerMode === 'tap') {
        this.triggerTapAction();
      } else if (this.triggerMode === 'oscillate' || (window.a11y && window.a11y.get('simplifiedMotion'))) {
        this.toggleSimplifiedAction();
      } else {
        this.startCharging();
      }
    });

    window.addEventListener('pointermove', (e) => {
      // Update normalized aim coordinate [-1 to +1] relative to viewport center
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      
      const nx = (e.clientX / width) * 2 - 1;
      const ny = -((e.clientY / height) * 2 - 1);
      
      // Update aim coordinates smoothly
      this.setAim(nx, ny);
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;

      if (this.triggerMode === 'hold' && (!window.a11y || !window.a11y.get('simplifiedMotion'))) {
        this.releaseAction();
      }
    });
  }

  /* -------------------------------------------------------------
     KEYBOARD INPUT (Full Accessibility Shortcuts & Adaptive Modes)
     ------------------------------------------------------------- */
  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Don't capture when typing in an input
      if (e.target && e.target.tagName === 'INPUT') return;

      this.keys[e.code] = true;

      // Space / Enter -> Primary Sport Action
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (window.soundEngine) window.soundEngine.ensureContext();

        if (this.triggerMode === 'tap') {
          this.triggerTapAction();
        } else if (this.triggerMode === 'oscillate' || (window.a11y && window.a11y.get('simplifiedMotion'))) {
          this.toggleSimplifiedAction();
        } else if (!this.isCharging) {
          this.startCharging();
        }
      }

      // E -> Pass Left to Teammate
      if (e.code === 'KeyE') {
        e.preventDefault();
        if (this.onPass) this.onPass('left');
      }

      // F -> Pass Right to Teammate
      if (e.code === 'KeyF') {
        e.preventDefault();
        if (this.onPass) this.onPass('right');
      }

      // R -> Retry / Restart shot
      if (e.code === 'KeyR') {
        e.preventDefault();
        if (this.onRetry) this.onRetry();
      }

      // P or Escape -> Pause Menu
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        if (window.app && window.app.togglePause) {
          window.app.togglePause();
        }
      }

      // Tactical Court Spot Shortcuts:
      // '1' -> Left Wing
      // '2' or 'C' -> Return to Regulation Home Spot
      // '3' -> Right Wing
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        if (window.app && window.app.arena && window.app.arena.setTacticalSpot) {
          window.app.arena.setTacticalSpot('left');
        }
      } else if (e.code === 'Digit2' || e.code === 'Numpad2' || e.code === 'KeyC') {
        if (window.app && window.app.arena && window.app.arena.setTacticalSpot) {
          window.app.arena.setTacticalSpot('home');
        }
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        if (window.app && window.app.arena && window.app.arena.setTacticalSpot) {
          window.app.arena.setTacticalSpot('right');
        }
      }

      // Quick Aim via Arrow keys / WASD
      this.updateKeyboardAim();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;

      if (e.code === 'Space' || e.code === 'Enter') {
        if (this.triggerMode === 'hold' && (!window.a11y || !window.a11y.get('simplifiedMotion'))) {
          this.releaseAction();
        }
      }
    });
  }

  updateKeyboardAim() {
    const step = 0.08;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
      this.setAim(Math.max(-1, this.aimX - step), this.aimY);
    }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) {
      this.setAim(Math.min(1, this.aimX + step), this.aimY);
    }
    if (this.keys['ArrowUp'] || this.keys['KeyW']) {
      this.setAim(this.aimX, Math.min(1, this.aimY + step));
    }
    if (this.keys['ArrowDown'] || this.keys['KeyS']) {
      this.setAim(this.aimX, Math.max(-1, this.aimY - step));
    }
  }

  /* -------------------------------------------------------------
     GAMEPAD POLLING (Xbox, PlayStation, Generic Gamepads)
     ------------------------------------------------------------- */
  initGamepadPolling() {
    let prevButton0 = false;
    let prevButton9 = false;

    const poll = () => {
      if (window.a11y && window.a11y.get('controllerInput') && navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
          if (!gp) continue;

          // Left Stick Aim
          const axisX = gp.axes[0];
          const axisY = gp.axes[1];
          if (Math.abs(axisX) > 0.1 || Math.abs(axisY) > 0.1) {
            this.setAim(axisX, -axisY);
          }

          // Button 0 (A / Cross) -> Primary Action
          const btn0 = gp.buttons[0] && gp.buttons[0].pressed;
          if (btn0 && !prevButton0) {
            if (this.triggerMode === 'tap') {
              this.triggerTapAction();
            } else if (this.triggerMode === 'oscillate' || window.a11y.get('simplifiedMotion')) {
              this.toggleSimplifiedAction();
            } else {
              this.startCharging();
            }
          } else if (!btn0 && prevButton0) {
            if (this.triggerMode === 'hold' && !window.a11y.get('simplifiedMotion')) {
              this.releaseAction();
            }
          }
          prevButton0 = btn0;

          // Button 9 (Start) -> Pause
          const btn9 = gp.buttons[9] && gp.buttons[9].pressed;
          if (btn9 && !prevButton9) {
            if (window.app && window.app.togglePause) window.app.togglePause();
          }
          prevButton9 = btn9;

          // Button 2 (X / Square) -> Retry
          if (gp.buttons[2] && gp.buttons[2].pressed && this.onRetry) {
            this.onRetry();
          }

          // Button 1 (B / Circle) -> Pass Right
          if (gp.buttons[1] && gp.buttons[1].pressed && this.onPass) {
            this.onPass('right');
          }

          // Button 4 (LB / Left Bumper) -> Pass Left
          if (gp.buttons[4] && gp.buttons[4].pressed && this.onPass) {
            this.onPass('left');
          }
        }
      }
      requestAnimationFrame(poll);
    };

    requestAnimationFrame(poll);
  }

  /* -------------------------------------------------------------
     ACTION CHARGE & RELEASE LOGIC
     ------------------------------------------------------------- */
  startCharging() {
    if (this.isCharging) return;
    this.isCharging = true;
    this.power = 0.2;
    this.chargeDirection = 1;
    if (this.onActionStart) this.onActionStart();
  }

  releaseAction() {
    if (!this.isCharging) return;
    this.isCharging = false;
    this.isOscillating = false;

    if (window.a11y) {
      window.a11y.triggerHaptic(120, 0.7, 0.5);
    }

    if (this.onActionRelease) {
      this.onActionRelease(this.power, this.aimX, this.aimY);
    }

    const label = document.getElementById('power-bar-label');
    if (label) {
      label.textContent = 'CLICK OR HOLD SPACE TO CHARGE';
      label.style.color = '#ffffff';
    }
  }

  // Simplified One-Button Motion: Tap once to start oscillating gauge, tap again to shoot!
  toggleSimplifiedAction() {
    if (!this.isOscillating) {
      this.isOscillating = true;
      this.startCharging();
    } else {
      this.releaseAction();
    }
  }

  // Adaptive Trigger Mode Switcher ('tap', 'hold', 'oscillate')
  setTriggerMode(mode) {
    this.triggerMode = mode;
    const lbl = document.getElementById('hud-pill-trigger-lbl');
    if (lbl) {
      const titles = { tap: 'TRIGGER: TAP', hold: 'TRIGGER: HOLD', oscillate: 'TRIGGER: AUTO' };
      lbl.textContent = titles[mode] || 'TRIGGER: TAP';
    }
    const btn = document.getElementById('btn-toggle-trigger');
    if (btn) btn.classList.toggle('active', mode !== 'hold');

    const sel = document.getElementById('sel-trigger-mode');
    if (sel) sel.value = mode;

    if (window.a11y) {
      window.a11y.set('simplifiedMotion', mode === 'oscillate', false);
      window.a11y.announce(`Adaptive Trigger Mode: ${mode.toUpperCase()}`);
    }
  }

  toggleTriggerMode() {
    const modes = ['tap', 'hold', 'oscillate'];
    const nextIdx = (modes.indexOf(this.triggerMode) + 1) % modes.length;
    this.setTriggerMode(modes[nextIdx]);
    if (window.soundEngine) window.soundEngine.playUiClick();
  }

  // Instant single-tap / button press calibrated shot (zero physical fatigue)
  triggerTapAction() {
    if (window.soundEngine) window.soundEngine.ensureContext();
    if (window.a11y) window.a11y.triggerHaptic(100, 0.6, 0.4);

    const calibratedPower = 0.74;
    this.power = calibratedPower;

    const fill = document.getElementById('power-bar-fill');
    if (fill) {
      fill.style.width = '74%';
      setTimeout(() => { if (!this.isCharging && fill) fill.style.width = '0%'; }, 350);
    }

    if (this.onActionRelease) {
      this.onActionRelease(calibratedPower, this.aimX, this.aimY);
    }
  }

  // Hands-free Gaze Targeting & Dwell Confirmation
  setGazeTargeting(enabled) {
    this.isGazeTargeting = !!enabled;
    const btn = document.getElementById('btn-toggle-gaze');
    const lbl = document.getElementById('hud-pill-gaze-lbl');
    if (btn) btn.classList.toggle('active', this.isGazeTargeting);
    if (lbl) lbl.textContent = this.isGazeTargeting ? 'GAZE: ON' : 'GAZE: OFF';

    const chk = document.getElementById('chk-gaze-targeting');
    if (chk) chk.checked = this.isGazeTargeting;

    if (window.a11y) {
      window.a11y.set('gazeAssistance', this.isGazeTargeting, false);
      window.a11y.announce(`Gaze Targeting ${this.isGazeTargeting ? 'Enabled' : 'Disabled'}`);
    }
    if (!this.isGazeTargeting) {
      this.resetGazeDwell();
    }
  }

  toggleGazeTargeting() {
    this.setGazeTargeting(!this.isGazeTargeting);
    if (window.soundEngine) window.soundEngine.playUiClick();
  }

  tickGazeDwell(delta, targetType, onConfirm) {
    if (!this.isGazeTargeting || !targetType) {
      this.resetGazeDwell();
      return;
    }

    if (this.gazeCurrentTarget !== targetType) {
      this.gazeCurrentTarget = targetType;
      this.gazeDwellTime = 0.0;
    }

    this.gazeDwellTime += delta;
    const progress = Math.min(1.0, this.gazeDwellTime / this.gazeTargetDuration);

    const fill = document.getElementById('gaze-dwell-fill');
    if (fill) {
      const circumference = 100.53;
      fill.style.strokeDashoffset = `${circumference * (1.0 - progress)}`;
    }

    if (progress >= 1.0) {
      this.resetGazeDwell();
      if (onConfirm) onConfirm();
    }
  }

  resetGazeDwell() {
    this.gazeDwellTime = 0.0;
    this.gazeCurrentTarget = null;
    const fill = document.getElementById('gaze-dwell-fill');
    if (fill) {
      fill.style.strokeDashoffset = '100.53';
    }
  }

  // Direct trigger (e.g. from UI Big Action button)
  triggerAction() {
    if (this.triggerMode === 'tap') {
      this.triggerTapAction();
    } else if (this.triggerMode === 'oscillate' || (window.a11y && window.a11y.get('simplifiedMotion'))) {
      this.toggleSimplifiedAction();
    } else {
      if (this.onActionRelease) {
        this.onActionRelease(this.power || 0.74, this.aimX, this.aimY);
      }
    }
  }

  // Set normalized aim with optional gaze magnetism
  setAim(x, y) {
    this.aimX = Math.max(-1, Math.min(1, x));
    this.aimY = Math.max(-1, Math.min(1, y));

    // Update on-screen reticle position
    const reticle = document.getElementById('aim-reticle');
    if (reticle) {
      const screenX = (this.aimX * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-this.aimY * 0.5 + 0.5) * window.innerHeight;
      reticle.style.left = `${screenX}px`;
      reticle.style.top = `${screenY}px`;
    }
  }

  // Update tick for charging animation
  update(delta = 0.016) {
    if (this.isCharging) {
      // Oscillate power between 0.15 and 1.0 smoothly
      const speed = 1.6;
      this.power += this.chargeDirection * speed * delta;
      if (this.power >= 1.0) {
        this.power = 1.0;
        this.chargeDirection = -1;
      } else if (this.power <= 0.15) {
        this.power = 0.15;
        this.chargeDirection = 1;
      }

      // Update HUD Power Bar
      const fill = document.getElementById('power-bar-fill');
      if (fill) {
        fill.style.width = `${Math.round(this.power * 100)}%`;
      }

      const label = document.getElementById('power-bar-label');
      if (label) {
        const pct = Math.round(this.power * 100);
        if (pct >= 62 && pct <= 82) {
          label.textContent = `PERFECT POWER: ${pct}% - RELEASE!`;
          label.style.color = '#34d399';
        } else {
          label.textContent = `CHARGING: ${pct}% - RELEASE TO SHOOT`;
          label.style.color = '#ffffff';
        }
      }
    }

    // Continuous keyboard aim adjustment
    if (this.keys['ArrowLeft'] || this.keys['ArrowRight'] || this.keys['ArrowUp'] || this.keys['ArrowDown'] ||
        this.keys['KeyA'] || this.keys['KeyD'] || this.keys['KeyW'] || this.keys['KeyS']) {
      this.updateKeyboardAim();
    }
  }
}

// Global input manager singleton
window.inputManager = new InputManager();
