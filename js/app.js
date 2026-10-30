/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * Streamlined Application & Team Match Controller
 * Supports Multi-player Matches, Passing (F/Shift/Pass button), & Goal/Assist Scoring.
 */

class AppController {
  constructor() {
    this.selectedSportKey = 'basketball';
    this.selectedPreset = 'seated';
    this.activeSport = null;
    this.arena = null;
    this.isPaused = false;

    this.hints = {
      basketball: "Hold Space to Shoot - Click Floor to Move - Pass with E / F",
      football: "Hold Space to Strike - Click Pitch to Move - Pass with E / F",
      tennis: "Swing racket with Space - Click Court to Move",
      badminton: "Smash with Space - Click Court to Move",
      bowling: "Hold Space to Roll - Click Floor to Move",
      archery: "Hold Space to Draw, Release to Strike"
    };
  }

  init() {
    this.arena = new ArenaScene();

    this.sports = {
      basketball: new BasketballSport(this.arena),
      football: new FootballSport(this.arena),
      tennis: new TennisSport(this.arena),
      badminton: new BadmintonSport(this.arena),
      bowling: new BowlingSport(this.arena),
      archery: new ArcherySport(this.arena)
    };

    this.bindUI();
    this.applyPreset(this.selectedPreset);

    console.log("Beyond Barriers team match mode initialized.");
  }

  applyPreset(presetKey) {
    this.selectedPreset = presetKey;
    if (!window.a11y) return;

    if (presetKey === 'seated') {
      window.a11y.set('seatedMode', true, false);
      window.a11y.set('gamePace', 'relaxed', false);
      window.a11y.set('oneHanded', true, false);
      window.a11y.set('aimAssistance', 'high', false);
      window.a11y.set('difficulty', 'beginner', false);

      if (window.inputManager) {
        window.inputManager.setTriggerMode('tap');
        window.inputManager.setGazeTargeting(false);
      }

      window.a11y.showLiveToast(
        "SEATED MOVEMENT ACTIVE",
        ["Eye-Level: 1.25m (Wheelchair Ergonomics)", "Game Pace: 0.7x Relaxed tempo", "Aim Assist: High Trajectory Lock"],
        "\u267F"
      );
    } else if (presetKey === 'adaptive-triggers') {
      window.a11y.set('seatedMode', true, false);
      window.a11y.set('gamePace', 'relaxed', false);
      window.a11y.set('oneHanded', true, false);
      window.a11y.set('aimAssistance', 'high', false);
      window.a11y.set('difficulty', 'beginner', false);

      if (window.inputManager) {
        window.inputManager.setTriggerMode('tap');
        window.inputManager.setGazeTargeting(false);
      }

      window.a11y.showLiveToast(
        "ADAPTIVE TRIGGERS ACTIVE",
        ["Instant single-tap action (Zero fatigue)", "Replaces large arm swings with button clicks", "Auto-oscillating meter option"],
        "\u26A1"
      );
    } else if (presetKey === 'gaze') {
      window.a11y.set('seatedMode', true, false);
      window.a11y.set('gamePace', 'relaxed', false);
      window.a11y.set('oneHanded', true, false);
      window.a11y.set('aimAssistance', 'high', false);
      window.a11y.set('difficulty', 'beginner', false);

      if (window.inputManager) {
        window.inputManager.setTriggerMode('tap');
        window.inputManager.setGazeTargeting(true);
      }

      window.a11y.showLiveToast(
        "GAZE TARGETING ACTIVE",
        ["Look at target to highlight", "0.8s circular dwell confirms shot hands-free", "Reduces need for arm movements"],
        "\u{1F441}"
      );
    } else if (presetKey === 'standard') {
      window.a11y.set('seatedMode', false, false);
      window.a11y.set('gamePace', 'standard', false);
      window.a11y.set('oneHanded', false, false);
      window.a11y.set('aimAssistance', 'medium', false);
      window.a11y.set('difficulty', 'intermediate', false);

      if (window.inputManager) {
        window.inputManager.setTriggerMode('hold');
        window.inputManager.setGazeTargeting(false);
      }

      window.a11y.showLiveToast(
        "CONTROLLER & KEYS ACTIVE",
        ["Standing eye-level: 1.68m", "Regulation game pace: 1.0x", "Tactile hold-to-charge & release"],
        "\u{1F3AE}"
      );
    }

    if (this.arena) {
      this.arena.updatePlayerHeight();
    }
  }

  playCurrentSport() {
    const launcher = document.getElementById('screen-launcher');
    if (launcher) launcher.classList.remove('active');

    if (this.activeSport) {
      this.activeSport.exit();
    }

    this.activeSport = this.sports[this.selectedSportKey];
    this.activeSport.enter('practice');

    // Ensure camera and character positions start in regulation Home Spot
    if (this.arena && this.arena.setTacticalSpot) {
      this.arena.setTacticalSpot('home');
    }

    const reticle = document.getElementById('aim-reticle');
    if (reticle) reticle.classList.add('active');

    const actionBtn = document.getElementById('btn-primary-action');
    if (actionBtn) {
      const labels = {
        basketball: "SHOOT",
        football: "KICK",
        tennis: "SWING",
        badminton: "SMASH",
        bowling: "ROLL",
        archery: "RELEASE"
      };
      actionBtn.textContent = labels[this.selectedSportKey] || "ACTION";
    }

    // Toggle Pass Buttons visibility based on sport team capability
    const passLeftBtn = document.getElementById('btn-pass-left');
    const passRightBtn = document.getElementById('btn-pass-right');
    const hasPassing = (this.selectedSportKey === 'basketball' || this.selectedSportKey === 'football');
    if (passLeftBtn) passLeftBtn.style.display = hasPassing ? 'inline-flex' : 'none';
    if (passRightBtn) passRightBtn.style.display = hasPassing ? 'inline-flex' : 'none';

    if (window.soundEngine) window.soundEngine.playUiClick();
    if (window.a11y) {
      window.a11y.announce(`Playing ${this.activeSport.name}.`);
    }

    // Launch guided interactive warm-up flow
    this.startTutorialFlow();
  }

  /* -------------------------------------------------------------
     MINIMAL INTERACTIVE WARM-UP TUTORIAL FLOW
     ------------------------------------------------------------- */
  startTutorialFlow() {
    this.inTutorial = true;
    this.tutorialStep = 1;
    if (this.activeSport) this.activeSport.inTutorial = true;

    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) overlay.classList.add('active');

    this.updateTutorialUI();
  }

  updateTutorialUI() {
    const badge = document.getElementById('tut-step-badge');
    const title = document.getElementById('tut-title');
    const desc = document.getElementById('tut-desc');
    const dot1 = document.getElementById('tut-dot-1');
    const dot2 = document.getElementById('tut-dot-2');
    const dot3 = document.getElementById('tut-dot-3');

    if (dot1) { dot1.className = 'tut-dot' + (this.tutorialStep === 1 ? ' active' : (this.tutorialStep > 1 ? ' completed' : '')); }
    if (dot2) { dot2.className = 'tut-dot' + (this.tutorialStep === 2 ? ' active' : (this.tutorialStep > 2 ? ' completed' : '')); }
    if (dot3) { dot3.className = 'tut-dot' + (this.tutorialStep === 3 ? ' active' : (this.tutorialStep > 3 ? ' completed' : '')); }

    if (this.tutorialStep === 1) {
      if (badge) badge.textContent = "WARM-UP 1/3";
      if (title) title.innerHTML = "&#x1F3C0; MOVE SPOT";
      if (desc) desc.innerHTML = 'Tap <strong>LEFT</strong> or <strong>RIGHT</strong> to change position.';
    } else if (this.tutorialStep === 2) {
      if (badge) badge.textContent = "WARM-UP 2/3";
      if (title) title.innerHTML = "&#x1F3C0; PASS";
      if (desc) desc.innerHTML = 'Tap <strong>PASS</strong> to feed open teammate.';
    } else if (this.tutorialStep === 3) {
      if (badge) badge.textContent = "WARM-UP 3/3";
      if (title) title.innerHTML = "&#x1F3C0; SHOOT";
      if (desc) desc.innerHTML = 'Click or Space to <strong>SHOOT</strong>!';
    }
  }

  onTutorialAction(action) {
    if (!this.inTutorial) return;

    if (action === 'move' && this.tutorialStep === 1) {
      this.tutorialStep = 2;
      const title = document.getElementById('tut-title');
      if (title) title.innerHTML = "&#x2714; MOVED!";
      if (window.soundEngine) window.soundEngine.playSuccessChime();
      setTimeout(() => this.updateTutorialUI(), 600);
    } else if (action === 'pass' && this.tutorialStep === 2) {
      this.tutorialStep = 3;
      const title = document.getElementById('tut-title');
      if (title) title.innerHTML = "&#x2714; GREAT PASS!";
      if (window.soundEngine) window.soundEngine.playSuccessChime();
      setTimeout(() => this.updateTutorialUI(), 600);
    } else if (action === 'shoot' && this.tutorialStep === 3) {
      this.tutorialStep = 4;
      const title = document.getElementById('tut-title');
      const desc = document.getElementById('tut-desc');
      if (title) title.innerHTML = "&#x2605; READY TO PLAY!";
      if (desc) desc.innerHTML = "Championship match starting...";
      if (window.soundEngine) window.soundEngine.playWhistle();
      setTimeout(() => this.completeTutorial(), 1000);
    }
  }

  completeTutorial() {
    this.inTutorial = false;
    if (this.activeSport) this.activeSport.inTutorial = false;

    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) overlay.classList.remove('active');

    if (window.soundEngine) window.soundEngine.playWhistle();
    if (window.a11y) window.a11y.announce("Match is live! 60 seconds on the clock.");
  }

  returnToLauncher() {
    this.completeTutorial();
    this.hideModals();
    if (this.activeSport) {
      this.activeSport.exit();
      this.activeSport = null;
    }

    const reticle = document.getElementById('aim-reticle');
    if (reticle) reticle.classList.remove('active');

    const launcher = document.getElementById('screen-launcher');
    if (launcher) launcher.classList.add('active');

    if (window.soundEngine) window.soundEngine.playUiClick();
  }

  togglePause() {
    const launcher = document.getElementById('screen-launcher');
    if (launcher && launcher.classList.contains('active')) return;

    const modal = document.getElementById('modal-pause');
    if (!modal) return;

    if (modal.classList.contains('active')) {
      this.resumeGame();
    } else {
      modal.classList.add('active');
      this.isPaused = true;
      if (this.activeSport) this.activeSport.isPaused = true;
      const resumeBtn = document.getElementById('btn-pause-resume');
      if (resumeBtn) resumeBtn.focus();
    }
  }

  resumeGame() {
    const modal = document.getElementById('modal-pause');
    if (modal) modal.classList.remove('active');
    this.isPaused = false;
    if (this.activeSport) this.activeSport.isPaused = false;
  }

  hideModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(m => m.classList.remove('active'));
    this.isPaused = false;
    if (this.activeSport) this.activeSport.isPaused = false;
  }

  bindUI() {
    // Sport Pills selection
    const sportPills = document.querySelectorAll('.sport-pill-btn');
    sportPills.forEach(btn => {
      btn.addEventListener('click', () => {
        sportPills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        this.selectedSportKey = btn.getAttribute('data-sport');
        if (window.soundEngine) window.soundEngine.playUiClick();
      });
    });

    // Preset selection
    const presetPills = document.querySelectorAll('.preset-pill-btn');
    presetPills.forEach(btn => {
      btn.addEventListener('click', () => {
        presetPills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        const preset = btn.getAttribute('data-preset');
        this.applyPreset(preset);
        if (window.soundEngine) window.soundEngine.playUiClick();
      });
    });

    // PLAY NOW button
    const btnPlayNow = document.getElementById('btn-play-now');
    if (btnPlayNow) {
      btnPlayNow.addEventListener('click', () => this.playCurrentSport());
    }

    // Skip Tutorial button
    const btnSkipTut = document.getElementById('btn-skip-tutorial');
    if (btnSkipTut) {
      btnSkipTut.addEventListener('click', (e) => {
        e.stopPropagation();
        this.completeTutorial();
      });
    }

    // Pass Action Buttons (Left & Right Teammates)
    const btnPassLeft = document.getElementById('btn-pass-left');
    if (btnPassLeft) {
      btnPassLeft.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (this.activeSport && this.activeSport.handlePass) {
          this.activeSport.handlePass('left');
        }
      });
    }

    const btnPassRight = document.getElementById('btn-pass-right');
    if (btnPassRight) {
      btnPassRight.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (this.activeSport && this.activeSport.handlePass) {
          this.activeSport.handlePass('right');
        }
      });
    }

    // 360 Navigation & Turn Buttons
    const btnTurnLeft = document.getElementById('btn-turn-left');
    if (btnTurnLeft) {
      btnTurnLeft.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.arena) this.arena.snapTurn(Math.PI / 4);
      });
    }

    const btnTurnRight = document.getElementById('btn-turn-right');
    if (btnTurnRight) {
      btnTurnRight.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.arena) this.arena.snapTurn(-Math.PI / 4);
      });
    }

    const btnRecenter = document.getElementById('btn-recenter');
    if (btnRecenter) {
      btnRecenter.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.arena) this.arena.recenterPlayer();
      });
    }

    // Tactical Court Spot Buttons
    const btnPosLeft = document.getElementById('btn-pos-left');
    if (btnPosLeft) {
      btnPosLeft.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.arena) this.arena.setTacticalSpot('left');
      });
    }

    const btnPosHome = document.getElementById('btn-pos-home');
    if (btnPosHome) {
      btnPosHome.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.arena) this.arena.setTacticalSpot('home');
      });
    }

    const btnPosRight = document.getElementById('btn-pos-right');
    if (btnPosRight) {
      btnPosRight.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.arena) this.arena.setTacticalSpot('right');
      });
    }

    // Big Primary Action Button (Shoot / Kick / Action)
    const btnPrimary = document.getElementById('btn-primary-action');
    if (btnPrimary) {
      btnPrimary.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (window.soundEngine) window.soundEngine.ensureContext();
        if (window.inputManager) {
          if (window.inputManager.triggerMode === 'tap') {
            window.inputManager.triggerTapAction();
          } else if (window.inputManager.triggerMode === 'oscillate' || (window.a11y && window.a11y.get('simplifiedMotion'))) {
            window.inputManager.toggleSimplifiedAction();
          } else {
            window.inputManager.startCharging();
          }
        }
      });
      btnPrimary.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        if (window.inputManager && window.inputManager.triggerMode === 'hold' && (!window.a11y || !window.a11y.get('simplifiedMotion'))) {
          window.inputManager.releaseAction();
        }
      });
    }

    // Session Duration pills on launcher (Comfort & Fatigue)
    const durationPills = document.querySelectorAll('.duration-pill-btn');
    durationPills.forEach(btn => {
      btn.addEventListener('click', () => {
        durationPills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        const dur = Number(btn.getAttribute('data-duration'));
        this.setSessionDuration(dur);
        if (window.soundEngine) window.soundEngine.playUiClick();
      });
    });

    // Quick HUD Toolbar Buttons
    const btnHudTrigger = document.getElementById('btn-toggle-trigger');
    if (btnHudTrigger) {
      btnHudTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.inputManager) window.inputManager.toggleTriggerMode();
      });
    }

    const btnHudGaze = document.getElementById('btn-toggle-gaze');
    if (btnHudGaze) {
      btnHudGaze.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.inputManager) window.inputManager.toggleGazeTargeting();
      });
    }

    const btnHudDuration = document.getElementById('btn-toggle-duration');
    if (btnHudDuration) {
      btnHudDuration.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cycleSessionDuration();
      });
    }

    // Settings Modal Tab Switcher (Controls vs Inclusive Design Principles)
    const tabBtnControls = document.getElementById('tab-btn-controls');
    const tabBtnPrinciples = document.getElementById('tab-btn-principles');
    const panelControls = document.getElementById('settings-tab-controls');
    const panelPrinciples = document.getElementById('settings-tab-principles');

    if (tabBtnControls && tabBtnPrinciples) {
      tabBtnControls.addEventListener('click', () => {
        tabBtnControls.classList.add('active');
        tabBtnControls.setAttribute('aria-selected', 'true');
        tabBtnPrinciples.classList.remove('active');
        tabBtnPrinciples.setAttribute('aria-selected', 'false');
        if (panelControls) panelControls.style.display = 'block';
        if (panelPrinciples) panelPrinciples.style.display = 'none';
        if (window.soundEngine) window.soundEngine.playUiClick();
      });

      tabBtnPrinciples.addEventListener('click', () => {
        tabBtnPrinciples.classList.add('active');
        tabBtnPrinciples.setAttribute('aria-selected', 'true');
        tabBtnControls.classList.remove('active');
        tabBtnControls.setAttribute('aria-selected', 'false');
        if (panelControls) panelControls.style.display = 'none';
        if (panelPrinciples) panelPrinciples.style.display = 'block';
        if (window.soundEngine) window.soundEngine.playUiClick();
      });
    }

    const btnDoneSettings = document.getElementById('btn-close-settings-done');
    if (btnDoneSettings) {
      btnDoneSettings.addEventListener('click', () => {
        const modal = document.getElementById('modal-settings');
        if (modal) modal.classList.remove('active');
      });
    }

    // Setting inputs for Adaptive Trigger, Gaze, and Session Duration
    const selTrigger = document.getElementById('sel-trigger-mode');
    if (selTrigger) {
      selTrigger.addEventListener('change', () => {
        if (window.inputManager) window.inputManager.setTriggerMode(selTrigger.value);
      });
    }

    const chkGaze = document.getElementById('chk-gaze-targeting');
    if (chkGaze) {
      chkGaze.addEventListener('change', () => {
        if (window.inputManager) window.inputManager.setGazeTargeting(chkGaze.checked);
      });
    }

    const selDuration = document.getElementById('sel-session-duration');
    if (selDuration) {
      selDuration.addEventListener('change', () => {
        this.setSessionDuration(Number(selDuration.value));
      });
    }

    const chip360 = document.getElementById('chip-toggle-360nav');
    if (chip360) {
      chip360.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.arena) this.arena.recenterPlayer();
      });
    }

    // Match Result Modal Actions
    const btnResultRematch = document.getElementById('btn-result-rematch');
    if (btnResultRematch) {
      btnResultRematch.addEventListener('click', () => {
        this.hideModals();
        if (this.activeSport) this.activeSport.restart();
      });
    }

    const btnResultChangeSport = document.getElementById('btn-result-change-sport');
    if (btnResultChangeSport) {
      btnResultChangeSport.addEventListener('click', () => {
        this.returnToLauncher();
      });
    }

    // Settings Modal Open/Close
    const btnOpenSettings = document.getElementById('btn-open-settings');
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', () => {
        const modal = document.getElementById('modal-settings');
        if (modal) modal.classList.add('active');
        if (window.soundEngine) window.soundEngine.playUiClick();
      });
    }

    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', () => {
        const modal = document.getElementById('modal-settings');
        if (modal) modal.classList.remove('active');
      });
    }

    // Primary Action Button handled in lines 401-420 above

    // Pause HUD button
    const btnHudPause = document.getElementById('btn-hud-pause');
    if (btnHudPause) {
      btnHudPause.addEventListener('click', () => this.togglePause());
    }

    // Pause Modal Buttons
    const btnPauseResume = document.getElementById('btn-pause-resume');
    if (btnPauseResume) btnPauseResume.addEventListener('click', () => this.resumeGame());

    const btnPauseRestart = document.getElementById('btn-pause-restart');
    if (btnPauseRestart) {
      btnPauseRestart.addEventListener('click', () => {
        this.hideModals();
        if (this.activeSport) this.activeSport.restart();
      });
    }

    const btnPauseChangeSport = document.getElementById('btn-pause-change-sport');
    if (btnPauseChangeSport) btnPauseChangeSport.addEventListener('click', () => this.returnToLauncher());

    const btnPauseSettings = document.getElementById('btn-pause-settings');
    if (btnPauseSettings) {
      btnPauseSettings.addEventListener('click', () => {
        this.hideModals();
        const modal = document.getElementById('modal-settings');
        if (modal) modal.classList.add('active');
      });
    }

    // Enter VR button
    const btnEnterVR = document.getElementById('btn-enter-vr');
    if (btnEnterVR) {
      btnEnterVR.addEventListener('click', () => {
        if (this.arena) this.arena.enterVR();
      });
    }

    // Keyboard Shortcuts (P, Escape for Pause; F, E, Shift for Pass)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }

      // E -> Pass Left, F / Shift -> Pass Right
      if (e.code === 'KeyE') {
        if (this.activeSport && this.activeSport.handlePass) this.activeSport.handlePass('left');
      } else if (e.code === 'KeyF' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (this.activeSport && this.activeSport.handlePass) this.activeSport.handlePass('right');
      }
    });

    // Gamepad button pass mapping (Button 2 / X / Square)
    if (window.inputManager) {
      const origGamepadPoll = window.inputManager.initGamepadPolling;
      // Also listen on retry or secondary button
      window.addEventListener('gamepadbuttondown', (e) => {
        if (e.button === 2 && this.activeSport && this.activeSport.handlePass) {
          this.activeSport.handlePass();
        }
      });
    }

    // Interactive Accessibility Telemetry Chips
    const chipHeight = document.getElementById('chip-toggle-height');
    if (chipHeight) {
      chipHeight.addEventListener('click', () => {
        if (window.a11y) {
          window.a11y.toggleSeated();
          if (this.arena) this.arena.updatePlayerHeight();
        }
      });
    }

    const chipPace = document.getElementById('chip-toggle-pace');
    if (chipPace) {
      chipPace.addEventListener('click', () => {
        if (window.a11y) window.a11y.cyclePace();
      });
    }

    const chipAssist = document.getElementById('chip-toggle-assist');
    if (chipAssist) {
      chipAssist.addEventListener('click', () => {
        if (window.a11y) window.a11y.cycleAimAssist();
      });
    }

    const chipInput = document.getElementById('chip-toggle-input');
    if (chipInput) {
      chipInput.addEventListener('click', () => {
        if (window.a11y) window.a11y.set('oneHanded', !window.a11y.get('oneHanded'));
      });
    }

    // Settings checkboxes & selects
    const chkSeated = document.getElementById('chk-seated-mode');
    if (chkSeated && window.a11y) {
      chkSeated.checked = window.a11y.get('seatedMode');
      chkSeated.addEventListener('change', () => {
        window.a11y.set('seatedMode', chkSeated.checked);
        if (this.arena) this.arena.updatePlayerHeight();
      });
    }
    const selPace = document.getElementById('sel-game-pace');
    if (selPace && window.a11y) {
      selPace.value = window.a11y.get('gamePace');
      selPace.addEventListener('change', () => window.a11y.set('gamePace', selPace.value));
    }
    const chkOneHand = document.getElementById('chk-one-handed');
    if (chkOneHand && window.a11y) {
      chkOneHand.checked = window.a11y.get('oneHanded');
      chkOneHand.addEventListener('change', () => window.a11y.set('oneHanded', chkOneHand.checked));
    }
    const selAssist = document.getElementById('sel-aim-assist');
    if (selAssist && window.a11y) {
      selAssist.value = window.a11y.get('aimAssistance');
      selAssist.addEventListener('change', () => window.a11y.set('aimAssistance', selAssist.value));
    }
    const selDiff = document.getElementById('sel-difficulty');
    if (selDiff && window.a11y) {
      selDiff.value = window.a11y.get('difficulty');
      selDiff.addEventListener('change', () => window.a11y.set('difficulty', selDiff.value));
    }
    const chkContrast = document.getElementById('chk-high-contrast');
    if (chkContrast && window.a11y) {
      chkContrast.checked = window.a11y.get('highContrast');
      chkContrast.addEventListener('change', () => window.a11y.set('highContrast', chkContrast.checked));
    }
    const chkAudio = document.getElementById('chk-audio-feedback');
    if (chkAudio && window.a11y) {
      chkAudio.checked = window.a11y.get('audioFeedback');
      chkAudio.addEventListener('change', () => window.a11y.set('audioFeedback', chkAudio.checked));
    }
  }

  setSessionDuration(seconds) {
    if (window.inputManager) window.inputManager.sessionDuration = seconds;
    if (this.activeSport) {
      this.activeSport.matchDuration = seconds;
      this.activeSport.matchTimeRemaining = seconds;
      this.activeSport.updateHUD();
    }

    const durLbl = document.getElementById('hud-pill-duration-lbl');
    if (durLbl) {
      durLbl.textContent = seconds === 0 ? 'PRACTICE \u221E' : `${seconds}s MATCH`;
    }

    const selDuration = document.getElementById('sel-session-duration');
    if (selDuration) selDuration.value = String(seconds);

    // Update launcher pills
    const durationPills = document.querySelectorAll('.duration-pill-btn');
    durationPills.forEach(p => {
      const isMatch = Number(p.getAttribute('data-duration')) === seconds;
      p.classList.toggle('active', isMatch);
      p.setAttribute('aria-checked', isMatch ? 'true' : 'false');
    });

    if (window.a11y) {
      const name = seconds === 0 ? 'Practice Mode (Untimed)' : `${seconds} Seconds Match`;
      window.a11y.announce(`Session Length set to ${name}`);
    }
  }

  cycleSessionDuration() {
    const list = [30, 60, 120, 0];
    const current = window.inputManager ? window.inputManager.sessionDuration : 60;
    const nextIdx = (list.indexOf(current) + 1) % list.length;
    this.setSessionDuration(list[nextIdx]);
    if (window.soundEngine) window.soundEngine.playUiClick();
  }
}

function bootBeyondBarriers() {
  if (!window.app) {
    window.app = new AppController();
    window.app.init();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootBeyondBarriers);
} else {
  bootBeyondBarriers();
}
