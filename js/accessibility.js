/**
 * BEYOND BARRIERS - INCLUSIVE VR SPORTS
 * Central Accessibility & Ergonomics Manager
 * Manages player profiles, assistive mechanisms, input remapping, and UI scaling.
 * Features live telemetry, real-time height transition feedback, and game pace adjustment.
 */

class AccessibilityManager {
  constructor() {
    this.STORAGE_KEY = 'beyond_barriers_a11y_prefs_v1';
    
    // Default Preferences
    this.settings = {
      seatedMode: true,           // Seated / Wheelchair mode: 1.25m eye height, reachable arc
      gamePace: 'relaxed',        // 'relaxed' (0.7x speed - slower ball & extra reaction time), 'standard' (1.0x), 'fast' (1.25x)
      oneHanded: true,            // All essential actions mapped to a single trigger/button/mouse
      simplifiedMotion: true,     // Tap-to-aim and hold/release instead of large physical arm swings
      controllerInput: true,      // Full gamepad and XR controller mapping
      handTracking: false,        // XR hand tracking with pinch gesture if supported by headset
      gazeAssistance: false,      // Dwell/reticle targeting with separate confirmation button
      aimAssistance: 'high',      // 'off', 'low', 'medium', 'high'
      difficulty: 'beginner',     // 'beginner', 'intermediate', 'advanced'
      audioFeedback: true,        // Web Audio synthesized sound effects
      visualFeedback: true,       // Impact ripples, trajectory guides, floating score indicators
      hapticFeedback: true,       // Controller and gamepad vibration pulses
      highContrast: false,        // High-contrast theme (pure black/yellow/white)
      textSize: 'large',          // 'normal', 'large', 'xlarge'
      restReminderInterval: 10,   // Minutes between gentle rest reminders (0 = off)
      speechFeedback: false       // Text-to-speech spoken game announcements
    };

    this.listeners = [];
    this.restTimer = null;
    this.toastTimer = null;
    this.sessionStartTime = Date.now();
    
    this.loadSettings();
    this.applySettingsToDOM();
    this.initRestReminder();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (e) {
      console.warn("Could not load accessibility settings from localStorage:", e);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn("Could not save accessibility settings to localStorage:", e);
    }
  }

  set(key, value, showToast = true) {
    if (this.settings.hasOwnProperty(key)) {
      const oldValue = this.settings[key];
      this.settings[key] = value;
      this.saveSettings();
      this.applySettingsToDOM();
      this.notifyListeners(key, value);
      
      // Update Audio Engine mute status if relevant
      if (key === 'audioFeedback' && window.soundEngine) {
        window.soundEngine.enabled = value;
      }

      // Reset rest timer if interval modified
      if (key === 'restReminderInterval') {
        this.initRestReminder();
      }

      // Provide visible feedback showing exactly what changed!
      if (showToast && oldValue !== value) {
        this.showToastForSetting(key, value);
      }
    }
  }

  get(key) {
    return this.settings[key];
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(key, value) {
    this.listeners.forEach(cb => {
      try {
        cb(key, value, this.settings);
      } catch (err) {
        console.error("Accessibility listener error:", err);
      }
    });
  }

  // Live on-screen notification showing physical & ergonomic changes in effect
  showLiveToast(title, details = [], icon = '\u267F') {
    const container = document.getElementById('a11y-live-toast');
    if (!container) return;

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    container.innerHTML = `
      <div class="toast-badge-pill">
        <span class="toast-badge-icon">${icon}</span>
        <span class="toast-badge-text">${title}</span>
      </div>
    `;

    container.classList.add('active');

    if (window.soundEngine) {
      window.soundEngine.playUiClick();
    }

    this.announce(title);

    this.toastTimer = setTimeout(() => {
      container.classList.remove('active');
    }, 1800);
  }

  showToastForSetting(key, value) {
    switch (key) {
      case 'seatedMode':
        if (value) {
          this.showLiveToast(
            'SEATED / WHEELCHAIR MODE ACTIVE',
            ['View height: 1.25m seated eye-level', 'Reachable forward throwing zone', 'Camera smoothly lowered'],
            '\u267F'
          );
        } else {
          this.showLiveToast(
            'STANDING MODE ACTIVE',
            ['View height: 1.68m standing eye-level', 'Full court verticality', 'Camera elevated'],
            '\u{1F9CD}'
          );
        }
        break;

      case 'gamePace':
        const mult = this.getGamePaceMultiplier();
        const desc = value === 'relaxed' 
          ? '0.7x Slow-motion flight & generous reaction windows' 
          : (value === 'fast' ? '1.25x High-speed intense challenge' : '1.0x Standard regulation tempo');
        this.showLiveToast(
          `GAME PACE: ${value.toUpperCase()}`,
          [`Physics speed: ${mult}x`, desc],
          '\u23F1'
        );
        break;

      case 'aimAssistance':
        const assistDesc = value === 'high' 
          ? 'Full glowing trajectory arc + magnetic target lock' 
          : (value === 'medium' ? 'Trajectory guide line' : 'Manual projectile ballistics');
        this.showLiveToast(
          `AIM ASSIST: ${value.toUpperCase()}`,
          [assistDesc],
          '\u{1F3AF}'
        );
        break;

      case 'oneHanded':
        this.showLiveToast(
          value ? 'ONE-HANDED CONTROLS' : 'TWO-HANDED / FULL CONTROLS',
          [value ? 'All actions mapped to 1 button or mouse tap' : 'Manual charge and dual trigger support'],
          '\u{1F446}'
        );
        break;

      case 'difficulty':
        this.showLiveToast(
          `DIFFICULTY: ${value.toUpperCase()}`,
          [value === 'beginner' ? '+60% Larger scoring hitboxes & wider timing' : 'Standard competitive regulation parameters'],
          '\u{1F39B}'
        );
        break;

      case 'highContrast':
        this.showLiveToast(
          value ? 'HIGH CONTRAST THEME ON' : 'STANDARD THEME',
          [value ? 'Ultra-bold yellow borders & pitch black canvas' : 'Deep navy stadium environment'],
          '\u{1F3A8}'
        );
        break;
    }
  }

  // Quick toggles for telemetry badges
  toggleSeated() {
    this.set('seatedMode', !this.settings.seatedMode);
  }

  cyclePace() {
    const paces = ['relaxed', 'standard', 'fast'];
    const nextIdx = (paces.indexOf(this.settings.gamePace) + 1) % paces.length;
    this.set('gamePace', paces[nextIdx]);
  }

  cycleAimAssist() {
    const assists = ['high', 'medium', 'off'];
    const nextIdx = (assists.indexOf(this.settings.aimAssistance) + 1) % assists.length;
    this.set('aimAssistance', assists[nextIdx]);
  }

  getGamePaceMultiplier() {
    switch (this.settings.gamePace) {
      case 'relaxed': return 0.70; // 30% slower: generous reaction time & relaxed physics
      case 'fast': return 1.25;    // 25% faster: intense match
      case 'standard':
      default: return 1.0;
    }
  }

  applySettingsToDOM() {
    const body = document.body;
    if (!body) return;

    // High Contrast class
    if (this.settings.highContrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }

    // Text Size classes
    body.classList.remove('text-large', 'text-xlarge');
    if (this.settings.textSize === 'large') {
      body.classList.add('text-large');
    } else if (this.settings.textSize === 'xlarge') {
      body.classList.add('text-xlarge');
    }

    // Update Live Telemetry Badges
    const isSeated = this.settings.seatedMode;
    const paceMult = this.getGamePaceMultiplier();

    const valHeightEls = document.querySelectorAll('.val-height');
    valHeightEls.forEach(el => {
      el.textContent = isSeated ? '1.25m (SEATED)' : '1.68m (STANDING)';
    });

    const valPaceEls = document.querySelectorAll('.val-pace');
    valPaceEls.forEach(el => {
      el.textContent = `${paceMult}x (${this.settings.gamePace.toUpperCase()})`;
    });

    const valAssistEls = document.querySelectorAll('.val-assist');
    valAssistEls.forEach(el => {
      el.textContent = this.settings.aimAssistance.toUpperCase();
    });

    const valInputEls = document.querySelectorAll('.val-input');
    valInputEls.forEach(el => {
      el.textContent = this.settings.oneHanded ? '1-HANDED' : 'STANDARD';
    });

    // Update Form Controls if present
    const selPace = document.getElementById('sel-game-pace');
    if (selPace) selPace.value = this.settings.gamePace;

    const chkSeated = document.getElementById('chk-seated-mode');
    if (chkSeated) chkSeated.checked = this.settings.seatedMode;

    const chkOneHand = document.getElementById('chk-one-handed');
    if (chkOneHand) chkOneHand.checked = this.settings.oneHanded;

    const selAssist = document.getElementById('sel-aim-assist');
    if (selAssist) selAssist.value = this.settings.aimAssistance;

    const selDiff = document.getElementById('sel-difficulty');
    if (selDiff) selDiff.value = this.settings.difficulty;

    const chkContrast = document.getElementById('chk-high-contrast');
    if (chkContrast) chkContrast.checked = this.settings.highContrast;
  }

  // Trigger gentle haptic vibration pulse on supported Gamepads or WebXR controllers
  triggerHaptic(duration = 100, strongMagnitude = 0.6, weakMagnitude = 0.4) {
    if (!this.settings.hapticFeedback) return;

    try {
      if (navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
          if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
            gp.vibrationActuator.playEffect('dual-rumble', {
              startDelay: 0,
              duration: duration,
              weakMagnitude: weakMagnitude,
              strongMagnitude: strongMagnitude
            }).catch(() => {});
          }
        }
      }
    } catch (e) {}
  }

  // Live Screen Reader & Speech announcements
  announce(text, speak = false) {
    const announcer = document.getElementById('a11y-announcer');
    if (announcer) {
      announcer.textContent = '';
      setTimeout(() => {
        announcer.textContent = text;
      }, 50);
    }

    if (speak || this.settings.speechFeedback) {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {}
    }
  }

  // Rest & Comfort Timer
  initRestReminder() {
    if (this.restTimer) {
      clearInterval(this.restTimer);
      this.restTimer = null;
    }

    const intervalMinutes = parseInt(this.settings.restReminderInterval, 10);
    if (intervalMinutes > 0) {
      this.restTimer = setInterval(() => {
        this.triggerRestPrompt();
      }, intervalMinutes * 60 * 1000);
    }
  }

  triggerRestPrompt() {
    this.announce("Rest reminder: You have been playing for a while. Take a moment to rest your eyes and stretch.", true);
    if (window.app && window.app.showRestModal) {
      window.app.showRestModal();
    }
  }

  // Aim assistance helpers
  getAimAssistanceMultiplier() {
    switch (this.settings.aimAssistance) {
      case 'off': return 0.0;
      case 'low': return 0.35;
      case 'medium': return 0.65;
      case 'high':
      default: return 0.95;
    }
  }

  // Difficulty parameters
  getDifficultyModifiers() {
    switch (this.settings.difficulty) {
      case 'advanced':
        return {
          targetSizeScale: 1.0,
          timingWindowMs: 400,
          pointsMultiplier: 1.5,
          magnetismRadius: 0.15
        };
      case 'intermediate':
        return {
          targetSizeScale: 1.25,
          timingWindowMs: 650,
          pointsMultiplier: 1.2,
          magnetismRadius: 0.35
        };
      case 'beginner':
      default:
        return {
          targetSizeScale: 1.6,
          timingWindowMs: 1000,
          pointsMultiplier: 1.0,
          magnetismRadius: 0.6
        };
    }
  }
}

// Global Accessibility singleton
window.a11y = new AccessibilityManager();
